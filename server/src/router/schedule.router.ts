import express from "express";
import { clearPick, myWeek, savePick, weeks } from "../controllers/schedule.controller.js";
import { requireUser } from "../middleware/auth.middleware.js";

// Mounted at the API root, so the guard goes on each route rather than on the
// router: a router-wide guard would answer 401 for every unknown path too.
const scheduleRouter = express.Router();

scheduleRouter.get("/weeks", requireUser, weeks);
scheduleRouter.get("/games", requireUser, myWeek);
scheduleRouter.put("/picks/:gameId", requireUser, savePick);
scheduleRouter.delete("/picks/:gameId", requireUser, clearPick);

export default scheduleRouter;
