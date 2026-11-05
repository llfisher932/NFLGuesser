import { Alert, Box, CircularProgress, Container, Stack, Typography } from "@mui/material";
import { api } from "../utils/api";
import type { Week, WeekKey } from "../utils/types";
import { useLoad, weekKey } from "../utils/useLoad";
import PickSheet from "../components/PickSheet";
import WeekPicker from "../components/WeekPicker";

type PicksProps = {
  weeks: Week[];
  week: WeekKey | null;
  onWeekChange: (week: WeekKey) => void;
};

/** Your one slate of picks. It counts on every leaderboard you're on. */
const Picks = ({ weeks, week, onWeekChange }: PicksProps) => {
  const { data: loaded, error } = useLoad(weekKey(week), () => api.myGames(week));

  const totals = loaded?.games.reduce(
    (sum, g) => {
      if (g.pick) sum.picked += 1;
      if (g.pick?.points?.final) sum.points += g.pick.points.total;
      return sum;
    },
    { picked: 0, points: 0 },
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 2, mb: 1 }}>
        <Typography variant="h5">My picks</Typography>
        <WeekPicker weeks={weeks} week={week} onChange={onWeekChange} />
      </Stack>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Predict the final score of each game. Picks lock at kickoff, and the same picks count in every league you're in.
        {loaded && totals && ` ${totals.picked} of ${loaded.games.length} picked · ${totals.points} pts so far.`}
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {!loaded && !error && (
        <Box sx={{ display: "flex", py: 8, justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      )}

      {loaded && (
        <PickSheet
          key={`${loaded.week.season}-${loaded.week.seasonType}-${loaded.week.week}`}
          games={loaded.games}
          onSave={api.savePick}
          onClear={api.clearPick}
        />
      )}
    </Container>
  );
};

export default Picks;
