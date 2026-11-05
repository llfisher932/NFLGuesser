import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKey, faListCheck, faPen, faTrash, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { api } from "../../utils/api";
import type { AdminPanel, AdminUser, Week, WeekKey } from "../../utils/types";
import { useLoad, weekKey } from "../../utils/useLoad";
import ConfirmDialog from "../ConfirmDialog";
import PasswordReveal from "../PasswordReveal";
import PickSheet from "../PickSheet";
import WeekPicker from "../WeekPicker";

type AdminUsersProps = {
  panel: AdminPanel;
  selfId: number;
  onPanel: (panel: AdminPanel) => void;
  weeks: Week[];
  week: WeekKey | null;
};

const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

const AdminUsers = ({ panel, selfId, onPanel, weeks, week }: AdminUsersProps) => {
  const [editing, setEditing] = useState<AdminUser | "new" | null>(null);
  const [passwordFor, setPasswordFor] = useState<AdminUser | null>(null);
  const [picksFor, setPicksFor] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (!deleting) return;
    try {
      setBusy(true);
      onPanel(await api.deleteUser(deleting.id));
      setDeleting(null);
    } catch (err) {
      setError(errorText(err));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2 }}>
        <Typography color="text.secondary">
          Accounts are created here and nowhere else. New passwords are shown once.
        </Typography>
        <Button
          variant="contained"
          startIcon={<FontAwesomeIcon icon={faUserPlus} />}
          onClick={() => setEditing("new")}
          sx={{ flexShrink: 0 }}>
          Add user
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={1.5}>
        {panel.users.map((u) => (
          <Card key={u.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1.5, alignItems: { sm: "center" } }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 700 }}>{u.displayName}</Typography>
                  <Typography color="text.secondary">@{u.username}</Typography>
                  {u.isAdmin && <Chip size="small" color="primary" label="Admin" />}
                  {u.id === selfId && <Chip size="small" variant="outlined" label="You" />}
                </Stack>
                <Stack direction="row" sx={{ gap: 0.5, flexWrap: "wrap", mt: 0.75, alignItems: "center" }}>
                  {u.organizations.length === 0 ? (
                    <Typography variant="body2" color="text.disabled">
                      In no leagues
                    </Typography>
                  ) : (
                    u.organizations.map((o) => <Chip key={o.id} size="small" variant="outlined" label={o.name} />)
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    {u.predictionCount} picks
                  </Typography>
                </Stack>
              </Box>
              <Stack direction="row" sx={{ gap: 0.5, flexWrap: "wrap" }}>
                <Button size="small" startIcon={<FontAwesomeIcon icon={faPen} />} onClick={() => setEditing(u)}>
                  Edit
                </Button>
                <Button size="small" startIcon={<FontAwesomeIcon icon={faKey} />} onClick={() => setPasswordFor(u)}>
                  Password
                </Button>
                <Button size="small" startIcon={<FontAwesomeIcon icon={faListCheck} />} onClick={() => setPicksFor(u)}>
                  Picks
                </Button>
                <Button
                  size="small"
                  color="error"
                  disabled={u.id === selfId}
                  startIcon={<FontAwesomeIcon icon={faTrash} />}
                  onClick={() => setDeleting(u)}>
                  Delete
                </Button>
              </Stack>
            </Stack>
          </Card>
        ))}
      </Stack>

      {editing !== null && (
        <UserDialog
          user={editing === "new" ? null : editing}
          selfId={selfId}
          panel={panel}
          onClose={() => setEditing(null)}
          onSaved={(next, created) => {
            onPanel(next);
            setEditing(null);
            if (created) setCredentials(created);
          }}
        />
      )}

      {passwordFor && (
        <PasswordDialog
          user={passwordFor}
          onClose={() => setPasswordFor(null)}
          onSet={(password) => {
            setCredentials({ username: passwordFor.username, password });
            setPasswordFor(null);
          }}
        />
      )}

      {picksFor && <PicksDialog user={picksFor} weeks={weeks} week={week} onClose={() => setPicksFor(null)} />}

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.displayName}?`}
        message="Their account and every pick they've made are removed for good. This can't be undone."
        confirmLabel="Delete"
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />

      <PasswordReveal credentials={credentials} onClose={() => setCredentials(null)} />
    </>
  );
};

type UserDialogProps = {
  user: AdminUser | null;
  selfId: number;
  panel: AdminPanel;
  onClose: () => void;
  onSaved: (panel: AdminPanel, created?: { username: string; password: string }) => void;
};

function UserDialog({ user, selfId, panel, onClose, onSaved }: UserDialogProps) {
  const [username, setUsername] = useState(user?.username ?? "");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [isAdmin, setIsAdmin] = useState(user?.isAdmin ?? false);
  const [orgIds, setOrgIds] = useState<number[]>(user?.organizations.map((o) => o.id) ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleOrg = (id: number) => setOrgIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const save = async () => {
    try {
      setBusy(true);
      setError(null);
      if (user) {
        onSaved(await api.updateUser(user.id, { username, displayName, isAdmin, organizationIds: orgIds }));
      } else {
        const result = await api.createUser({ username, displayName, isAdmin, organizationIds: orgIds });
        onSaved(result, { username: result.username, password: result.password });
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{user ? `Edit ${user.displayName}` : "Add user"}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            helperText="What they sign in with. 3–24 letters, digits, . - _"
            autoFocus={!user}
          />
          <TextField
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            helperText="What everyone sees on the leaderboard"
          />
          <FormControlLabel
            control={
              <Switch
                checked={isAdmin}
                disabled={user?.id === selfId}
                onChange={(e) => setIsAdmin(e.target.checked)}
              />
            }
            label="Admin (full control, like you)"
          />
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Leagues
            </Typography>
            {panel.organizations.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No leagues yet. Create one on the Leagues tab.
              </Typography>
            ) : (
              <FormGroup>
                {panel.organizations.map((org) => (
                  <FormControlLabel
                    key={org.id}
                    control={<Checkbox checked={orgIds.includes(org.id)} onChange={() => toggleOrg(org.id)} />}
                    label={org.name}
                  />
                ))}
              </FormGroup>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={busy || username.trim() === "" || displayName.trim() === ""}
          onClick={save}>
          {user ? "Save" : "Create and get password"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type PasswordDialogProps = {
  user: AdminUser;
  onClose: () => void;
  onSet: (password: string) => void;
};

function PasswordDialog({ user, onClose, onSet }: PasswordDialogProps) {
  const [mode, setMode] = useState<"generate" | "choose">("generate");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    try {
      setBusy(true);
      setError(null);
      const result = await api.setUserPassword(user.id, mode === "choose" ? password : undefined);
      onSet(result.password);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Reset {user.displayName}'s password</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Their old password stops working and they're signed out everywhere.
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={mode}
          onChange={(_, next) => next && setMode(next)}
          sx={{ mb: 2 }}>
          <ToggleButton value="generate">Generate one</ToggleButton>
          <ToggleButton value="choose">Set it myself</ToggleButton>
        </ToggleButtonGroup>
        {mode === "choose" && (
          <TextField
            fullWidth
            label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="At least 8 characters"
            autoComplete="off"
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy || (mode === "choose" && password.length < 8)} onClick={save}>
          Reset password
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type PicksDialogProps = {
  user: AdminUser;
  weeks: Week[];
  week: WeekKey | null;
  onClose: () => void;
};

/** Edit anyone's picks for any week, kicked off or not. */
function PicksDialog({ user, weeks, week: initialWeek, onClose }: PicksDialogProps) {
  const [week, setWeek] = useState(initialWeek);
  const { data: loaded, error } = useLoad(`${user.id}:${weekKey(week)}`, () => api.userGames(user.id, week));

  return (
    <Dialog open onClose={onClose} fullScreen>
      <DialogTitle>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, gap: 1 }}>
          <span>{user.displayName}'s picks</span>
          <WeekPicker weeks={weeks} week={week} onChange={setWeek} />
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          As admin you can change picks on games that have already kicked off. Clear both boxes to delete a pick.
        </Alert>
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
            ignoreLock
            pickLabel="Their pick"
            onSave={(gameId, home, away) => api.setUserPick(user.id, gameId, home, away)}
            onClear={(gameId) => api.clearUserPick(user.id, gameId)}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AdminUsers;
