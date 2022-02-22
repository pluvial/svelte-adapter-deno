import { dirname, fromFileUrl, serveFile, join} from './deps.ts';

// to prevent an error
window.navigator.userAgent = []


import { Server } from 'SERVER';
import { manifest, prerendered } from 'MANIFEST';
import { contentType } from './content-types';

const server = new Server(manifest);

const prefix = `/${manifest.appDir}/`;

/**
 * 
 * @param {Request} request original request object
 * @returns {Promise<Response>}
 */
export default async function handler(request, platform = {}) {
	// generated assets
	const url = new URL(request.url)
	if (url.pathname.startsWith(prefix)) {
		const response = await serveFile(request, join('FILES_PREFIX', 'client', url.pathname))
		response.headers.append('cache-control', 'public, immutable, max-age=31536000')
		return response;
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
		return await serveFile(request, join('FILES_PREFIX', 'static', file));
	}
	file += '/index.html';
	if (manifest.assets.has(file)) {
		return await serveFile(request, join('FILES_PREFIX', 'static', file));
	}
	if (prerendered.has(pathname || '/')) {
		return await serveFile(request, join('FILES_PREFIX', 'prerendered', file));
	}

	const rendered = await server.respond(request, { platform } );

	if (rendered) {
		return rendered
	} else {
		return new Response('Not found', {status: 404})
	}
}
