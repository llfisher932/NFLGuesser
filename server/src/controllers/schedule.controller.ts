import type { Request, Response } from "express";
import * as scheduleModel from "../models/schedule.model.js";
import * as predictionModel from "../models/prediction.model.js";
import { parseId, parseScore, parseWeekQuery } from "./params.js";
import { presentGame, presentPick, resolveWeek, weekKeyOf } from "./present.js";

/** The calendar, plus which week is "now". */
export async function weeks(req: Request, res: Response) {
  const weeks = await scheduleModel.listWeeks();
  const current = scheduleModel.currentWeek(weeks);
  res.json({ weeks, current: current && weekKeyOf(current) });
}

/** One week's games with the signed-in user's own picks. */
export async function myWeek(req: Request, res: Response) {
  const requested = parseWeekQuery(req.query);
  if (requested === "INVALID") return res.status(400).json({ error: "Invalid week" });

  const { week } = await resolveWeek(requested);
  if (!week) return res.status(404).json({ error: "No such week" });

  const games = await scheduleModel.gamesForWeek(weekKeyOf(week));
  const picks = await predictionModel.forUsersAndGames(
    [req.userId!],
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

export async function savePick(req: Request, res: Response) {
  const gameId = parseId(req.params.gameId);
  const homeScore = parseScore(req.body?.homeScore);
  const awayScore = parseScore(req.body?.awayScore);

  if (gameId === null) return res.status(400).json({ error: "Invalid game" });
  if (homeScore === null || awayScore === null) {
    return res.status(400).json({ error: "Scores must be whole numbers from 0 to 99" });
  }

  const game = await scheduleModel.findGame(gameId);
  if (!game) return res.status(404).json({ error: "No such game" });
  if (scheduleModel.isLocked(game)) return res.status(409).json({ error: "This game has kicked off. Picks are locked." });

  const pick = await predictionModel.upsert(req.userId!, gameId, homeScore, awayScore);
  res.json({ pick: presentPick(pick, game) });
}

export async function clearPick(req: Request, res: Response) {
  const gameId = parseId(req.params.gameId);
  if (gameId === null) return res.status(400).json({ error: "Invalid game" });

  const game = await scheduleModel.findGame(gameId);
  if (!game) return res.status(404).json({ error: "No such game" });
  if (scheduleModel.isLocked(game)) return res.status(409).json({ error: "This game has kicked off. Picks are locked." });

  await predictionModel.remove(req.userId!, gameId);
  res.status(204).end();
}
