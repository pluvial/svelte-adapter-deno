import { dirname, fromFileUrl, join } from './deps.ts';
import { contentType } from './content-types.js';

import { Server } from 'SERVER';
import { manifest, prerendered } from 'MANIFEST';

const server = new Server(manifest);

const __dirname = dirname(fromFileUrl(import.meta.url));

const prefix = `/${manifest.appDir}/`;

export async function handler(ctx, next) {
	// generated assets
	if (ctx.request.url.pathname.startsWith(prefix)) {
		return await ctx.send({
			root: join(__dirname, 'client'),
			headers: {
				'cache-control': 'public, immutable, max-age=31536000',
				// 'content-type': res.headers.get('content-type')
				'content-type': contentType(ctx.request.url.pathname)
			}
		});
	}

	// prerendered pages and index.html files
	const pathname = ctx.request.url.pathname.replace(/\/$/, '');
	let file = pathname.substring(1) || 'index';

	try {
		file = decodeURIComponent(file);
	} catch (err) {
		// ignore
	}

	if (manifest.assets.has(file)) {
		return await ctx.send({ root: join(__dirname, 'static') });
	}
	const file_index_html = file + '/index.html';
	if (manifest.assets.has(file_index_html)) {
		return await ctx.send({ path: file_index_html, root: join(__dirname, 'static') });
	}
	const file_html = file + '.html';
	if (prerendered.has(pathname || '/')) {
		return await ctx.send({ path: file_html, root: join(__dirname, 'prerendered') });
	}

	// dynamically-generated pages
	const request = ctx.request.originalRequest.request;
	try {
		const response = await server.respond(request);
		ctx.response.status = response.status;
		ctx.response.headers = response.headers;
		ctx.response.body = response.body;
	} catch (err) {
		console.error(err);
		ctx.response.status = 404;
		ctx.response.body = 'Not found';
	}
}
