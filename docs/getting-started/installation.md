---
title: "Installation and Requirements"
description: "Node.js, npm packaging, source checkout and supported installation."
order: 1
draft: false
---

# Installation and Runtime Requirements

## From npmjs

```sh
npm install configurable-websocket-engine@1.0.0
```

The package entry is CommonJS:

```js
const { createEngine } = require("configurable-websocket-engine");
console.log(typeof createEngine); // "function"
```

Use Node.js **20 or later**, as declared in `package.json`. GitHub Actions ran its test matrix on Node 20, 22, 24 and 26; this is not a promise about every future Node build, OS or CPU architecture. The declared dependency is `ws: ^8.18.3` (repository lockfile resolves 8.22.0). The consumer does **not** need Python or a database.

The npm package contains 11 files: LICENSE, README, package metadata, five `engine/*.js` modules and the three existing configuration/API/protocol documents. Those internal engine files exist in the tarball but **are not supported `exports` subpaths**. Do not import `configurable-websocket-engine/engine/config` or `.../package.json`.

## Source checkout (contributors)

```sh
git clone https://github.com/vibtoolshq/SocketCore.git
cd SocketCore
npm ci
npm test
npm run verify:package
```

`npm start` runs the HTTP-only example `app.js`, **not** an automatically configured production WSS service. It requires `AUTH_TOKENS` set in the process environment; see [standalone configuration](../CONFIGURATION.md). The library itself reads **no** environment variables.

For the tutorial's Node-side test client, install `ws` explicitly in your **example application**, because `ws` is the client library used in the tutorial:

```sh
npm install ws
```

To remove the library from a consumer project: `npm uninstall configurable-websocket-engine`. For package upgrades, choose an actual released version and run your integration tests first. Browser-native `WebSocket` cannot set the sample app's custom `x-auth-token` header.
