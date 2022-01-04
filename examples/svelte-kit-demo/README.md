# svelte-kit-demo

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

```sh
npm run build
```

> You can preview the built app with `npm run preview`, regardless of whether you installed an adapter. This should _not_ be used to serve your app in production.

## Starting

```sh
deno run --allow-env --allow-read --allow-net -c node_modules/svelte-adapter-deno/tsconfig.deno.json build/index.js
```

It fails the first time it runs, but should work correctly afterwards.
