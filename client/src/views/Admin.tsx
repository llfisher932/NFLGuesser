import { useCallback, useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Container, Tab, Tabs, Typography } from "@mui/material";
import { api } from "../utils/api";
import type { AdminPanel, AdminTab, Self, Week, WeekKey } from "../utils/types";
import AdminUsers from "../components/admin/AdminUsers";
import AdminOrganizations from "../components/admin/AdminOrganizations";
import AdminGames from "../components/admin/AdminGames";

type AdminProps = {
  user: Self;
  tab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  weeks: Week[];
  week: WeekKey | null;
  onWeekChange: (week: WeekKey) => void;
};

/**
 * Everything the admin can do. Every mutation returns the whole panel (users
 * and orgs), which simply replaces what's shown, so nothing here goes stale.
 */
const Admin = ({ user, tab, onTabChange, weeks, week, onWeekChange }: AdminProps) => {
  const [panel, setPanel] = useState<AdminPanel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .adminPanel()
      .then((data) => {
        if (!cancelled) setPanel(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load the admin panel");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const onPanel = useCallback((next: AdminPanel) => setPanel({ users: next.users, organizations: next.organizations }), []);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Admin
      </Typography>

      <Tabs value={tab} onChange={(_, next: AdminTab) => onTabChange(next)} sx={{ mb: 3 }}>
        <Tab value="users" label={panel ? `Users (${panel.users.length})` : "Users"} />
        <Tab value="organizations" label={panel ? `Leagues (${panel.organizations.length})` : "Leagues"} />
        <Tab value="games" label="Games" />
      </Tabs>

      {error && <Alert severity="error">{error}</Alert>}

      {!panel && !error && (
        <Box sx={{ display: "flex", py: 8, justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      )}

      {panel && tab === "users" && (
        <AdminUsers panel={panel} selfId={user.id} onPanel={onPanel} weeks={weeks} week={week} />
      )}
      {panel && tab === "organizations" && <AdminOrganizations panel={panel} onPanel={onPanel} />}
      {tab === "games" && <AdminGames weeks={weeks} week={week} onWeekChange={onWeekChange} />}
    </Container>
  );
};

export default Admin;
