import renderUpdate from '../../remote/activitypub/renderer/update';
import { renderActivity } from '../../remote/activitypub/renderer';
import { deliver } from '../../queue';
import { Followings, Users } from '../../models';
import { User } from '../../models/entities/user';

export async function publishToFollowers(userId: User['id']) {
	const user = await Users.findOne({
		id: userId
	});

	const followers = await Followings.find({
		followeeId: user.id
	});

	const queue: string[] = [];

	// フォロワーがリモートユーザーかつ投稿者がローカルユーザーならUpdateを配信
	if (Users.isLocalUser(user)) {
		for (const following of followers) {
			const follower = following._follower;

			if (Users.isRemoteUser(follower)) {
				const inbox = follower.sharedInbox || follower.inbox;
				if (!queue.includes(inbox)) queue.push(inbox);
			}
		}

		if (queue.length > 0) {
			const content = renderActivity(renderUpdate(await renderPerson(user), user));
			for (const inbox of queue) {
				deliver(user, content, inbox);
			}
		}
	}
}
