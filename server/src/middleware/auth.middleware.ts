import type { Request, Response, NextFunction } from "express";
import * as userModel from "../models/user.model.js";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      isAdmin?: boolean;
    }
  }
}

export const SESSION_COOKIE = "sid";
const SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

/**
 * The session is a signed cookie holding "<user id>.<session version>", so
 * there's no session table to keep warm in serverless. The version is checked
 * against the database on every request, which is what lets a password change
 * sign out every other device.
 */
export function startSession(res: Response, user: { id: number; sessionVersion: number }) {
  res.cookie(SESSION_COOKIE, `${user.id}.${user.sessionVersion}`, {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
  });
}

export function endSession(res: Response) {
  res.clearCookie(SESSION_COOKIE);
}

/** The signed-in user's id, or null if the cookie is missing, forged or stale. */
export async function sessionUser(req: Request) {
  const raw = req.signedCookies?.[SESSION_COOKIE];
  if (typeof raw !== "string") return null;

  const [id, version] = raw.split(".").map(Number);
  if (!Number.isInteger(id) || !Number.isInteger(version)) return null;

  const user = await userModel.findSession(id!);
  return user && user.sessionVersion === version ? user : null;
}

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = await sessionUser(req);

  if (!user) {
    endSession(res);
    return res.status(401).json({ error: "Not signed in" });
  }

  req.userId = user.id;
  req.isAdmin = user.isAdmin;
  next();
}

/** Mount after requireUser. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAdmin) return res.status(403).json({ error: "Admins only" });
  next();
}
