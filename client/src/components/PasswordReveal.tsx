import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";

type PasswordRevealProps = {
  /** Null keeps the dialog closed. */
  credentials: { username: string; password: string } | null;
  onClose: () => void;
};

/** Shows a new password the one time it exists in plain text. */
const PasswordReveal = ({ credentials, onClose }: PasswordRevealProps) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(`Username: ${credentials.username}\nPassword: ${credentials.password}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog
      open={credentials !== null}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ transition: { onExited: () => setCopied(false) } }}>
      <DialogTitle>Send these to them</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This is the only time the password is shown. It can't be looked up later, only reset.
        </Alert>
        {credentials && (
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                flex: 1,
                fontFamily: "ui-monospace, Consolas, monospace",
                bgcolor: "action.hover",
                borderRadius: 1,
                p: 1.5,
              }}>
              <Typography sx={{ fontFamily: "inherit" }}>username: {credentials.username}</Typography>
              <Typography sx={{ fontFamily: "inherit", fontWeight: 700 }}>password: {credentials.password}</Typography>
            </Box>
            <Tooltip title={copied ? "Copied" : "Copy both"}>
              <IconButton onClick={copy}>
                <FontAwesomeIcon icon={faCopy} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PasswordReveal;
