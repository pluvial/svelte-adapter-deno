import { handler } from './handler.js';

export const path = Deno.env.get(PATH_ENV) ?? false;
export const host = Deno.env.get(HOST_ENV) ?? '0.0.0.0';
export const port = Deno.env.get(PORT_ENV) ?? (!path && 3000);

const server = Deno.listen({path, host, port: parseInt(port)})

for await (let conn of server) {
	for await (let {request, respondWith} of Deno.serveHttp(conn)) {
		respondWith(handler(request))
	}
}

export { server };
