import prisma from "../db.js";
import { fetchCalendar, fetchWeek } from "../espn.js";
import type { GameStatus } from "../generated/prisma/client.js";

/**
 * Games come from ESPN, but nothing runs on a schedule (this is serverless).
 * Instead every read of the calendar or of a week first asks whether its copy
 * is too old, and if so pulls a fresh one. How old is "too old" depends on what
 * the week is doing: a week with a game in progress refreshes every minute,
 * one that's all done barely ever.
 *
 * If ESPN is down, the stale copy is served rather than failing the page.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const CALENDAR_TTL = 12 * HOUR;
const LIVE_TTL = MINUTE;
const UPCOMING_TTL = 3 * HOUR;
const DONE_TTL = 24 * HOUR;
/** A week ESPN had no games for yet. */
const EMPTY_TTL = 6 * HOUR;

export type WeekKey = { season: number; seasonType: number; week: number };

const weekSyncKey = ({ season, seasonType, week }: WeekKey) => `week:${season}:${seasonType}:${week}`;

async function lastSynced(key: string): Promise<Date | null> {
  const row = await prisma.syncState.findUnique({ where: { key } });
  return row?.syncedAt ?? null;
}

function markSynced(key: string) {
  const syncedAt = new Date();
  return prisma.syncState.upsert({ where: { key }, create: { key, syncedAt }, update: { syncedAt } });
}

// ---- Calendar ----

export async function syncCalendar() {
  const weeks = await fetchCalendar();

  await prisma.$transaction(
    weeks.map(({ season, seasonType, week, ...rest }) =>
      prisma.week.upsert({
        where: { season_seasonType_week: { season, seasonType, week } },
        create: { season, seasonType, week, ...rest },
        update: rest,
      }),
    ),
  );
  await markSynced("calendar");
}

async function ensureCalendar() {
  const synced = await lastSynced("calendar");
  if (synced && Date.now() - synced.getTime() < CALENDAR_TTL) return;

  try {
    await syncCalendar();
  } catch (error) {
    if (!synced) throw error;
    console.error("Calendar sync failed; serving the stored calendar", error);
  }
}

export async function listWeeks() {
  await ensureCalendar();
  return prisma.week.findMany({ orderBy: [{ season: "desc" }, { seasonType: "asc" }, { week: "asc" }] });
}

/**
 * The week to show by default: the one happening now, else the next one to
 * come, else (in the offseason) the last one played.
 */
export function currentWeek(weeks: { season: number; seasonType: number; week: number; startDate: Date; endDate: Date }[]) {
  const now = Date.now();
  const sorted = [...weeks].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  return (
    sorted.find((w) => w.startDate.getTime() <= now && now < w.endDate.getTime()) ??
    sorted.find((w) => w.startDate.getTime() > now) ??
    sorted.at(-1) ??
    null
  );
}

export function seasons() {
  return prisma.week
    .findMany({ distinct: ["season"], select: { season: true }, orderBy: { season: "desc" } })
    .then((rows) => rows.map((r) => r.season));
}

// ---- Games ----

export async function syncWeek(key: WeekKey) {
  const games = await fetchWeek(key.season, key.seasonType, key.week);

  await prisma.$transaction(async (tx) => {
    for (const game of games) {
      const fixture = {
        ...key,
        kickoff: game.kickoff,
        homeTeam: game.home.team,
        homeName: game.home.name,
        homeLogo: game.home.logo,
        homeColor: game.home.color,
        homeRecord: game.home.record,
        awayTeam: game.away.team,
        awayName: game.away.name,
        awayLogo: game.away.logo,
        awayColor: game.away.color,
        awayRecord: game.away.record,
      };
      const result = {
        status: game.status,
        statusDetail: game.statusDetail,
        homeScore: game.home.score,
        awayScore: game.away.score,
      };

      const existing = await tx.game.findUnique({ where: { espnId: game.espnId }, select: { manualResult: true } });

      if (!existing) {
        await tx.game.create({ data: { espnId: game.espnId, ...fixture, ...result } });
      } else {
        // A hand-entered result is the admin's call; only the fixture follows ESPN.
        await tx.game.update({
          where: { espnId: game.espnId },
          data: existing.manualResult ? fixture : { ...fixture, ...result },
        });
      }
    }
  });

  await markSynced(weekSyncKey(key));
  return games.length;
}

function weekTtl(games: { status: GameStatus; kickoff: Date }[]) {
  if (games.length === 0) return EMPTY_TTL;

  const now = Date.now();
  const underway = games.some((g) => g.status === "LIVE" || (g.status === "SCHEDULED" && g.kickoff.getTime() <= now));
  if (underway) return LIVE_TTL;

  return games.every((g) => g.status === "FINAL" || g.status === "CANCELED") ? DONE_TTL : UPCOMING_TTL;
}

async function ensureWeek(key: WeekKey) {
  const [synced, games] = await Promise.all([
    lastSynced(weekSyncKey(key)),
    prisma.game.findMany({ where: key, select: { status: true, kickoff: true } }),
  ]);

  if (synced && Date.now() - synced.getTime() < weekTtl(games)) return;

  try {
    await syncWeek(key);
  } catch (error) {
    if (!synced) throw error;
    console.error(`Sync of ${weekSyncKey(key)} failed; serving the stored games`, error);
  }
}

export const gameSelect = {
  id: true,
  season: true,
  seasonType: true,
  week: true,
  kickoff: true,
  status: true,
  statusDetail: true,
  homeTeam: true,
  homeName: true,
  homeLogo: true,
  homeColor: true,
  homeRecord: true,
  homeScore: true,
  awayTeam: true,
  awayName: true,
  awayLogo: true,
  awayColor: true,
  awayRecord: true,
  awayScore: true,
  manualResult: true,
} as const;

export async function gamesForWeek(key: WeekKey) {
  await ensureWeek(key);
  return prisma.game.findMany({ where: key, orderBy: [{ kickoff: "asc" }, { id: "asc" }], select: gameSelect });
}

export type GameRow = Awaited<ReturnType<typeof gamesForWeek>>[number];

/**
 * Before every season's games are on file, the season standings would only
 * count weeks somebody happened to open. So the standings pull each week the
 * season has reached once, and keep any live one fresh.
 */
export async function ensureSeasonPlayed(season: number) {
  const weeks = await prisma.week.findMany({ where: { season, startDate: { lte: new Date() } } });
  for (const week of weeks) {
    await ensureWeek({ season, seasonType: week.seasonType, week: week.week });
  }
}

export function findGame(id: number) {
  return prisma.game.findUnique({ where: { id }, select: gameSelect });
}

/** Picks close at kickoff, or as soon as ESPN says the game has started. */
export const isLocked = (game: { status: GameStatus; kickoff: Date }) =>
  game.status !== "SCHEDULED" || game.kickoff.getTime() <= Date.now();

export function setResult(
  id: number,
  data: { status: GameStatus; homeScore: number | null; awayScore: number | null; manualResult: boolean },
) {
  return prisma.game.update({
    where: { id },
    data: { ...data, statusDetail: data.status === "FINAL" ? "Final" : null },
    select: gameSelect,
  });
}
