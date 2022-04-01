import { dirname, existsSync, fromFileUrl, join } from './deps.ts';

import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';

const server = new Server(manifest);

const __dirname = dirname(fromFileUrl(import.meta.url));

function serveDirectory(path, max_age, immutable = false) {
	if (!existsSync(path)) {
		return false;
	}
	const cacheControl = `public, ${immutable ? 'immutable' : ''} max-age: ${max_age}`;
	return (ctx) => {
		ctx.response.headers.set('cache-control', cacheControl);
		return ctx.send({ root: path, extensions: ['.html'], index: 'index.html' });
	};
}

async function ssr(ctx) {
	const request = ctx.request.originalRequest.request;
	const response = await server.respond(request);
	ctx.response.status = response.status;
	ctx.response.headers = response.headers;
	ctx.response.body = response.body;
}

const handlers = [
	serveDirectory(join(__dirname, 'client'), 31536000, true),
	serveDirectory(join(__dirname, 'static'), 0),
	serveDirectory(join(__dirname, 'prerendered'), 0),
	ssr
].filter(Boolean);

export async function handler(ctx) {
	for (const handle of handlers) {
		try {
			return await handle(ctx);
		} catch (error) {
			// fall-through to next handler
		}
	}
	ctx.response.status = 404;
	ctx.response.body = 'Not found';
}
