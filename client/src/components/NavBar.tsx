import { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faBookOpen,
  faChevronDown,
  faFootball,
  faListCheck,
  faMoon,
  faRankingStar,
  faRightFromBracket,
  faSun,
  faUser,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import { useColorMode } from "../utils/colorModeContext";
import type { Self, View } from "../utils/types";

type NavBarProps = {
  user: Self;
  view: View;
  onNavigate: (view: View) => void;
  onSignOut: () => void;
};

const NavBar = ({ user, view, onNavigate, onSignOut }: NavBarProps) => {
  const { mode, toggle } = useColorMode();
  const [orgMenu, setOrgMenu] = useState<HTMLElement | null>(null);
  const [mainMenu, setMainMenu] = useState<HTMLElement | null>(null);

  const go = (next: View) => {
    setOrgMenu(null);
    setMainMenu(null);
    onNavigate(next);
  };

  const orgs = user.organizations;
  const activeOrg = view.name === "org" ? orgs.find((o) => o.id === view.orgId) : undefined;
  const navButton = (active: boolean) => ({
    color: active ? "primary.main" : "text.secondary",
    bgcolor: active ? "action.selected" : "transparent",
  });

  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Container maxWidth="lg" disableGutters>
        <Toolbar sx={{ gap: 1 }}>
          <Box
            component="button"
            onClick={() => go({ name: "picks" })}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              border: 0,
              bgcolor: "transparent",
              color: "inherit",
              cursor: "pointer",
              p: 0,
              mr: 2,
            }}>
            <Box component="span" sx={{ color: "secondary.main", display: "flex" }}>
              <FontAwesomeIcon icon={faFootball} size="lg" />
            </Box>
            <Typography variant="h6" component="span">
              Pick 'Em
            </Typography>
          </Box>

          <Box sx={{ display: { xs: "none", md: "flex" }, gap: 0.5, flex: 1 }}>
            <Button
              startIcon={<FontAwesomeIcon icon={faListCheck} />}
              sx={navButton(view.name === "picks")}
              onClick={() => go({ name: "picks" })}>
              My picks
            </Button>

            {orgs.length === 1 && (
              <Button
                startIcon={<FontAwesomeIcon icon={faRankingStar} />}
                sx={navButton(view.name === "org")}
                onClick={() => go({ name: "org", orgId: orgs[0]!.id, tab: "standings" })}>
                {orgs[0]!.name}
              </Button>
            )}

            {orgs.length > 1 && (
              <Button
                startIcon={<FontAwesomeIcon icon={faRankingStar} />}
                endIcon={<FontAwesomeIcon icon={faChevronDown} size="xs" />}
                sx={navButton(view.name === "org")}
                onClick={(e) => setOrgMenu(e.currentTarget)}>
                {activeOrg?.name ?? "Leagues"}
              </Button>
            )}

            <Button
              startIcon={<FontAwesomeIcon icon={faBookOpen} />}
              sx={navButton(view.name === "rules")}
              onClick={() => go({ name: "rules" })}>
              Scoring
            </Button>

            {user.isAdmin && (
              <Button
                startIcon={<FontAwesomeIcon icon={faUserShield} />}
                sx={navButton(view.name === "admin")}
                onClick={() => go({ name: "admin", tab: "users" })}>
                Admin
              </Button>
            )}
          </Box>

          <Box sx={{ flex: { xs: 1, md: 0 } }} />

          <Button
            color="inherit"
            onClick={(e) => setMainMenu(e.currentTarget)}
            endIcon={<FontAwesomeIcon icon={faChevronDown} size="xs" />}
            sx={{ display: { xs: "none", md: "inline-flex" }, color: "text.secondary" }}>
            {user.displayName}
          </Button>
          <IconButton
            onClick={(e) => setMainMenu(e.currentTarget)}
            sx={{ display: { md: "none" } }}
            aria-label="Menu">
            <FontAwesomeIcon icon={faBars} />
          </IconButton>
        </Toolbar>
      </Container>

      <Menu anchorEl={orgMenu} open={orgMenu !== null} onClose={() => setOrgMenu(null)}>
        {orgs.map((org) => (
          <MenuItem
            key={org.id}
            selected={org.id === activeOrg?.id}
            onClick={() => go({ name: "org", orgId: org.id, tab: "standings" })}>
            {org.name}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={mainMenu}
        open={mainMenu !== null}
        onClose={() => setMainMenu(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}>
        <Box sx={{ display: { md: "none" } }}>
          <MenuItem onClick={() => go({ name: "picks" })}>
            <ListItemIcon>
              <FontAwesomeIcon icon={faListCheck} />
            </ListItemIcon>
            <ListItemText>My picks</ListItemText>
          </MenuItem>
          {orgs.length > 0 && <ListSubheader sx={{ lineHeight: "32px" }}>Leagues</ListSubheader>}
          {orgs.map((org) => (
            <MenuItem key={org.id} onClick={() => go({ name: "org", orgId: org.id, tab: "standings" })}>
              <ListItemIcon>
                <FontAwesomeIcon icon={faRankingStar} />
              </ListItemIcon>
              <ListItemText>{org.name}</ListItemText>
            </MenuItem>
          ))}
          <MenuItem onClick={() => go({ name: "rules" })}>
            <ListItemIcon>
              <FontAwesomeIcon icon={faBookOpen} />
            </ListItemIcon>
            <ListItemText>Scoring</ListItemText>
          </MenuItem>
          {user.isAdmin && (
            <MenuItem onClick={() => go({ name: "admin", tab: "users" })}>
              <ListItemIcon>
                <FontAwesomeIcon icon={faUserShield} />
              </ListItemIcon>
              <ListItemText>Admin</ListItemText>
            </MenuItem>
          )}
          <Divider />
        </Box>
        <MenuItem onClick={() => go({ name: "account" })}>
          <ListItemIcon>
            <FontAwesomeIcon icon={faUser} />
          </ListItemIcon>
          <ListItemText primary="Account" secondary={`@${user.username}`} />
        </MenuItem>
        <MenuItem onClick={toggle}>
          <ListItemIcon>
            <FontAwesomeIcon icon={mode === "light" ? faMoon : faSun} />
          </ListItemIcon>
          <ListItemText>{mode === "light" ? "Dark mode" : "Light mode"}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMainMenu(null);
            onSignOut();
          }}>
          <ListItemIcon>
            <FontAwesomeIcon icon={faRightFromBracket} />
          </ListItemIcon>
          <ListItemText>Sign out</ListItemText>
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default NavBar;
