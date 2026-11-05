import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faRotate } from "@fortawesome/free-solid-svg-icons";
import { api } from "../../utils/api";
import type { Game, GameStatus, Week, WeekKey } from "../../utils/types";
import { useLoad, weekKey } from "../../utils/useLoad";
import { StatusLine, TeamLogo } from "../GameCard";
import WeekPicker from "../WeekPicker";

type AdminGamesProps = {
  weeks: Week[];
  week: WeekKey | null;
  onWeekChange: (week: WeekKey) => void;
};

const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

/**
 * Games sync from ESPN on their own as people load pages. This is for when you
 * don't want to wait, or ESPN has a result wrong.
 */
const AdminGames = ({ weeks, week, onWeekChange }: AdminGamesProps) => {
  const loaded = useLoad(weekKey(week), () => api.myGames(week).then((data): Game[] => data.games));
  const games = loaded.data;
  const [syncError, setSyncError] = useState<string | null>(null);
  const error = loaded.error ?? syncError;
  const [notice, setNotice] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);

  const changeWeek = (next: WeekKey) => {
    setNotice(null);
    setSyncError(null);
    onWeekChange(next);
  };

  const sync = async () => {
    try {
      setIsSyncing(true);
      setSyncError(null);
      const result = await api.syncWeek(week);
      loaded.update(() => result.games);
      setNotice(`Pulled ${result.synced} games for ${result.week.label} from ESPN.`);
    } catch (err) {
      setSyncError(errorText(err));
    } finally {
      setIsSyncing(false);
    }
  };

  const replace = (game: Game) => loaded.update((current) => current.map((g) => (g.id === game.id ? game : g)));

  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, gap: 2, mb: 2 }}>
        <WeekPicker weeks={weeks} week={week} onChange={changeWeek} />
        <Button
          variant="outlined"
          disabled={isSyncing}
          onClick={sync}
          startIcon={<FontAwesomeIcon icon={faRotate} spin={isSyncing} />}>
          {isSyncing ? "Syncing…" : "Sync from ESPN now"}
        </Button>
      </Stack>

      {notice && (
        <Alert severity="success" onClose={() => setNotice(null)} sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!games && !error && (
        <Box sx={{ display: "flex", py: 8, justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      )}

      {games && games.length === 0 && <Typography color="text.secondary">ESPN has no games for this week yet.</Typography>}

      <Stack spacing={1}>
        {games?.map((game) => (
          <Card key={game.id} variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1.5, alignItems: { sm: "center" } }}>
              <Stack direction="row" sx={{ alignItems: "center", gap: 1, minWidth: 220 }}>
                <TeamLogo src={game.awayLogo} alt={game.awayTeam} size={24} />
                <Typography sx={{ fontWeight: 700 }}>
                  {game.awayTeam} {game.awayScore ?? ""}
                </Typography>
                <Typography color="text.secondary">@</Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {game.homeTeam} {game.homeScore ?? ""}
                </Typography>
                <TeamLogo src={game.homeLogo} alt={game.homeTeam} size={24} />
              </Stack>
              <Box sx={{ flex: 1 }}>
                <StatusLine game={game} />
              </Box>
              {game.manualResult && <Chip size="small" color="warning" label="Manual result" />}
              <Button size="small" startIcon={<FontAwesomeIcon icon={faPen} />} onClick={() => setEditing(game)}>
                Result
              </Button>
            </Stack>
          </Card>
        ))}
      </Stack>

      {editing && (
        <ResultDialog
          game={editing}
          onClose={() => setEditing(null)}
          onSaved={(game) => {
            replace(game);
            setEditing(null);
          }}
        />
      )}
    </>
  );
};

const STATUSES: { value: GameStatus; label: string }[] = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "LIVE", label: "Live" },
  { value: "FINAL", label: "Final" },
  { value: "CANCELED", label: "Postponed / canceled" },
];

function ResultDialog({ game, onClose, onSaved }: { game: Game; onClose: () => void; onSaved: (game: Game) => void }) {
  const [status, setStatus] = useState<GameStatus>(game.status);
  const [home, setHome] = useState(game.homeScore === null ? "" : String(game.homeScore));
  const [away, setAway] = useState(game.awayScore === null ? "" : String(game.awayScore));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsScores = status === "FINAL" || status === "LIVE";
  const valid = !needsScores || (home !== "" && away !== "");

  const save = async () => {
    try {
      setBusy(true);
      setError(null);
      const { game: updated } = await api.setResult(game.id, {
        status,
        homeScore: home === "" ? null : Number(home),
        awayScore: away === "" ? null : Number(away),
      });
      onSaved(updated);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const release = async () => {
    try {
      setBusy(true);
      setError(null);
      onSaved((await api.releaseResult(game.id)).game);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const digits = (value: string) => value.replace(/\D/g, "").slice(0, 2);

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {game.awayTeam} @ {game.homeTeam}
      </DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Saving here pins the result: ESPN syncs stop touching this game's score and status until you hand it back.
          Everyone's points recalculate straight away.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2}>
          <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value as GameStatus)}>
            {STATUSES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField
              label={`${game.awayTeam} (away)`}
              value={away}
              onChange={(e) => setAway(digits(e.target.value))}
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
              fullWidth
            />
            <TextField
              label={`${game.homeTeam} (home)`}
              value={home}
              onChange={(e) => setHome(digits(e.target.value))}
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
              fullWidth
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        {game.manualResult && (
          <Button disabled={busy} onClick={release} sx={{ mr: "auto" }}>
            Hand back to ESPN
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy || !valid} onClick={save}>
          Save result
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AdminGames;
