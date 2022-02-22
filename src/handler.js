import { dirname, fromFileUrl, join, readAll, readerFromStreamReader } from './deps.ts';
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
	let file = pathname.substring(1);

	try {
		file = decodeURIComponent(file);
	} catch (err) {
		// ignore
	}

	if (manifest.assets.has(file)) {
		return await ctx.send({ root: join(__dirname, 'static') });
	}
	file += '/index.html';
	if (manifest.assets.has(file)) {
		return await ctx.send({ path: file, root: join(__dirname, 'static') });
	}
	if (prerendered.has(pathname || '/')) {
		return await ctx.send({ path: file, root: join(__dirname, 'prerendered') });
	}

	// dynamically-generated pages
	const req = ctx.request.originalRequest;

	let body;
	try {
		body = await getRawBody(req);
	} catch (err) {
		console.error(err);
		ctx.response.status = err.status || 400;
		ctx.response.body = err.reason || 'Invalid request body';
		return await next();
	}

	const rendered = await server.respond({
		method: req.method,
		headers: headers_to_object(req.headers), // TODO: what about repeated headers, i.e. string[]
		url: req.url,
		rawBody: body
	});

	if (rendered) {
		ctx.response.status = rendered.status;
		ctx.response.headers = make_headers(rendered.headers);
		ctx.response.body = rendered.body;
	} else {
		ctx.response.status = 404;
		ctx.response.body = 'Not found';
	}
}

/**
 * Converts request headers from Headers to a plain key-value object, as used in node
 * @param {Headers} headers Browser/Deno Headers object
 * @returns {object} Plain key-value headers object
 */
const headers_to_object = (headers) => Object.fromEntries(headers.entries());

/** @param {Record<string, string | string[]>} headers */
function make_headers(headers) {
	const result = new Headers();
	for (const header in headers) {
		const value = headers[header];
		if (typeof value === 'string') {
			result.set(header, value);
			continue;
		}
		for (const sub of value) {
			result.append(header, sub);
		}
	}
	return result;
}

/**
 * @param {Request} req Deno server request object
 * @returns {Promise<null | Uint8Array>} Resolves with the request body raw buffer
 */
async function getRawBody(req) {
	const { body, headers } = req;
	// console.log({ body, headers });
	// take the first content-type header
	// TODO: is split(',') enough?
	const type = headers.get('content-type')?.split(/,;\s*/)?.[0];
	if (type === null || body === null) {
		return null;
	}

	const data = await readAll(readerFromStreamReader(req.body.getReader()));
	return data;
}
