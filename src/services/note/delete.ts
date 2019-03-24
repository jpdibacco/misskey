import { publishNoteStream } from '../stream';
import renderDelete from '../../remote/activitypub/renderer/delete';
import { renderActivity } from '../../remote/activitypub/renderer';
import { deliver } from '../../queue';
import renderTombstone from '../../remote/activitypub/renderer/tombstone';
import notesChart from '../chart/charts/notes';
import perUserNotesChart from '../chart/charts/per-user-notes';
import config from '../../config';
import { registerOrFetchInstanceDoc } from '../register-or-fetch-instance-doc';
import instanceChart from '../chart/charts/instance';
import { User } from '../../models/entities/user';
import { Note } from '../../models/entities/note';
import { Notes, Users, Followings, Instances } from '../../models';
import { Not } from 'typeorm';

/**
 * 投稿を削除します。
 * @param user 投稿者
 * @param note 投稿
 */
export default async function(user: User, note: Note, quiet = false) {
	const deletedAt = new Date();

	await Notes.delete({
		id: note.id,
		userId: user.id
	});

	if (note.renoteId) {
		Notes.decrement({ id: note.renoteId }, 'renoteCount', 1);
		Notes.decrement({ id: note.renoteId }, 'score', 1);
	}

	// ファイルが添付されていた場合ドライブのファイルの「このファイルが添付された投稿一覧」プロパティからこの投稿を削除
	if (note.fileIds) {
		for (const fileId of note.fileIds) {
			DriveFile.update({ _id: fileId }, {
				$pull: {
					'metadata.attachedNoteIds': note.id
				}
			});
		}
	}

	if (!quiet) {
		publishNoteStream(note.id, 'deleted', {
			deletedAt: deletedAt
		});

		//#region ローカルの投稿なら削除アクティビティを配送
		if (Users.isLocalUser(user)) {
			const content = renderActivity(renderDelete(renderTombstone(`${config.url}/notes/${note.id}`), user));

			const followings = await Followings.find({
				followeeId: user.id,
				followerHost: Not(null)
			});

			for (const following of followings) {
				deliver(user, content, following.followerInbox);
			}
		}
		//#endregion

		// 統計を更新
		notesChart.update(note, false);
		perUserNotesChart.update(user, note, false);

		if (Users.isRemoteUser(user)) {
			registerOrFetchInstanceDoc(user.host).then(i => {
				Instances.decrement(i.id, 'notesCount', 1);
				instanceChart.updateNote(i.host, false);
			});
		}
	}
}
