---
title: "Developer Guides"
description: "Integrating handlers, groups, authorization, metrics and host servers."
order: 0
draft: false
---

# Integration Guides

For a working host application, begin with [basic usage](basic-usage.md), then [advanced usage](advanced-usage.md) and [integration](integration.md).

The package exposes a transport core; sample `status` and `command` messages are registered only by the repository's `app.js`, **not** automatically by the npm library. All subscription access is denied unless the host supplies an authorizer. No Redis, broker, persistence, TLS server, reverse proxy, session store or browser authentication SDK is bundled.
