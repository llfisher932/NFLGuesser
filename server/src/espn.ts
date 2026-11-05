/**
 * ESPN's public scoreboard feed: no key, no account. It is unofficial, so
 * everything read from it is parsed defensively and anything unrecognised is
 * skipped rather than trusted. If ESPN ever changes shape, the admin can still
 * enter results by hand (see Game.manualResult).
 */

const SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const TIMEOUT_MS = 8_000;

/** Regular season and postseason. Preseason games aren't predicted. */
export const SEASON_TYPES = [2, 3] as const;

export type EspnWeek = {
  season: number;
  seasonType: number;
  week: number;
  label: string;
  startDate: Date;
  endDate: Date;
};

export type EspnGame = {
  espnId: string;
  kickoff: Date;
  status: "SCHEDULED" | "LIVE" | "FINAL" | "CANCELED";
  statusDetail: string | null;
  home: EspnTeam;
  away: EspnTeam;
};

type EspnTeam = {
  team: string;
  name: string;
  logo: string | null;
  color: string | null;
  record: string | null;
  /** Null until the game starts. */
  score: number | null;
};

// The feed is JSON of a shape we don't control; walk it as `any`, check as we go.

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`ESPN responded ${res.status} for ${url}`);
  return res.json();
}

function toDate(raw: unknown): Date | null {
  if (typeof raw !== "string") return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The current season's calendar, as listed on the default scoreboard. */
export async function fetchCalendar(): Promise<EspnWeek[]> {
  const data = await getJson(SCOREBOARD);
  const season = Number(data?.season?.year ?? data?.leagues?.[0]?.season?.year);
  const calendar: any[] = data?.leagues?.[0]?.calendar ?? [];
  if (!Number.isInteger(season)) return [];

  const weeks: EspnWeek[] = [];

  for (const block of calendar) {
    const seasonType = Number(block?.value);
    if (!(SEASON_TYPES as readonly number[]).includes(seasonType)) continue;

    for (const entry of block?.entries ?? []) {
      const week = Number(entry?.value);
      const startDate = toDate(entry?.startDate);
      const endDate = toDate(entry?.endDate);
      if (!Number.isInteger(week) || !startDate || !endDate) continue;

      weeks.push({ season, seasonType, week, label: String(entry?.label ?? `Week ${week}`), startDate, endDate });
    }
  }

  return weeks;
}

function parseStatus(type: any): EspnGame["status"] {
  const name = String(type?.name ?? "");
  if (name === "STATUS_POSTPONED" || name === "STATUS_CANCELED") return "CANCELED";
  if (type?.state === "post" && type?.completed) return "FINAL";
  if (type?.state === "in" || type?.state === "post") return "LIVE";
  return "SCHEDULED";
}

function parseTeam(competitor: any, started: boolean): EspnTeam | null {
  const team = competitor?.team;
  if (typeof team?.abbreviation !== "string") return null;

  const score = Number(competitor?.score);

  return {
    team: team.abbreviation,
    name: String(team.displayName ?? team.abbreviation),
    logo: typeof team.logo === "string" ? team.logo : null,
    color: typeof team.color === "string" ? `#${team.color}` : null,
    record: typeof competitor?.records?.[0]?.summary === "string" ? competitor.records[0].summary : null,
    score: started && Number.isInteger(score) ? score : null,
  };
}

export async function fetchWeek(season: number, seasonType: number, week: number): Promise<EspnGame[]> {
  const data = await getJson(`${SCOREBOARD}?dates=${season}&seasontype=${seasonType}&week=${week}`);
  const games: EspnGame[] = [];

  for (const event of data?.events ?? []) {
    const competition = event?.competitions?.[0];
    const kickoff = toDate(event?.date);
    if (typeof event?.id !== "string" || !competition || !kickoff) continue;

    const status = parseStatus(competition.status?.type);
    const started = status === "LIVE" || status === "FINAL";
    const competitors: any[] = competition.competitors ?? [];
    const home = parseTeam(competitors.find((c) => c?.homeAway === "home"), started);
    const away = parseTeam(competitors.find((c) => c?.homeAway === "away"), started);

    // The Pro Bowl is listed as AFC vs NFC. Not a game anyone predicts.
    if (!home || !away || home.team === "AFC" || home.team === "NFC") continue;

    games.push({
      espnId: event.id,
      kickoff,
      status,
      statusDetail: typeof competition.status?.type?.shortDetail === "string" ? competition.status.type.shortDetail : null,
      home,
      away,
    });
  }

  return games;
}
