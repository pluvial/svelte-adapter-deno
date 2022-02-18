import handler from './handler.js';

const port = Deno.env.get('PORT') ?? 3000;
const hostname = Deno.env.get('HOST') ?? 'localhost';

const server = Deno.listen({ port, hostname });
console.log(`server is running at ${hostname}:${port}`);

for await (const conn of server) {
	for await (const { request, respondWith } of Deno.serveHttp(conn)) {
		respondWith(handler(request, {
			// example
			db: {
				get() { console.log("Get All")},
				insert(data) { console.log('insert',  data)},
				update(filter, data) { console.log("update",  filter, data)},
				delete(filter) { console.log("Delete: ", filter)}
			}
		}));
	}
}
