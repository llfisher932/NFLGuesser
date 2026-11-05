import { describe, expect, it } from "vitest";
import { MAX_POINTS_PER_GAME, scorePrediction } from "./scoring.js";

describe("scorePrediction", () => {
  it("gives full marks for an exact score", () => {
    expect(scorePrediction({ homeScore: 20, awayScore: 13 }, { homeScore: 20, awayScore: 13 })).toEqual({
      winner: 10,
      homeScore: 10,
      awayScore: 10,
      differential: 10,
      total: MAX_POINTS_PER_GAME,
    });
  });

  it("scores each part by distance", () => {
    // Picked 24-17 (home by 7); it finished 21-20 (home by 1).
    expect(scorePrediction({ homeScore: 24, awayScore: 17 }, { homeScore: 21, awayScore: 20 })).toEqual({
      winner: 10,
      homeScore: 7,
      awayScore: 7,
      differential: 4,
      total: 28,
    });
  });

  it("measures the differential with direction", () => {
    // Picked home by 7; away won by 3. That is 10 off, so nothing.
    const points = scorePrediction({ homeScore: 27, awayScore: 20 }, { homeScore: 20, awayScore: 23 });
    expect(points.winner).toBe(0);
    expect(points.differential).toBe(0);
    expect(points.homeScore).toBe(3);
    expect(points.awayScore).toBe(7);
  });

  it("never goes below zero", () => {
    const points = scorePrediction({ homeScore: 45, awayScore: 0 }, { homeScore: 3, awayScore: 38 });
    expect(points).toEqual({ winner: 0, homeScore: 0, awayScore: 0, differential: 0, total: 0 });
  });

  it("only rewards a predicted tie when the game ties", () => {
    expect(scorePrediction({ homeScore: 17, awayScore: 17 }, { homeScore: 20, awayScore: 20 }).winner).toBe(10);
    expect(scorePrediction({ homeScore: 17, awayScore: 17 }, { homeScore: 20, awayScore: 17 }).winner).toBe(0);
    expect(scorePrediction({ homeScore: 20, awayScore: 17 }, { homeScore: 17, awayScore: 17 }).winner).toBe(0);
  });
});
