import { useCallback, useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Container } from "@mui/material";
import { api } from "./utils/api";
import type { Self, View, Week, WeekKey } from "./utils/types";
import { currentView, pathOf } from "./utils/routes";
import NavBar from "./components/NavBar";
import Login from "./views/Login";
import Picks from "./views/Picks";
import OrgView from "./views/OrgView";
import Account from "./views/Account";
import Rules from "./views/Rules";
import Admin from "./views/Admin";

function App() {
  const [user, setUser] = useState<Self | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  // The URL is the view. Navigating pushes an entry, and the back button feeds one back.
  const [view, setView] = useState<View>(currentView);

  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [weeksError, setWeeksError] = useState<string | null>(null);
  // The week being looked at, shared across pages so flipping from your picks
  // to a leaderboard stays on the same week. Starts at the current week.
  const [week, setWeek] = useState<WeekKey | null>(null);

  const navigate = useCallback((next: View) => {
    const path = pathOf(next);
    if (path !== window.location.pathname) window.history.pushState(null, "", path);
    setView(next);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onPop = () => setView(currentView());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const signedInId = user?.id;

  // Org memberships and admin rights can change while you browse, so re-read
  // yourself on every navigation.
  useEffect(() => {
    let cancelled = false;

    api
      .me()
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [view]);

  useEffect(() => {
    if (signedInId === undefined) return;
    let cancelled = false;

    api
      .weeks()
      .then((data) => {
        if (cancelled) return;
        setWeeks(data.weeks);
        setWeek((chosen) => chosen ?? data.current);
      })
      .catch((err) => {
        if (!cancelled) setWeeksError(err instanceof Error ? err.message : "Couldn't load the schedule");
      });

    return () => {
      cancelled = true;
    };
  }, [signedInId]);

  const signOut = async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    setWeeks(null);
    setWeek(null);
    navigate({ name: "picks" });
  };

  if (isChecking) {
    return (
      <Box sx={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Login onSignedIn={setUser} />;
  }

  const weekProps = { weeks: weeks ?? [], week, onWeekChange: setWeek };

  let page;

  if (weeksError) {
    page = (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{weeksError}</Alert>
      </Container>
    );
  } else if (!weeks) {
    page = (
      <Box sx={{ display: "flex", py: 10, justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  } else if (view.name === "picks") {
    page = <Picks {...weekProps} />;
  } else if (view.name === "org") {
    page = (
      <OrgView
        key={view.orgId}
        user={user}
        orgId={view.orgId}
        tab={view.tab}
        onTabChange={(tab) => navigate({ name: "org", orgId: view.orgId, tab })}
        {...weekProps}
      />
    );
  } else if (view.name === "account") {
    page = <Account user={user} />;
  } else if (view.name === "rules") {
    page = <Rules />;
  } else if (user.isAdmin) {
    page = (
      <Admin user={user} tab={view.tab} onTabChange={(tab) => navigate({ name: "admin", tab })} {...weekProps} />
    );
  } else {
    page = <Picks {...weekProps} />;
  }

  return (
    <Box sx={{ minHeight: "100vh", pb: 6 }}>
      <NavBar user={user} view={view} onNavigate={navigate} onSignOut={signOut} />
      {page}
    </Box>
  );
}

export default App;
