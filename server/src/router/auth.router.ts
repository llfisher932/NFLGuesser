import express from "express";
import { changePassword, login, logout, me } from "../controllers/auth.controller.js";
import { requireUser } from "../middleware/auth.middleware.js";

const authRouter = express.Router();

authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/me", me);
authRouter.post("/password", requireUser, changePassword);

export default authRouter;
