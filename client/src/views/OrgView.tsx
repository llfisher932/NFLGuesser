import { useState } from "react";
import {
  Alert,
  Box,
  Card,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import { api } from "../utils/api";
import type { Game, MemberPick, Organization, OrgTab, Self, StandingRow, Week, WeekKey } from "../utils/types";
import { useLoad, weekKey } from "../utils/useLoad";
import WeekPicker from "../components/WeekPicker";
import { PointsChip, StatusLine, TeamLogo } from "../components/GameCard";

type OrgViewProps = {
  user: Self;
  orgId: number;
  tab: OrgTab;
  onTabChange: (tab: OrgTab) => void;
  weeks: Week[];
  week: WeekKey | null;
  onWeekChange: (week: WeekKey) => void;
};

const OrgView = ({ user, orgId, tab, onTabChange, weeks, week, onWeekChange }: OrgViewProps) => {
  const [name, setName] = useState(() => user.organizations.find((o) => o.id === orgId)?.name ?? "");

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 2, mb: 1 }}>
        <Typography variant="h5">{name}</Typography>
        <WeekPicker weeks={weeks} week={week} onChange={onWeekChange} />
      </Stack>

      <Tabs value={tab} onChange={(_, next: OrgTab) => onTabChange(next)} sx={{ mb: 3 }}>
        <Tab value="standings" label="Leaderboard" />
        <Tab value="picks" label="Everyone's picks" />
      </Tabs>

      {tab === "standings" ? (
        <Standings orgId={orgId} week={week} viewerId={user.id} onLoaded={setName} />
      ) : (
        <GroupPicks orgId={orgId} week={week} viewerId={user.id} onLoaded={setName} />
      )}
    </Container>
  );
};

type PanelProps = { orgId: number; week: WeekKey | null; viewerId: number; onLoaded: (name: string) => void };

/** Loads one panel of the org page, and passes the org's current name up for the heading. */
function useOrgLoad<T extends { organization: Organization }>(
  key: string,
  load: () => Promise<T>,
  onLoaded: (name: string) => void,
) {
  return useLoad(key, () =>
    load().then((result) => {
      onLoaded(result.organization.name);
      return result;
    }),
  );
}

const Loading = () => (
  <Box sx={{ display: "flex", py: 8, justifyContent: "center" }}>
    <CircularProgress />
  </Box>
);

function Standings({ orgId, week, viewerId, onLoaded }: PanelProps) {
  const { data, error } = useOrgLoad(`${orgId}:${weekKey(week)}`, () => api.standings(orgId, week), onLoaded);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Loading />;

  const rows: StandingRow[] = data.standings;
  const anyLive = rows.some((r) => r.livePoints > 0);

  return (
    <>
      <TableContainer component={Card} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { whiteSpace: "nowrap" } }}>
              <TableCell sx={{ width: 48 }}>#</TableCell>
              <TableCell>Player</TableCell>
              <TableCell align="right">{data.week.season} pts</TableCell>
              <TableCell align="right">{data.week.label}</TableCell>
              <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                Winners
              </TableCell>
              <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                Exact
              </TableCell>
              <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                Avg / game
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.user.id} selected={row.user.id === viewerId}>
                <TableCell sx={{ fontWeight: 700 }}>{row.rank}</TableCell>
                <TableCell>
                  <Typography sx={{ fontWeight: 600 }}>{row.user.displayName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    @{row.user.username}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
                  {row.points}
                </TableCell>
                <TableCell align="right">
                  {row.weekPoints}
                  {row.livePoints > 0 && (
                    <Typography component="span" variant="caption" color="text.secondary">
                      {" "}
                      +{row.livePoints}*
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  {row.correctWinners}/{row.picks}
                </TableCell>
                <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  {row.exactScores}
                </TableCell>
                <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
                  {row.picks === 0 ? "–" : (row.points / row.picks).toFixed(1)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Season totals count finished games only.
        {anyLive && " * points from games still being played, if they end as they stand."}
      </Typography>
    </>
  );
}

function GroupPicks({ orgId, week, viewerId, onLoaded }: PanelProps) {
  const { data, error } = useOrgLoad(`${orgId}:${weekKey(week)}`, () => api.orgPicks(orgId, week), onLoaded);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Loading />;

  const { games, organization } = data;
  // You first, then everyone else alphabetically.
  const members = [...organization.members].sort(
    (a, b) => Number(b.id === viewerId) - Number(a.id === viewerId) || a.displayName.localeCompare(b.displayName),
  );
  const pickOf = new Map<string, MemberPick>(data.picks.map((p) => [`${p.userId}:${p.gameId}`, p]));

  const weekTotal = (userId: number) =>
    data.picks.filter((p) => p.userId === userId && p.points?.final).reduce((sum, p) => sum + p.points!.total, 0);

  if (games.length === 0) {
    return <Typography color="text.secondary">No games on the schedule for this week yet.</Typography>;
  }

  return (
    <>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mb: 3 }}>
        {members.map((m) => (
          <Chip
            key={m.id}
            variant={m.id === viewerId ? "filled" : "outlined"}
            label={`${m.displayName} · ${weekTotal(m.id)} pts`}
          />
        ))}
      </Stack>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        {games.map((game) => (
          <GamePicksCard
            key={game.id}
            game={game}
            members={members}
            viewerId={viewerId}
            pickOf={(userId) => pickOf.get(`${userId}:${game.id}`)}
          />
        ))}
      </Box>
    </>
  );
}

type GamePicksCardProps = {
  game: Game;
  members: Organization["members"];
  viewerId: number;
  pickOf: (userId: number) => MemberPick | undefined;
};

function GamePicksCard({ game, members, viewerId, pickOf }: GamePicksCardProps) {
  const hasResult = game.homeScore !== null && game.awayScore !== null;

  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" sx={{ alignItems: "center", gap: 1.5, mb: 1 }}>
        <TeamLogo src={game.awayLogo} alt={game.awayTeam} size={28} />
        <Typography sx={{ fontWeight: 700 }}>
          {game.awayTeam}
          {hasResult && ` ${game.awayScore}`}
        </Typography>
        <Typography color="text.secondary">@</Typography>
        <Typography sx={{ fontWeight: 700 }}>
          {game.homeTeam}
          {hasResult && ` ${game.homeScore}`}
        </Typography>
        <TeamLogo src={game.homeLogo} alt={game.homeTeam} size={28} />
      </Stack>
      <Box sx={{ mb: 1.5 }}>
        <StatusLine game={game} />
      </Box>

      <Table size="small">
        <TableBody>
          {members.map((m) => {
            const pick = pickOf(m.id);
            const winner =
              pick && pick.homeScore !== pick.awayScore
                ? pick.homeScore > pick.awayScore
                  ? game.homeTeam
                  : game.awayTeam
                : pick
                  ? "Tie"
                  : null;

            return (
              <TableRow key={m.id} selected={m.id === viewerId} sx={{ "& td": { borderBottom: 0, py: 0.5 } }}>
                <TableCell sx={{ pl: 1 }}>{m.displayName}</TableCell>
                <TableCell>
                  {pick ? (
                    <>
                      <Typography component="span" sx={{ fontWeight: 600 }}>
                        {winner}
                      </Typography>{" "}
                      <Typography component="span" color="text.secondary">
                        {game.awayTeam} {pick.awayScore} – {pick.homeScore} {game.homeTeam}
                      </Typography>
                    </>
                  ) : (
                    <Typography component="span" color="text.disabled">
                      No pick
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ pr: 1 }}>
                  {pick?.points && <PointsChip points={pick.points} />}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

export default OrgView;
