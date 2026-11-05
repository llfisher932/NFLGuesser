import type { Request, Response } from "express";
import * as organizationModel from "../models/organization.model.js";
import * as predictionModel from "../models/prediction.model.js";
import * as scheduleModel from "../models/schedule.model.js";
import * as standingsModel from "../models/standings.model.js";
import { parseId, parseWeekQuery } from "./params.js";
import { presentGame, presentPick, resolveWeek, weekKeyOf } from "./present.js";

/**
 * Members see their own orgs; the admin sees any. Anyone else gets a 404 rather
 * than a 403, so org ids can't be probed.
 */
async function loadOrg(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const org = id === null ? null : await organizationModel.findForMembers(id);
  const allowed = org && (req.isAdmin || org.members.some((m) => m.id === req.userId));

  if (!allowed) {
    res.status(404).json({ error: "No such organization" });
    return null;
  }
  return org;
}

export async function show(req: Request, res: Response) {
  const org = await loadOrg(req, res);
  if (org) res.json({ organization: org });
}

/** The season table, with the chosen (or current) week's points alongside. */
export async function standings(req: Request, res: Response) {
  const requested = parseWeekQuery(req.query);
  if (requested === "INVALID") return res.status(400).json({ error: "Invalid week" });

  const org = await loadOrg(req, res);
  if (!org) return;

  const { week } = await resolveWeek(requested);
  if (!week) return res.status(404).json({ error: "No such week" });

  const rows = await standingsModel.forOrganization(org.members, week.season, weekKeyOf(week));
  res.json({ organization: org, week, standings: rows });
}

/**
 * Every member's pick on every game of the week. Deliberately visible before
 * kickoff too: arguing about each other's picks is half the point.
 */
export async function picks(req: Request, res: Response) {
  const requested = parseWeekQuery(req.query);
  if (requested === "INVALID") return res.status(400).json({ error: "Invalid week" });

  const org = await loadOrg(req, res);
  if (!org) return;

  const { week } = await resolveWeek(requested);
  if (!week) return res.status(404).json({ error: "No such week" });

  const games = await scheduleModel.gamesForWeek(weekKeyOf(week));
  const gameById = new Map(games.map((g) => [g.id, g]));
  const rows = await predictionModel.forUsersAndGames(
    org.members.map((m) => m.id),
    games.map((g) => g.id),
  );

  res.json({
    organization: org,
    week,
    games: games.map(presentGame),
    picks: rows.map((row) => ({ userId: row.userId, gameId: row.gameId, ...presentPick(row, gameById.get(row.gameId)!) })),
  });
}
