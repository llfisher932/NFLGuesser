export type OrgSummary = { id: number; name: string };

/** The signed-in user. Only ever sent for yourself. */
export type Self = {
  id: number;
  username: string;
  displayName: string;
  isAdmin: boolean;
  organizations: OrgSummary[];
};

export type Member = { id: number; username: string; displayName: string };

export type WeekKey = { season: number; seasonType: number; week: number };

export type Week = WeekKey & { label: string; startDate: string; endDate: string };

export type GameStatus = "SCHEDULED" | "LIVE" | "FINAL" | "CANCELED";

export type Game = WeekKey & {
  id: number;
  kickoff: string;
  status: GameStatus;
  statusDetail: string | null;
  homeTeam: string;
  homeName: string;
  homeLogo: string | null;
  homeColor: string | null;
  homeRecord: string | null;
  homeScore: number | null;
  awayTeam: string;
  awayName: string;
  awayLogo: string | null;
  awayColor: string | null;
  awayRecord: string | null;
  awayScore: number | null;
  manualResult: boolean;
  /** Kicked off: picks can no longer change (except by the admin). */
  locked: boolean;
};

export type Points = {
  winner: number;
  homeScore: number;
  awayScore: number;
  differential: number;
  total: number;
  /** False while the game is still being played. */
  final: boolean;
};

export type Pick = { homeScore: number; awayScore: number; updatedAt: string; points: Points | null };

export type GameWithPick = Game & { pick: Pick | null };

export type MemberPick = Pick & { userId: number; gameId: number };

export type Organization = OrgSummary & { members: Member[] };

export type StandingRow = {
  user: Member;
  rank: number;
  points: number;
  weekPoints: number;
  livePoints: number;
  picks: number;
  correctWinners: number;
  exactScores: number;
};

export type AdminUser = Member & {
  isAdmin: boolean;
  createdAt: string;
  organizations: OrgSummary[];
  predictionCount: number;
};

export type AdminOrg = OrgSummary & { code: string; createdAt: string; memberCount: number };

export type AdminPanel = { users: AdminUser[]; organizations: AdminOrg[] };

export type AdminTab = "users" | "organizations" | "games";

export type OrgTab = "standings" | "picks";

export type View =
  | { name: "picks" }
  | { name: "org"; orgId: number; tab: OrgTab }
  | { name: "account" }
  | { name: "rules" }
  | { name: "admin"; tab: AdminTab };
