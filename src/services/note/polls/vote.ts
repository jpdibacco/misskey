import watch from '../../../services/note/watch';
import { publishNoteStream } from '../../stream';
import notify from '../../../services/create-notification';
import { User } from '../../../models/entities/user';
import { Note } from '../../../models/entities/note';
import { PollVotes } from '../../../models';

export default (user: User, note: Note, choice: number) => new Promise(async (res, rej) => {
	if (!note.poll.choices.some(x => x.id == choice)) return rej('invalid choice param');

	// if already voted
	const exist = await PollVotes.find({
		noteId: note.id,
		userId: user.id
	});

	if (note.poll.multiple) {
		if (exist.some(x => x.choice === choice))
			return rej('already voted');
	} else if (exist.length) {
		return rej('already voted');
	}

	// Create vote
	await PollVotes.save({
		createdAt: new Date(),
		noteId: note.id,
		userId: user.id,
		choice: choice
	});

	res();

	const inc: any = {};
	inc[`poll.choices.${note.poll.choices.findIndex(c => c.id == choice)}.votes`] = 1;

	// Increment votes count
	await Note.update({ _id: note.id }, {
		$inc: inc
	});

	publishNoteStream(note.id, 'pollVoted', {
		choice: choice,
		userId: user.id
	});

	// Notify
	notify(note.userId, user.id, 'pollVote', {
		noteId: note.id,
		choice: choice
	});

	// Fetch watchers
	Watching
		.find({
			noteId: note.id,
			userId: { $ne: user.id },
		}, {
			fields: {
				userId: true
			}
		})
		.then(watchers => {
			for (const watcher of watchers) {
				notify(watcher.userId, user.id, 'pollVote', {
					noteId: note.id,
					choice: choice
				});
			}
		});

	// ローカルユーザーが投票した場合この投稿をWatchする
	if (isLocalUser(user) && user.autoWatch !== false) {
		watch(user.id, note);
	}
});
