import handler from './handler.js';

let path = Deno.env.get(PATH_ENV) ?? false;
let host = Deno.env.get(HOST_ENV) ?? '0.0.0.0';
let port = Deno.env.get(PORT_ENV) ?? (!path && 3000);

if (path) {
	host = path.split(':')[0];
	port = Number(path.split(':')[1]);
}
const server = Deno.listen({ port: port, hostname: host });

for await (const conn of server) {
	for await (const { request, respondWith } of Deno.serveHttp(conn)) {
		respondWith(handler(request));
	}
}
