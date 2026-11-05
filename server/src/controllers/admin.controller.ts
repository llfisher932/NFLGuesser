import type { Request, Response } from "express";
import * as organizationModel from "../models/organization.model.js";
import * as predictionModel from "../models/prediction.model.js";
import * as scheduleModel from "../models/schedule.model.js";
import * as userModel from "../models/user.model.js";
import { MIN_PASSWORD_LENGTH, generatePassword, hashPassword } from "../passwords.js";
import { parseId, parseIdList, parseName, parseScore, parseUsername, parseWeekQuery } from "./params.js";
import { presentGame, presentPick, resolveWeek, weekKeyOf } from "./present.js";

/**
 * The admin can do anything: create and edit orgs and accounts, set anyone's
 * password, edit anyone's picks (locked or not), and override results. The one
 * thing it refuses is the admin locking themselves out: you can't delete your
 * own account or take away your own admin.
 *
 * Every mutation answers with the whole panel, so the dashboard just re-renders.
 */

const NAME_MAX = 40;

async function panel() {
  const [users, organizations] = await Promise.all([userModel.listAll(), organizationModel.listAll()]);
  return { users, organizations };
}

export async function overview(req: Request, res: Response) {
  res.json(await panel());
}

// ---- Organizations ----

export async function createOrganization(req: Request, res: Response) {
  const name = parseName(req.body?.name, NAME_MAX);
  if (!name) return res.status(400).json({ error: `Name must be 1 to ${NAME_MAX} characters` });

  const { id } = await organizationModel.create(name);
  res.status(201).json({ ...(await panel()), organizationId: id });
}

export async function updateOrganization(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const name = parseName(req.body?.name, NAME_MAX);
  if (id === null || !(await organizationModel.exists(id))) return res.status(404).json({ error: "No such organization" });
  if (!name) return res.status(400).json({ error: `Name must be 1 to ${NAME_MAX} characters` });

  await organizationModel.rename(id, name);
  res.json(await panel());
}

export async function regenerateCode(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (id === null || !(await organizationModel.exists(id))) return res.status(404).json({ error: "No such organization" });

  await organizationModel.regenerateCode(id);
  res.json(await panel());
}

export async function deleteOrganization(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (id === null || !(await organizationModel.exists(id))) return res.status(404).json({ error: "No such organization" });

  await organizationModel.remove(id);
  res.json(await panel());
}

export async function addMember(req: Request, res: Response) {
  const organizationId = parseId(req.params.id);
  const userId = parseId(req.params.userId);
  if (organizationId === null || !(await organizationModel.exists(organizationId))) {
    return res.status(404).json({ error: "No such organization" });
  }
  if (userId === null || !(await userModel.exists(userId))) return res.status(404).json({ error: "No such user" });

  await organizationModel.addMember(organizationId, userId);
  res.json(await panel());
}

export async function removeMember(req: Request, res: Response) {
  const organizationId = parseId(req.params.id);
  const userId = parseId(req.params.userId);
  if (organizationId === null || userId === null) return res.status(404).json({ error: "No such membership" });

  await organizationModel.removeMember(organizationId, userId);
  res.json(await panel());
}

// ---- Users ----

async function checkOrganizations(raw: unknown, res: Response): Promise<number[] | null> {
  const ids = parseIdList(raw);
  if (ids === null) {
    res.status(400).json({ error: "organizationIds must be a list of ids" });
    return null;
  }
  if ((await organizationModel.existingIds(ids)).length !== ids.length) {
    res.status(400).json({ error: "One of those organizations doesn't exist" });
    return null;
  }
  return ids;
}

/** The password comes back exactly once. Only its hash is stored. */
export async function createUser(req: Request, res: Response) {
  const username = parseUsername(req.body?.username);
  const displayName = parseName(req.body?.displayName, NAME_MAX);
  const isAdmin = req.body?.isAdmin === true;

  if (!username) {
    return res.status(400).json({ error: "Usernames are 3 to 24 letters, digits, dots, dashes or underscores" });
  }
  if (!displayName) return res.status(400).json({ error: `Display name must be 1 to ${NAME_MAX} characters` });
  if (await userModel.usernameTaken(username)) return res.status(409).json({ error: "That username is taken" });

  const organizationIds = await checkOrganizations(req.body?.organizationIds, res);
  if (!organizationIds) return;

  const password = generatePassword();
  const { id } = await userModel.create({
    username,
    displayName,
    isAdmin,
    organizationIds,
    passwordHash: await hashPassword(password),
  });

  res.status(201).json({ ...(await panel()), userId: id, username, password });
}

export async function updateUser(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (id === null || !(await userModel.exists(id))) return res.status(404).json({ error: "No such user" });

  const body = req.body ?? {};
  const changes: { username?: string; displayName?: string; isAdmin?: boolean } = {};

  if (body.username !== undefined) {
    const username = parseUsername(body.username);
    if (!username) {
      return res.status(400).json({ error: "Usernames are 3 to 24 letters, digits, dots, dashes or underscores" });
    }
    if (await userModel.usernameTaken(username, id)) return res.status(409).json({ error: "That username is taken" });
    changes.username = username;
  }

  if (body.displayName !== undefined) {
    const displayName = parseName(body.displayName, NAME_MAX);
    if (!displayName) return res.status(400).json({ error: `Display name must be 1 to ${NAME_MAX} characters` });
    changes.displayName = displayName;
  }

  if (body.isAdmin !== undefined) {
    if (typeof body.isAdmin !== "boolean") return res.status(400).json({ error: "isAdmin must be true or false" });
    if (id === req.userId && !body.isAdmin) return res.status(400).json({ error: "You can't remove your own admin" });
    changes.isAdmin = body.isAdmin;
  }

  if (body.organizationIds !== undefined) {
    const organizationIds = await checkOrganizations(body.organizationIds, res);
    if (!organizationIds) return;
    await userModel.setOrganizations(id, organizationIds);
  }

  await userModel.update(id, changes);
  res.json(await panel());
}

