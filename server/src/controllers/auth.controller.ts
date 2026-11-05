import type { Request, Response } from "express";
import * as userModel from "../models/user.model.js";
import { endSession, sessionUser, startSession } from "../middleware/auth.middleware.js";
import { MIN_PASSWORD_LENGTH, checkPassword, hashPassword } from "../passwords.js";

// Compared against when the username doesn't exist, so a wrong username takes
// as long as a wrong password and the response can't be used to find accounts.
const DUMMY_HASH = "$2b$12$m65KvEcULcOao0qiR9mKHe.Q/Sr7dnfn1OZYMGwmTr0JaqWfr5KaW";

export async function login(req: Request, res: Response) {
  const { username, password } = req.body ?? {};

  if (typeof username !== "string" || username.trim() === "" || typeof password !== "string" || password === "") {
    return res.status(400).json({ error: "Enter your username and password" });
  }

  const credentials = await userModel.findForLogin(username);
  const ok = await checkPassword(password, credentials?.passwordHash ?? DUMMY_HASH);

  if (!credentials || !ok) {
    return res.status(401).json({ error: "Wrong username or password" });
  }

  startSession(res, credentials);
  res.json({ user: await userModel.findSelf(credentials.id) });
}

export async function logout(req: Request, res: Response) {
  endSession(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const session = await sessionUser(req);
  const user = session && (await userModel.findSelf(session.id));

  if (!user) {
    endSession(res);
    return res.status(401).json({ error: "Not signed in" });
  }

  res.json({ user });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body ?? {};

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > 200) {
    return res.status(400).json({ error: `Use at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const credentials = await userModel.findCredentials(req.userId!);
  if (!credentials || !(await checkPassword(currentPassword, credentials.passwordHash))) {
    return res.status(400).json({ error: "Your current password is wrong" });
  }

  // Signs out everywhere else; this device gets a fresh cookie and stays in.
  const updated = await userModel.setPassword(credentials.id, await hashPassword(newPassword));
  startSession(res, updated);
  res.status(204).end();
}
