// Vercel Serverless Function entry point.
//
// vercel.json rewrites every /api/* request here, and Vercel preserves the
// original request URL through a rewrite, so Express still sees /api/auth/login
// and matches the routers mounted in server/src/index.ts.
//
// Locally this file is unused: `npm run dev:server` boots the same app with
// app.listen(), and Vite proxies /api to it (see client/vite.config.ts).

import app from "../server/src/index.js";

export default app;
