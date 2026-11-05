import { useState, type FormEvent } from "react";
import { Alert, Box, Button, Container, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFootball, faMoon, faRightToBracket, faSun } from "@fortawesome/free-solid-svg-icons";
import { api } from "../utils/api";
import { useColorMode } from "../utils/colorModeContext";
import type { Self } from "../utils/types";

type LoginProps = {
  onSignedIn: (user: Self) => void;
};

const Login = ({ onSignedIn }: LoginProps) => {
  const { mode, toggle } = useColorMode();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    if (username.trim() === "" || password === "") return;

    try {
      setIsSubmitting(true);
      setError(null);
      const data = await api.login(username, password);
      onSignedIn(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 6, sm: 12 } }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
        <Box sx={{ color: "primary.main", display: "flex" }}>
          <FontAwesomeIcon icon={faFootball} size="2x" />
        </Box>
        <Typography variant="h4" sx={{ flex: 1 }}>
          Pick 'Em
        </Typography>
        <Tooltip title={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}>
          <IconButton onClick={toggle} size="small" sx={{ color: "text.secondary" }}>
            <FontAwesomeIcon icon={mode === "light" ? faMoon : faSun} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Invite only. Sign in with the username and password you were sent.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={signIn}>
        <Stack spacing={2}>
          <TextField
            label="Username"
            value={username}
            autoFocus
            autoComplete="username"
            autoCapitalize="none"
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            type="password"
            label="Password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting || username.trim() === "" || password === ""}
            startIcon={<FontAwesomeIcon icon={faRightToBracket} />}>
            {isSubmitting ? "Checking…" : "Sign in"}
          </Button>
        </Stack>
      </Box>
    </Container>
  );
};

export default Login;
