# svelte-adapter-deno

[Adapter](https://kit.svelte.dev/docs/adapters) for SvelteKit apps that generates a standalone Deno server.

## Usage

Install with `npm i -D svelte-adapter-deno`, then add the adapter to your `svelte.config.js`:

```js
// svelte.config.js
import adapter from 'svelte-adapter-deno';

export default {
  kit: {
    adapter: adapter()
  }
};
```

After building the server (`npm run build`), use the following command to start:

```sh
# with the default build directory
deno run --allow-env --allow-read --allow-net build/index.js

# with a custom build directory
deno run --allow-env --allow-read --allow-net path/to/build/index.js
```

You can use the [deployctl](https://github.com/denoland/deployctl/blob/main/action/README.md) GitHub Action to automatically deploy your app in Deno Deploy:

.github/workflows/ci.yml

```yml
name: ci

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy:
    name: deploy
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - name: Clone repository
        uses: actions/checkout@v2

      - name: Install Node
        uses: actions/setup-node@v2
        with:
          node-version: 16

      - name: Cache pnpm modules
        uses: actions/cache@v2
        with:
          path: ~/.pnpm-store
          key: ${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-

      - name: Install pnpm and node_modules
        uses: pnpm/action-setup@v2
        with:
          version: latest
          run_install: true

      - name: Build site
        run: pnpm build
        working-directory: '<root>' # if necessary, should contain {out}

      - name: Deploy to Deno Deploy
        uses: denoland/deployctl@v1
        with:
          project: <YOUR PROJECT NAME>
          entrypoint: '{out}/index.js' # same as `out` option in config
          root: '<root>' # if necessary
```

The server needs at least the following permissions to run:

- `allow-env` - allow environment access, to support runtime configuration via runtime variables (can be further restricted to include just the necessary variables)
- `allow-read` - allow file system read access (can be further restricted to include just the necessary directories)
- `allow-net` - allow network access (can be further restricted to include just the necessary domains)

In the documentation `deno run -A` is used for simplicity rather than as a recommendation, use only the necessary permissions in general use.

## Environment variables

### `PORT` and `HOST`

By default, the server will accept connections on `0.0.0.0` using port 3000. These can be customised with the `PORT` and `HOST` environment variables:

```
HOST=127.0.0.1 PORT=4000 deno run --allow-env --allow-read --allow-net build/server.js
```

### `ADDRESS_HEADER` and `XFF_DEPTH`

The [RequestEvent](types#public-types-requestevent) object passed to hooks and endpoints includes an `event.getClientAddress()` function that returns the client's IP address. By default this is the connecting `remoteAddress`. If your server is behind one or more proxies (such as a load balancer), this value will contain the innermost proxy's IP address rather than the client's, so we need to specify an `ADDRESS_HEADER` to read the address from:

```
ADDRESS_HEADER=True-Client-IP node build
```

> Headers can easily be spoofed. As with `PROTOCOL_HEADER` and `HOST_HEADER`, you should [know what you're doing](https://adam-p.ca/blog/2022/03/x-forwarded-for/) before setting these.

If the `ADDRESS_HEADER` is `X-Forwarded-For`, the header value will contain a comma-separated list of IP addresses. The `XFF_DEPTH` environment variable should specify how many trusted proxies sit in front of your server. E.g. if there are three trusted proxies, proxy 3 will forward the addresses of the original connection and the first two proxies:

```
<client address>, <proxy 1 address>, <proxy 2 address>
```

Some guides will tell you to read the left-most address, but this leaves you [vulnerable to spoofing](https://adam-p.ca/blog/2022/03/x-forwarded-for/):

```
<spoofed address>, <client address>, <proxy 1 address>, <proxy 2 address>
```

We instead read from the _right_, accounting for the number of trusted proxies. In this case, we would use `XFF_DEPTH=3`.

> If you need to read the left-most address instead (and don't care about spoofing) — for example, to offer a geolocation service, where it's more important for the IP address to be _real_ than _trusted_, you can do so by inspecting the `x-forwarded-for` header within your app.

## Options

The adapter can be configured with various options:

```js
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({
      // default options are shown
      out: 'build',
      precompress: false,
      envPrefix: '',
      deps: './deps.ts' // (relative to adapter-deno package)
    })
  }
};
```

### out

The directory to build the server to. It defaults to `build` — i.e. `deno run -A build/index.js` would start the server locally after it has been created.

### precompress

Enables precompressing using gzip and brotli for assets and prerendered pages. It defaults to `false`.

### envPrefix

If you need to change the name of the environment variables used to configure the deployment (for example, to deconflict with environment variables you don't control), you can specify a prefix:

```js
envPrefix: 'MY_CUSTOM_';
```

```
MY_CUSTOM_HOST=127.0.0.1 \
MY_CUSTOM_PORT=4000 \
MY_CUSTOM_ORIGIN=https://my.site \
deno run -A build/index.js
```

### deps

The file re-exporting external runtime dependencies (`deps.ts` by convention in Deno). It defaults to the `deps.ts` file included in the package.

## Custom server

The adapter creates two files in your build directory — `index.js` and `handler.js`. Running `index.js` — e.g. `deno run -A build/index.js`, if you use the default build directory — will start a server on the configured port.

Alternatively, you can import the `handler.js` file, which exports a handler suitable for use with [Oak](https://github.com/oakserver/oak) and set up your own server:

```js
/// file: my-server.js
import { Application, Router } from 'https://deno.land/x/oak@v11.1.0/mod.ts';
import { handler } from './build/handler.js';

const app = new Application();

// add a route that lives separately from the SvelteKit app
const router = new Router();
router.get('/healthcheck', (ctx) => {
  ctx.response.body = 'ok';
});
app.use(router.routes());
app.use(router.allowedMethods());

// let SvelteKit handle everything else, including serving prerendered pages and static assets
app.use(handler);

app.addEventListener('listen', () => {
  console.log('listening on port 3000');
});
await app.listen({ port: 3000 });
```

## License

[MIT](LICENSE)
