import { useState, type FormEvent } from "react";
import { Alert, Box, Button, Card, Chip, Container, Stack, TextField, Typography } from "@mui/material";
import { api } from "../utils/api";
import type { Self } from "../utils/types";

const MIN_LENGTH = 8;

const Account = ({ user }: { user: Self }) => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const mismatch = confirm !== "" && next !== confirm;
  const canSubmit = current !== "" && next.length >= MIN_LENGTH && next === confirm && !isSaving;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setIsSaving(true);
      setResult(null);
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setResult({ ok: true, message: "Password changed. Any other devices you were signed in on are signed out." });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Couldn't change your password" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Account
      </Typography>

      <Card variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>{user.displayName}</Typography>
        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
          @{user.username}
          {user.isAdmin && " · admin"}
        </Typography>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Your leagues
        </Typography>
        {user.organizations.length === 0 ? (
          <Typography color="text.secondary">You haven't been added to a league yet.</Typography>
        ) : (
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
            {user.organizations.map((org) => (
              <Chip key={org.id} label={org.name} />
            ))}
          </Stack>
        )}
      </Card>

      <Card variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Change password
        </Typography>

        {result && (
          <Alert severity={result.ok ? "success" : "error"} sx={{ mb: 2 }}>
            {result.message}
          </Alert>
        )}

        <Box component="form" onSubmit={submit}>
          {/* Lets password managers file the new password under the right account. */}
          <input type="text" name="username" autoComplete="username" value={user.username} readOnly hidden />
          <Stack spacing={2}>
            <TextField
              type="password"
              label="Current password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
            <TextField
              type="password"
              label="New password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              helperText={`At least ${MIN_LENGTH} characters`}
              error={next !== "" && next.length < MIN_LENGTH}
            />
            <TextField
              type="password"
              label="Confirm new password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={mismatch}
              helperText={mismatch ? "Doesn't match" : " "}
            />
            <Button type="submit" variant="contained" disabled={!canSubmit}>
              {isSaving ? "Saving…" : "Change password"}
            </Button>
          </Stack>
        </Box>
      </Card>
    </Container>
  );
};

export default Account;
