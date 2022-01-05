import { app, dirname, existsSync, fromFileUrl, join, serveStatic } from './deps.ts';
import { getRawBody, headers_to_object } from './http.js';

const __dirname = dirname(fromFileUrl(import.meta.url));

/**
 * @param {string} path
 * @param {number} max_age
 * @param {boolean} immutable
 */
function serve(path, max_age, immutable = false) {
	return existsSync(path)
		? serveStatic(path, {
				etag: true,
				maxAge: max_age,
				immutable
				// gzip: true,
				// brotli: true
		  })
		: // noop handler
		  (_req, _res, next) => next();
}

export function createServer(kitApp) {
	const server = app().use(
		// TODO: handle response compression
		// compression({ threshold: 0 }),
		serve(join(__dirname, '/client'), 31536000, true),
		serve(join(__dirname, '/static'), 0),
		serve(join(__dirname, '/prerendered'), 0),
		async (req, res) => {
			const url = new URL(req.url || '', 'http://localhost');

			let body;

			try {
				body = await getRawBody(req);
			} catch (err) {
				res.statusCode = err.status || 400;
				return res.end(err.reason || 'Invalid request body');
			}

			const rendered = await kitApp.render({
				method: req.method,
				headers: headers_to_object(req.headers), // TODO: what about repeated headers, i.e. string[]
				url,
				rawBody: body
			});

			if (rendered) {
				res.setStatus(rendered.status);
				res.set(rendered.headers);
				res.send(rendered.body);
			} else {
				res.setStatus(404);
				res.send('Not found');
			}
		}
	);

	return server;
}
