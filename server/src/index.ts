import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./router/auth.router.js";
import scheduleRouter from "./router/schedule.router.js";
import organizationRouter from "./router/organization.router.js";
import adminRouter from "./router/admin.router.js";
import { errorHandler, notFound } from "./middleware/middleware.js";

const app = express();
const PORT = process.env.PORT ?? 3010;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) throw new Error("SESSION_SECRET is not set");

app.use(express.json());
app.use(cookieParser(SESSION_SECRET));

// Everything lives under /api so that a single Vercel Serverless Function
// (api/index.ts) can own the whole backend while the client is static.
// Client and API share one origin in every environment, so there's no CORS.
const api = express.Router();

api.use("/auth", authRouter);
api.use("/organizations", organizationRouter);
api.use("/admin", adminRouter);
api.use("/", scheduleRouter);

app.use("/api", api);

app.use(notFound);
app.use(errorHandler);

// On Vercel the app is invoked as a serverless handler, so there is no port to
// listen on. Only start a real HTTP server for local dev.
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export default app;
