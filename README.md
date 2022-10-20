# svelte-adapter-deno

[Adapter](https://kit.svelte.dev/docs/adapters) for SvelteKit apps that generates a standalone Deno server.

## Usage

Install with `npm i -D svelte-adapter-deno`, then add the adapter to your `svelte.config.js`:

```js
// svelte.config.js
import adapter from 'svelte-adapter-deno';

export default {
  kit: {
    adapter: adapter({
      // default options are shown
      out: 'build',
      deps: './deps.ts' // (relative to adapter-deno package)
    })
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

Additionally, `--no-check` can be used if deno complains while typechecking upstream dependencies.

<details>
	<summary>Related Deno issues</summary>

- [Skip type checking for modules outside of user's control #9704](https://github.com/denoland/deno/issues/9704)
- [Make TypeScript diagnostics non-fatal #9737](https://github.com/denoland/deno/issues/9737)
- [Skip type checking by default #11340](https://github.com/denoland/deno/issues/11340)
</details>

## Options

### out

The directory to build the server to. It defaults to `build` — i.e. `deno run --allow-env --allow-read --allow-net build/index.js` would start the server locally after it has been created.

### precompress

Enables precompressing using gzip and brotli for assets and prerendered pages. It defaults to `false`.

### deps

The file re-exporting external runtime dependencies (`deps.ts` by convention in Deno). It defaults to the `deps.ts` included in the package.

## Environment variables

By default, the server will accept connections on `0.0.0.0` using port 3000. These can be customised with the `PORT` and `HOST` environment variables:

```
HOST=127.0.0.1 PORT=4000 deno run --allow-env --allow-read --allow-net build/server.js
```

You can specify different environment variables if necessary using the `env` option.

## License

[MIT](LICENSE)
