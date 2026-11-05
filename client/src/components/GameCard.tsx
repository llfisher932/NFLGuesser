import type { ReactNode } from "react";
import { Box, Card, Chip, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import { kickoffLabel, timeUntil } from "../utils/api";
import type { Game, Pick, Points } from "../utils/types";

export type Draft = { home: string; away: string };

type GameCardProps = {
  game: Game;
  /** The pick as saved. Shown when not editing. */
  pick: Pick | null;
  /** Present when the pick can be edited: the numbers in the boxes. */
  draft?: Draft;
  onDraftChange?: (draft: Draft) => void;
  /** Highlights the card while it has unsaved changes. */
  dirty?: boolean;
  pickLabel?: string;
  footer?: ReactNode;
};

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
        label={`${points.total} pts${points.final ? "" : "*"}`}
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

const scoreInput = {
  width: 64,
  "& input": { textAlign: "center", fontWeight: 700, fontSize: "1.1rem", py: 1 },
};

const GameCard = ({ game, pick, draft, onDraftChange, dirty, pickLabel = "Your pick", footer }: GameCardProps) => {
  const hasResult = game.homeScore !== null && game.awayScore !== null;
  const editing = draft !== undefined && onDraftChange !== undefined;

  const rows = [
    {
      side: "away" as const,
      team: game.awayTeam,
      name: game.awayName,
      logo: game.awayLogo,
      record: game.awayRecord,
      score: game.awayScore,
      picked: pick?.awayScore,
    },
    {
      side: "home" as const,
      team: game.homeTeam,
      name: game.homeName,
      logo: game.homeLogo,
      record: game.homeRecord,
      score: game.homeScore,
      picked: pick?.homeScore,
    },
  ];

  const winnerSide =
    hasResult && game.status === "FINAL" && game.homeScore !== game.awayScore
      ? game.homeScore! > game.awayScore!
        ? "home"
        : "away"
      : null;

  return (
    <Card
      variant="outlined"
      sx={{ p: 2, borderColor: dirty ? "primary.main" : "divider", borderWidth: dirty ? 2 : 1, m: dirty ? 0 : "1px" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5, gap: 1 }}>
        <StatusLine game={game} />
        {pick?.points && <PointsChip points={pick.points} />}
      </Stack>

      <Stack direction="row" sx={{ alignItems: "center", mb: 0.5 }}>
        <Box sx={{ flex: 1 }} />
        {hasResult && (
          <Typography variant="caption" color="text.secondary" sx={{ width: 48, textAlign: "center" }}>
            Score
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ width: 72, textAlign: "center" }}>
          {pickLabel}
        </Typography>
      </Stack>

      <Stack spacing={1}>
        {rows.map((row) => (
          <Stack key={row.side} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <TeamLogo src={row.logo} alt={row.team} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontWeight: winnerSide === row.side ? 700 : 600 }}>
                {row.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {row.side === "home" ? "Home" : "Away"}
                {row.record && ` · ${row.record}`}
              </Typography>
            </Box>

            {hasResult && (
              <Typography
                sx={{
                  width: 48,
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: "1.25rem",
                  opacity: winnerSide && winnerSide !== row.side ? 0.55 : 1,
                }}>
                {row.score}
              </Typography>
            )}

            <Box sx={{ width: 72, display: "flex", justifyContent: "center" }}>
              {editing ? (
                <TextField
                  size="small"
                  type="number"
                  value={draft[row.side]}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 2);
                    onDraftChange({ ...draft, [row.side]: value });
                  }}
                  onFocus={(e) => e.target.select()}
                  slotProps={{ htmlInput: { inputMode: "numeric", min: 0, max: 99, "aria-label": `${row.team} points` } }}
                  sx={scoreInput}
                />
              ) : (
                <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: row.picked === undefined ? "text.disabled" : "text.primary" }}>
                  {row.picked ?? "–"}
                </Typography>
              )}
            </Box>
          </Stack>
        ))}
      </Stack>

      {footer && <Box sx={{ mt: 1.5 }}>{footer}</Box>}
    </Card>
  );
};

export default GameCard;
