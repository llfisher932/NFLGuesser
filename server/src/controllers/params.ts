import { MAX_SCORE } from "../models/prediction.model.js";
import type { WeekKey } from "../models/schedule.model.js";

export function parseId(raw: unknown): number | null {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/** A team's points: a whole number from 0 to 99. */
export function parseScore(raw: unknown): number | null {
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= MAX_SCORE ? raw : null;
}

/**
 * `?season=2026&seasonType=2&week=9`. All three or none: none means "the
 * current week", which the caller works out.
 */
export function parseWeekQuery(query: Record<string, unknown>): WeekKey | null | "INVALID" {
  const { season, seasonType, week } = query;
  if (season === undefined && seasonType === undefined && week === undefined) return null;

  const key = { season: Number(season), seasonType: Number(seasonType), week: Number(week) };
  const valid =
    Number.isInteger(key.season) &&
    key.season >= 2000 &&
    key.season <= 2100 &&
    (key.seasonType === 2 || key.seasonType === 3) &&
    Number.isInteger(key.week) &&
    key.week >= 1 &&
    key.week <= 25;

  return valid ? key : "INVALID";
}

export function parseName(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim();
  return name.length >= 1 && name.length <= max ? name : null;
}

/** 3 to 24 characters: letters, digits, dot, dash, underscore. */
export function parseUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const username = raw.trim().toLowerCase();
  return /^[a-z0-9._-]{3,24}$/.test(username) ? username : null;
}

export function parseIdList(raw: unknown): number[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return null;
  const ids = raw.map(parseId);
  return ids.every((id): id is number => id !== null) ? [...new Set(ids)] : null;
}
