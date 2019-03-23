import $ from 'cafy';
import { StringID, NumericalID } from '../../../../misc/cafy-id';
import define from '../../define';
import User from '../../../../models/entities/user';

export const meta = {
	desc: {
		'ja-JP': '指定したユーザーの公式アカウントを解除します。',
		'en-US': 'Mark a user as unverified.'
	},

	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
		userId: {
			validator: $.type(StringID),
			desc: {
				'ja-JP': '対象のユーザーID',
				'en-US': 'The user ID which you want to unverify'
			}
		},
	}
};

export default define(meta, async (ps) => {
	const user = await Users.findOne(ps.userId);

	if (user == null) {
		throw new Error('user not found');
	}

	await Users.findOneAndUpdate({
		id: user.id
	}, {
		$set: {
			isVerified: false
		}
	});

	return;
});
