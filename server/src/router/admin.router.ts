import express from "express";
import * as admin from "../controllers/admin.controller.js";
import { requireAdmin, requireUser } from "../middleware/auth.middleware.js";

const adminRouter = express.Router();

adminRouter.use(requireUser, requireAdmin);

adminRouter.get("/", admin.overview);

adminRouter.post("/organizations", admin.createOrganization);
adminRouter.patch("/organizations/:id", admin.updateOrganization);
adminRouter.post("/organizations/:id/code", admin.regenerateCode);
adminRouter.delete("/organizations/:id", admin.deleteOrganization);
adminRouter.put("/organizations/:id/members/:userId", admin.addMember);
adminRouter.delete("/organizations/:id/members/:userId", admin.removeMember);

adminRouter.post("/users", admin.createUser);
adminRouter.patch("/users/:id", admin.updateUser);
adminRouter.post("/users/:id/password", admin.setPassword);
adminRouter.delete("/users/:id", admin.deleteUser);
adminRouter.get("/users/:id/games", admin.userWeek);
adminRouter.put("/users/:id/picks/:gameId", admin.setPick);
adminRouter.delete("/users/:id/picks/:gameId", admin.clearPick);

adminRouter.post("/sync", admin.syncWeek);
adminRouter.put("/games/:id/result", admin.setResult);

export default adminRouter;
