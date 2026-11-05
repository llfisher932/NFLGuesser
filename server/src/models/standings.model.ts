import { isExact, scorePrediction } from "../scoring.js";
import * as predictionModel from "./prediction.model.js";
import * as scheduleModel from "./schedule.model.js";
import type { WeekKey } from "./schedule.model.js";

type Member = { id: number; username: string; displayName: string };

export type StandingRow = {
  user: Member;
  rank: number;
  /** Final games only. */
  points: number;
  weekPoints: number;
  /** Points from games still in progress, if they ended as they stand. */
  livePoints: number;
  picks: number;
  correctWinners: number;
  exactScores: number;
};

/**
 * One org's season table. Everyone's picks are global, so this is the same
 * arithmetic for every org; only who's on the table differs.
 *
 * Ties share a rank (1, 2, 2, 4), and the order among them is by correct
 * winners, then name, so it doesn't jitter between loads.
 */
export async function forOrganization(members: Member[], season: number, week: WeekKey | null): Promise<StandingRow[]> {
  await scheduleModel.ensureSeasonPlayed(season);

  const picks = await predictionModel.scoredForSeason(
    members.map((m) => m.id),
    season,
  );

  const rows = new Map<number, StandingRow>(
    members.map((user) => [
      user.id,
      { user, rank: 0, points: 0, weekPoints: 0, livePoints: 0, picks: 0, correctWinners: 0, exactScores: 0 },
    ]),
  );

  for (const pick of picks) {
    const row = rows.get(pick.userId);
    const { game } = pick;
    if (!row || game.homeScore === null || game.awayScore === null) continue;

    const result = { homeScore: game.homeScore, awayScore: game.awayScore };
    const points = scorePrediction(pick, result);

    if (game.status === "LIVE") {
      row.livePoints += points.total;
      continue;
    }

    row.points += points.total;
    row.picks += 1;
    if (points.winner > 0) row.correctWinners += 1;
    if (isExact(pick, result)) row.exactScores += 1;
    if (week && game.seasonType === week.seasonType && game.week === week.week) row.weekPoints += points.total;
  }

  const sorted = [...rows.values()].sort(
    (a, b) =>
      b.points - a.points || b.correctWinners - a.correctWinners || a.user.displayName.localeCompare(b.user.displayName),
  );

  sorted.forEach((row, i) => {
    const previous = sorted[i - 1];
    row.rank = previous && previous.points === row.points ? previous.rank : i + 1;
  });

  return sorted;
}
