import { dirname, exists, fromFileUrl, join } from './deps.ts';

import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';
import { env, processEnv } from 'ENV';

const server = new Server(manifest);
const [edgeCache] = await Promise.all([
	caches.open('deno-deploy-edge'),
	server.init({ env: processEnv })
]);

// TODO: check if any of these are needed
// const origin = env('ORIGIN', undefined);
const xff_depth = parseInt(env('XFF_DEPTH', '1'));
const address_header = env('ADDRESS_HEADER', '').toLowerCase();
// const protocol_header = env('PROTOCOL_HEADER', '').toLowerCase();
// const host_header = env('HOST_HEADER', 'host').toLowerCase();
// const body_size_limit = parseInt(env('BODY_SIZE_LIMIT', '524288'));

const dir = dirname(fromFileUrl(import.meta.url));

async function serveDirectory(path, client = false) {
	// need to use async exists due to existsSync not working on Deno Deploy
	if (!(await exists(path))) {
		return false;
	}
	return async (ctx, next) => {
		try {
			if (client && ctx.request.url.pathname.startsWith(`/${manifest.appDir}/immutable/`)) {
				ctx.response.headers.set('cache-control', 'public,max-age=31536000,immutable');
			}

			await ctx.send({root: path, extensions: ['.html'], index: 'index.html'});
		} catch {
			await next();
		}
	};
}

async function ssr(ctx) {
	const request = ctx.request.originalRequest.request;
	const response = await server.respond(request, {
		getClientAddress() {
			// TODO: revisit if it doesn't work with proxy
			if (address_header) {
				const value = /** @type {string} */ (req.headers[address_header]) || '';

				if (address_header === 'x-forwarded-for') {
					const addresses = value.split(',');

					if (xff_depth < 1) {
						throw new Error(`${ENV_PREFIX + 'XFF_DEPTH'} must be a positive integer`);
					}

					if (xff_depth > addresses.length) {
						throw new Error(
							`${ENV_PREFIX + 'XFF_DEPTH'} is ${xff_depth}, but only found ${
								addresses.length
							} addresses`
						);
					}
					return addresses[addresses.length - xff_depth].trim();
				}

				return value;
			}

			return ctx.request.ip;
		}
	});

	ctx.response.with(response);
}

// See: https://docs.deno.com/deploy/manual/edge-cache/
async function cache(ctx, next) {
	const cachedResponse = await edgeCache.match(ctx.request.source);

	if (cachedResponse) {
		cachedResponse.headers.set('x-deno-deploy-edge-cache', 'true');
		ctx.response.with(cachedResponse);
		return
	}

	await next();

	// If a response returns any cache header then we cache it in the Deno Deploy edge cache.
	// We don't need to read the contents of the Cache-Control or Expires header since the
	// cache storage will handle that for us: https://developer.mozilla.org/en-US/docs/Web/API/Cache
	const responseHasCacheHeaders = ctx.response.headers.has('cache-control') || ctx.response.headers.has('expires');
	if (responseHasCacheHeaders
		&& ctx.response.status >= 200
		&& ctx.response.status < 300) {
		const response = new Response(
			ctx.response.body,
			{
				status: ctx.response.status,
				headers: ctx.response.headers,
			}
		);

		// Important! Clone since we can't read same stream twice.
		edgeCache.put(ctx.request.source, response.clone());
	}
}

const handlers = [
	cache,
	...(await Promise.all([
		serveDirectory(join(dir, 'client'), true),
		serveDirectory(join(dir, 'static')),
		serveDirectory(join(dir, 'prerendered'))
	])),
	ssr
].filter(Boolean);

export { handlers };
