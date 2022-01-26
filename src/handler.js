// @ts-ignore
import { dirname, fromFileUrl, join, serveFile } from './deps.ts';
// import { contentType } from './content-types.js';

import { App } from 'APP';
import { manifest, prerendered } from 'MANIFEST';

const app = new App(manifest);

const __dirname = dirname(fromFileUrl(import.meta.url));

const prefix = `/${manifest.appDir}/`;

/**
 * 
 * @param {Request} request original request object
 * @returns {Promise<Response>}
 */
export async function handler(request) {
	// generated assets
	const url = new URL(request.url)

	if (url.pathname.startsWith(prefix)) {
		const response = await serveFile(request, join(__dirname, 'client', url.pathname))
		
		response.headers.set('cache-control', 'public, immutable, max-age=31536000')
		return response
	}

	// prerendered pages and index.html files
	const pathname = url.pathname.replace(/\/$/, '');
	let file = pathname.substring(1);

	try {
		file = decodeURIComponent(file);
	} catch (err) {
		// ignore
	}

	if (manifest.assets.has(file)) {
		return await serveFile(request, join(__dirname, 'static', file);
	}
	file += '/index.html';
	if (manifest.assets.has(file)) {
		return await serveFile(request, join(__dirname, 'static', file));
	}
	if (prerendered.has(pathname || '/')) {
		return await serveFile(request, join(__dirname, 'prerendered', file));
	}

	const rendered = await app.render(request);

	if (rendered) {
		return rendered
	} else {
		return new Response("Not Found", {status: 404})
	}
}

