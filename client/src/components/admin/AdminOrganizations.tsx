import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faPen, faPlus, faRotate, faTrash, faUsers } from "@fortawesome/free-solid-svg-icons";
import { api } from "../../utils/api";
import type { AdminOrg, AdminPanel } from "../../utils/types";
import ConfirmDialog from "../ConfirmDialog";

type AdminOrganizationsProps = {
  panel: AdminPanel;
  onPanel: (panel: AdminPanel) => void;
};

const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

type Pending = { kind: "delete" | "code"; org: AdminOrg };

const AdminOrganizations = ({ panel, onPanel }: AdminOrganizationsProps) => {
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<AdminOrg | null>(null);
  const [managing, setManaging] = useState<AdminOrg | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const run = async (action: () => Promise<AdminPanel>) => {
    try {
      setBusy(true);
      setError(null);
      onPanel(await action());
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (await run(() => api.createOrganization(newName))) setNewName("");
  };

  const confirmPending = async () => {
    if (!pending) return;
    const { kind, org } = pending;
    await run(() => (kind === "delete" ? api.deleteOrganization(org.id) : api.regenerateOrgCode(org.id)));
    setPending(null);
  };

  const copy = async (org: AdminOrg) => {
    try {
      await navigator.clipboard.writeText(org.code);
      setCopiedId(org.id);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <>
      <Card variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          New league
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <TextField
            size="small"
            fullWidth
            label="Name"
            placeholder="Work, Family, The Boys…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim() !== "") create();
            }}
          />
          <Button
            variant="contained"
            disabled={busy || newName.trim() === ""}
            onClick={create}
            startIcon={<FontAwesomeIcon icon={faPlus} />}
            sx={{ flexShrink: 0 }}>
            Create
          </Button>
        </Stack>
      </Card>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {panel.organizations.length === 0 && <Typography color="text.secondary">No leagues yet.</Typography>}

      <Stack spacing={1.5}>
        {panel.organizations.map((org) => (
          <Card key={org.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1.5, alignItems: { sm: "center" } }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }}>{org.name}</Typography>
                <Stack direction="row" sx={{ alignItems: "center", gap: 1, mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {org.memberCount} {org.memberCount === 1 ? "member" : "members"} · ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: "ui-monospace, Consolas, monospace" }}>
                    {org.code}
                  </Typography>
                  <Tooltip title={copiedId === org.id ? "Copied" : "Copy ID"}>
                    <IconButton size="small" onClick={() => copy(org)}>
                      <FontAwesomeIcon icon={faCopy} size="xs" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
              <Stack direction="row" sx={{ gap: 0.5, flexWrap: "wrap" }}>
                <Button size="small" startIcon={<FontAwesomeIcon icon={faUsers} />} onClick={() => setManaging(org)}>
                  Members
                </Button>
                <Button size="small" startIcon={<FontAwesomeIcon icon={faPen} />} onClick={() => setRenaming(org)}>
                  Rename
                </Button>
                <Button
                  size="small"
                  startIcon={<FontAwesomeIcon icon={faRotate} />}
                  onClick={() => setPending({ kind: "code", org })}>
                  New ID
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<FontAwesomeIcon icon={faTrash} />}
                  onClick={() => setPending({ kind: "delete", org })}>
                  Delete
                </Button>
              </Stack>
            </Stack>
          </Card>
        ))}
      </Stack>

      {renaming && (
        <RenameDialog
          org={renaming}
          busy={busy}
          onClose={() => setRenaming(null)}
          onSave={async (name) => {
            if (await run(() => api.renameOrganization(renaming.id, name))) setRenaming(null);
          }}
        />
      )}

      {managing && (
        <MembersDialog
          org={panel.organizations.find((o) => o.id === managing.id) ?? managing}
          panel={panel}
          busy={busy}
          onToggle={(userId, isIn) =>
            run(() => (isIn ? api.removeMember(managing.id, userId) : api.addMember(managing.id, userId)))
          }
          onClose={() => setManaging(null)}
        />
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === "delete" ? `Delete ${pending.org.name}?` : `New ID for ${pending?.org.name}?`}
        message={
          pending?.kind === "delete"
            ? "The league and its leaderboard go away. Its members keep their accounts and picks, and stay in any other leagues."
            : "The old ID stops identifying this league. Nothing else changes."
        }
        confirmLabel={pending?.kind === "delete" ? "Delete" : "Generate"}
        busy={busy}
        onConfirm={confirmPending}
        onClose={() => setPending(null)}
      />
    </>
  );
};

function RenameDialog({
  org,
  busy,
  onClose,
  onSave,
}: {
  org: AdminOrg;
  busy: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(org.name);

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Rename league</DialogTitle>
      <DialogContent>
        <TextField fullWidth autoFocus label="Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 1 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy || name.trim() === ""} onClick={() => onSave(name)}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function MembersDialog({
  org,
  panel,
  busy,
  onToggle,
  onClose,
}: {
  org: AdminOrg;
  panel: AdminPanel;
  busy: boolean;
  onToggle: (userId: number, isIn: boolean) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {org.name} · {org.memberCount} {org.memberCount === 1 ? "member" : "members"}
      </DialogTitle>
      <DialogContent sx={{ px: 1 }}>
        <List dense>
          {panel.users.map((u) => {
            const isIn = u.organizations.some((o) => o.id === org.id);
            return (
              <ListItem key={u.id} disablePadding>
                <ListItemButton disabled={busy} onClick={() => onToggle(u.id, isIn)}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Checkbox edge="start" checked={isIn} tabIndex={-1} disableRipple />
                  </ListItemIcon>
                  <ListItemText primary={u.displayName} secondary={`@${u.username}`} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AdminOrganizations;
