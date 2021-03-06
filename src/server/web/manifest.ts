import * as Koa from 'koa';
import * as manifest from '../../client/assets/manifest.json';
import fetchMeta from '../../misc/fetch-meta';

module.exports = async (ctx: Koa.BaseContext) => {
	const json = JSON.parse(JSON.stringify(manifest));

	const instance = await fetchMeta();

	json.short_name = instance.name || 'Misskey';
	json.name = instance.name || 'Misskey';

	ctx.set('Cache-Control', 'max-age=300');
	ctx.body = json;
};
