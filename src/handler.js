import { dirname, fromFileUrl, join} from './deps.ts';

// to prevent an error
window.navigator.userAgent = []


import { App } from 'APP';
import { manifest, prerendered } from 'MANIFEST';
import { contentType } from './content-types';

const app = new App(manifest);

const prefix = `/${manifest.appDir}/`;

/**
 * 
 * @param {Request} request original request object
 * @param {string} path folder which contains file
 * @param {string} file it can be nested in sub folders too
 * @returns {Promise<Response>}
 */
 async function sendFile(path, file) {
	const filename = join('FILES_PREFIX', path, file);

	const data = await Deno.readFile(filename);
	return new Response(data, {
	  status: 200,
	  headers: {
		"Content-Type": contentType(filename),
	  },
	});
  }
/**
 * 
 * @param {Request} request original request object
 * @returns {Promise<Response>}
 */
export default async function handler(request) {
	// generated assets
	const url = new URL(request.url)
	if (url.pathname.startsWith(prefix)) {
		const response = await sendFile('client', url.pathname)
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
		return await sendFile('static', file);
	}
	file += '/index.html';
	if (manifest.assets.has(file)) {
		return await sendFile('static', file);
	}
	if (prerendered.has(pathname || '/')) {
		return await sendFile('prerendered', file);
	}

	const rendered = await app.render(request);

	if (rendered) {
		return rendered
	} else {
		return new Response('Not found', {status: 404})
	}
}
