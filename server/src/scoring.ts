/**
 * How a prediction is scored. Pure, so the leaderboard, the picks grid and the
 * tests all agree, and so results can be recomputed whenever a score changes
 * (nothing is stored; an admin correcting a final just re-scores everyone).
 *
 * Three parts, each out of 10, for at most 40 a game:
 *
 *  - Winner: 10 for calling the result. Your winner is whichever side you gave
 *    more points, so a predicted tie only scores if the game really ties.
 *  - Team scores: for each team, 10 minus how many points you were off, never
 *    below 0. Guessing 24 for a team that scores 21 is worth 7.
 *  - Point differential: 10 minus how far your margin was from the real one,
 *    measured with direction (home minus away), never below 0. Picking a
 *    7-point home win when the away team won by 3 is 10 off, so 0.
 *
 * The parts reward different things on purpose: you can nail the margin of a
 * shootout while missing both totals, or pick the right winner with lousy
 * numbers.
 */

export const WINNER_POINTS = 10;
export const TEAM_SCORE_MAX = 10;
export const DIFFERENTIAL_MAX = 10;
export const MAX_POINTS_PER_GAME = WINNER_POINTS + 2 * TEAM_SCORE_MAX + DIFFERENTIAL_MAX;

export type Score = { homeScore: number; awayScore: number };

export type PointsBreakdown = {
  winner: number;
  homeScore: number;
  awayScore: number;
  differential: number;
  total: number;
};

const outcome = ({ homeScore, awayScore }: Score) => Math.sign(homeScore - awayScore);

const closeness = (max: number, off: number) => Math.max(0, max - Math.abs(off));

export function scorePrediction(prediction: Score, result: Score): PointsBreakdown {
  const winner = outcome(prediction) === outcome(result) ? WINNER_POINTS : 0;
  const homeScore = closeness(TEAM_SCORE_MAX, prediction.homeScore - result.homeScore);
  const awayScore = closeness(TEAM_SCORE_MAX, prediction.awayScore - result.awayScore);
  const differential = closeness(
    DIFFERENTIAL_MAX,
    prediction.homeScore - prediction.awayScore - (result.homeScore - result.awayScore),
  );

  return { winner, homeScore, awayScore, differential, total: winner + homeScore + awayScore + differential };
}

export const isExact = (prediction: Score, result: Score) =>
  prediction.homeScore === result.homeScore && prediction.awayScore === result.awayScore;
