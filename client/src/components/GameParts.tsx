import { Box, Chip, Tooltip, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import { kickoffLabel, timeUntil } from "../utils/api";
import type { Game, Points } from "../utils/types";

/** Small pieces of a game shared by the pick rows, the league grid and the admin list. */

export function StatusLine({ game }: { game: Game }) {
  if (game.status === "LIVE") {
    return <Chip size="small" color="error" label={`LIVE · ${game.statusDetail ?? "In progress"}`} />;
  }
  if (game.status === "FINAL") {
    return <Chip size="small" variant="outlined" label={game.statusDetail ?? "Final"} />;
  }
  if (game.status === "CANCELED") {
    return <Chip size="small" color="warning" variant="outlined" label="Postponed / canceled" />;
  }

  return (
    <Typography variant="body2" color="text.secondary">
      {kickoffLabel(game.kickoff)}
      {game.locked ? (
        <Box component="span" sx={{ ml: 1 }}>
          <FontAwesomeIcon icon={faLock} size="xs" /> Locked
        </Box>
      ) : (
        <Box component="span" sx={{ ml: 1, color: "primary.main", fontWeight: 600 }}>
          locks in {timeUntil(game.kickoff)}
        </Box>
      )}
    </Typography>
  );
}

export function PointsChip({ points }: { points: Points }) {
  const detail = `Winner ${points.winner} · Home ${points.homeScore} · Away ${points.awayScore} · Margin ${points.differential}`;
  return (
    <Tooltip title={points.final ? detail : `${detail} (if it ends like this)`}>
      <Chip
        size="small"
        color={points.final ? "primary" : "default"}
        variant={points.final ? "filled" : "outlined"}
        label={`${points.total} ${points.total === 1 ? "pt" : "pts"}${points.final ? "" : "*"}`}
      />
    </Tooltip>
  );
}

export function TeamLogo({ src, alt, size = 32 }: { src: string | null; alt: string; size?: number }) {
  return src ? (
    <Box component="img" src={src} alt={alt} sx={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />
  ) : (
    <Box sx={{ width: size, height: size, flexShrink: 0 }} />
  );
}
