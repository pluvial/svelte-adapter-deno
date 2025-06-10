import { dirname, exists, fromFileUrl, join } from './deps.ts';

import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';
import { env, processEnv } from 'ENV';

const server = new Server(manifest);
const [edgeCache] = await Promise.all([
	caches.open('deno-deploy-edge'),
	server.init({ env: processEnv }),
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

const handlers = [
	...(await Promise.all([
		serveDirectory(join(dir, 'client'), true),
		serveDirectory(join(dir, 'static')),
		serveDirectory(join(dir, 'prerendered'))
	])),
	ssr
].filter(Boolean);

export { handlers };
