import express from "express";
import { picks, show, standings } from "../controllers/organization.controller.js";
import { requireUser } from "../middleware/auth.middleware.js";

const organizationRouter = express.Router();

organizationRouter.use(requireUser);
organizationRouter.get("/:id", show);
organizationRouter.get("/:id/standings", standings);
organizationRouter.get("/:id/picks", picks);

export default organizationRouter;