/**
 * Sets a password: the one given, or a generated one if none was. Either way
 * the user is signed out everywhere, and the password is returned once.
 */
export async function setPassword(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (id === null || !(await userModel.exists(id))) return res.status(404).json({ error: "No such user" });

  const given = req.body?.password;
  if (given !== undefined && (typeof given !== "string" || given.length < MIN_PASSWORD_LENGTH || given.length > 200)) {
    return res.status(400).json({ error: `Passwords need at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const password = given ?? generatePassword();
  await userModel.setPassword(id, await hashPassword(password));
  res.json({ password });
}

export async function deleteUser(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (id === null || !(await userModel.exists(id))) return res.status(404).json({ error: "No such user" });
  if (id === req.userId) return res.status(400).json({ error: "You can't delete your own account" });

  await userModel.remove(id);
  res.json(await panel());
}

// ---- Picks ----

/** Any user's picks for a week, for editing on their behalf. */
export async function userWeek(req: Request, res: Response) {
  const userId = parseId(req.params.id);
  const requested = parseWeekQuery(req.query);
  if (userId === null || !(await userModel.exists(userId))) return res.status(404).json({ error: "No such user" });
  if (requested === "INVALID") return res.status(400).json({ error: "Invalid week" });

  const { week } = await resolveWeek(requested);
  if (!week) return res.status(404).json({ error: "No such week" });

  const games = await scheduleModel.gamesForWeek(weekKeyOf(week));
  const picks = await predictionModel.forUsersAndGames(
    [userId],
    games.map((g) => g.id),
  );
  const pickByGame = new Map(picks.map((p) => [p.gameId, p]));

  res.json({
    week,
    games: games.map((game) => {
      const pick = pickByGame.get(game.id);
      return { ...presentGame(game), pick: pick ? presentPick(pick, game) : null };
    }),
  });
}

/** Ignores the kickoff lock. */
export async function setPick(req: Request, res: Response) {
  const userId = parseId(req.params.id);
  const gameId = parseId(req.params.gameId);
  const homeScore = parseScore(req.body?.homeScore);
  const awayScore = parseScore(req.body?.awayScore);

  if (userId === null || !(await userModel.exists(userId))) return res.status(404).json({ error: "No such user" });
  const game = gameId === null ? null : await scheduleModel.findGame(gameId);
  if (!game) return res.status(404).json({ error: "No such game" });
  if (homeScore === null || awayScore === null) {
    return res.status(400).json({ error: "Scores must be whole numbers from 0 to 99" });
  }

  const pick = await predictionModel.upsert(userId, game.id, homeScore, awayScore);
  res.json({ pick: presentPick(pick, game) });
}

export async function clearPick(req: Request, res: Response) {
  const userId = parseId(req.params.id);
  const gameId = parseId(req.params.gameId);
  if (userId === null || gameId === null) return res.status(404).json({ error: "No such pick" });

  await predictionModel.remove(userId, gameId);
  res.status(204).end();
}

// ---- Games ----

/** Pull a week from ESPN now, whatever its cache says. */
export async function syncWeek(req: Request, res: Response) {
  const requested = parseWeekQuery(req.body ?? {});
  if (requested === "INVALID") return res.status(400).json({ error: "Invalid week" });

  await scheduleModel.syncCalendar();
  const { week } = await resolveWeek(requested);
  if (!week) return res.status(404).json({ error: "No such week" });

  const count = await scheduleModel.syncWeek(weekKeyOf(week));
  const games = await scheduleModel.gamesForWeek(weekKeyOf(week));
  res.json({ week, synced: count, games: games.map(presentGame) });
}

const STATUSES = ["SCHEDULED", "LIVE", "FINAL", "CANCELED"] as const;

/**
 * Overrides a game's result. While `manualResult` is on, syncs leave the score
 * and status alone; turning it off hands the game back to ESPN on the next sync.
 */
export async function setResult(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const game = id === null ? null : await scheduleModel.findGame(id);
  if (!game) return res.status(404).json({ error: "No such game" });

  const { status, homeScore, awayScore, manualResult } = req.body ?? {};

  if (manualResult === false) {
    const { status, homeScore, awayScore } = game;
    await scheduleModel.setResult(game.id, { status, homeScore, awayScore, manualResult: false });
    await scheduleModel.syncWeek(weekKeyOf(game));
    return res.json({ game: presentGame((await scheduleModel.findGame(game.id))!) });
  }

  if (!STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });
  const home = homeScore === null ? null : parseScore(homeScore);
  const away = awayScore === null ? null : parseScore(awayScore);
  if ((homeScore !== null && home === null) || (awayScore !== null && away === null)) {
    return res.status(400).json({ error: "Scores must be whole numbers from 0 to 99" });
  }
  if ((status === "FINAL" || status === "LIVE") && (home === null || away === null)) {
    return res.status(400).json({ error: "A live or final game needs both scores" });
  }

  const updated = await scheduleModel.setResult(game.id, {
    status,
    homeScore: home,
    awayScore: away,
    manualResult: true,
  });
  res.json({ game: presentGame(updated) });
}
