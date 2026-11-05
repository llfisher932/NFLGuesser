import type {
  AdminPanel,
  Game,
  GameStatus,
  GameWithPick,
  MemberPick,
  Organization,
  Pick,
  Self,
  StandingRow,
  Week,
  WeekKey,
} from "./types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Same-origin in every environment: Vite proxies /api to the dev server
// locally, and on Vercel a top-level rewrite routes /api/* to the server service.
const API_BASE = "/api";

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const hasBody = options.body !== undefined;

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error ?? "Something went wrong", res.status);
  }

  return data as T;
}

/** No week means "the current one"; the server decides which that is. */
function weekQuery(week: WeekKey | null): string {
  if (!week) return "";
  return `?${new URLSearchParams({
    season: String(week.season),
    seasonType: String(week.seasonType),
    week: String(week.week),
  })}`;
}

type WeekGames = { week: Week; games: GameWithPick[] };

export const api = {
  me: () => request<{ user: Self }>("/auth/me"),

  login: (username: string, password: string) =>
    request<{ user: Self }>("/auth/login", { method: "POST", body: { username, password } }),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  // Signs out every other device; this one stays signed in.
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>("/auth/password", { method: "POST", body: { currentPassword, newPassword } }),

  weeks: () => request<{ weeks: Week[]; current: WeekKey | null }>("/weeks"),

  myGames: (week: WeekKey | null) => request<WeekGames>(`/games${weekQuery(week)}`),

  savePick: (gameId: number, homeScore: number, awayScore: number) =>
    request<{ pick: Pick }>(`/picks/${gameId}`, { method: "PUT", body: { homeScore, awayScore } }),

  clearPick: (gameId: number) => request<void>(`/picks/${gameId}`, { method: "DELETE" }),

  standings: (orgId: number, week: WeekKey | null) =>
    request<{ organization: Organization; week: Week; standings: StandingRow[] }>(
      `/organizations/${orgId}/standings${weekQuery(week)}`,
    ),

  orgPicks: (orgId: number, week: WeekKey | null) =>
    request<{ organization: Organization; week: Week; games: Game[]; picks: MemberPick[] }>(
      `/organizations/${orgId}/picks${weekQuery(week)}`,
    ),

  // ---- Admin. The server checks the session, not anything sent here. ----

  adminPanel: () => request<AdminPanel>("/admin"),

  createOrganization: (name: string) =>
    request<AdminPanel & { organizationId: number }>("/admin/organizations", { method: "POST", body: { name } }),

  renameOrganization: (id: number, name: string) =>
    request<AdminPanel>(`/admin/organizations/${id}`, { method: "PATCH", body: { name } }),

  regenerateOrgCode: (id: number) => request<AdminPanel>(`/admin/organizations/${id}/code`, { method: "POST" }),

  deleteOrganization: (id: number) => request<AdminPanel>(`/admin/organizations/${id}`, { method: "DELETE" }),

  addMember: (orgId: number, userId: number) =>
    request<AdminPanel>(`/admin/organizations/${orgId}/members/${userId}`, { method: "PUT" }),

  removeMember: (orgId: number, userId: number) =>
    request<AdminPanel>(`/admin/organizations/${orgId}/members/${userId}`, { method: "DELETE" }),

  // The password comes back exactly once. It is never stored in plain text.
  createUser: (body: { username: string; displayName: string; isAdmin: boolean; organizationIds: number[] }) =>
    request<AdminPanel & { userId: number; username: string; password: string }>("/admin/users", {
      method: "POST",
      body,
    }),

  updateUser: (
    id: number,
    body: { username?: string; displayName?: string; isAdmin?: boolean; organizationIds?: number[] },
  ) => request<AdminPanel>(`/admin/users/${id}`, { method: "PATCH", body }),

  // Omit the password to have one generated. Either way it's returned once.
  setUserPassword: (id: number, password?: string) =>
    request<{ password: string }>(`/admin/users/${id}/password`, {
      method: "POST",
      body: password === undefined ? {} : { password },
    }),

  deleteUser: (id: number) => request<AdminPanel>(`/admin/users/${id}`, { method: "DELETE" }),

  userGames: (id: number, week: WeekKey | null) => request<WeekGames>(`/admin/users/${id}/games${weekQuery(week)}`),

  // Not bound by the kickoff lock.
  setUserPick: (id: number, gameId: number, homeScore: number, awayScore: number) =>
    request<{ pick: Pick }>(`/admin/users/${id}/picks/${gameId}`, { method: "PUT", body: { homeScore, awayScore } }),

  clearUserPick: (id: number, gameId: number) =>
    request<void>(`/admin/users/${id}/picks/${gameId}`, { method: "DELETE" }),

  syncWeek: (week: WeekKey | null) =>
    request<{ week: Week; synced: number; games: Game[] }>("/admin/sync", { method: "POST", body: week ?? {} }),

  setResult: (gameId: number, body: { status: GameStatus; homeScore: number | null; awayScore: number | null }) =>
    request<{ game: Game }>(`/admin/games/${gameId}/result`, { method: "PUT", body }),

  // Drops the override and re-reads the game from ESPN.
  releaseResult: (gameId: number) =>
    request<{ game: Game }>(`/admin/games/${gameId}/result`, { method: "PUT", body: { manualResult: false } }),
};

export function timeUntil(iso: string): string {
  const seconds = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);

  if (seconds <= 0) return "now";
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;

  if (seconds >= 48 * 3600) {
    const days = Math.floor(seconds / 86400);
    const leftover = Math.floor((seconds % 86400) / 3600);
    return leftover === 0 ? `${days}d` : `${days}d ${leftover}h`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export const kickoffLabel = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export const sameWeek = (a: WeekKey | null, b: WeekKey | null) =>
  !!a && !!b && a.season === b.season && a.seasonType === b.seasonType && a.week === b.week;
