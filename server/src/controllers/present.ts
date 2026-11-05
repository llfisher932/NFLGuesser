import { scorePrediction, type PointsBreakdown } from "../scoring.js";
import * as scheduleModel from "../models/schedule.model.js";
import type { GameRow, WeekKey } from "../models/schedule.model.js";

export const presentGame = (game: GameRow) => ({ ...game, locked: scheduleModel.isLocked(game) });

export type Pick = { homeScore: number; awayScore: number; updatedAt: Date };

/**
 * A pick as shown to anyone: the numbers plus, once the game has a score, the
 * points it's worth. Points on a live game are provisional, and say so.
 */
export function presentPick(pick: Pick, game: GameRow) {
  let points: (PointsBreakdown & { final: boolean }) | null = null;

  if ((game.status === "FINAL" || game.status === "LIVE") && game.homeScore !== null && game.awayScore !== null) {
    points = {
      ...scorePrediction(pick, { homeScore: game.homeScore, awayScore: game.awayScore }),
      final: game.status === "FINAL",
    };
  }

  return { homeScore: pick.homeScore, awayScore: pick.awayScore, updatedAt: pick.updatedAt, points };
}

/** The week asked for, or the current one when none was. */
export async function resolveWeek(requested: WeekKey | null) {
  const weeks = await scheduleModel.listWeeks();
  const current = scheduleModel.currentWeek(weeks);
  const key = requested ?? (current && { season: current.season, seasonType: current.seasonType, week: current.week });

  const week =
    key && weeks.find((w) => w.season === key.season && w.seasonType === key.seasonType && w.week === key.week);

  return { weeks, current, week: week ?? null };
}

export const weekKeyOf = (week: WeekKey): WeekKey => ({
  season: week.season,
  seasonType: week.seasonType,
  week: week.week,
});
