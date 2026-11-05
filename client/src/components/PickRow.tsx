import type { ReactNode } from "react";
import { Box, Button, Collapse, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faLock } from "@fortawesome/free-solid-svg-icons";
import { kickoffLabel } from "../utils/api";
import type { Game, Pick } from "../utils/types";
import { PointsChip, StatusLine, TeamLogo } from "./GameParts";

export type Draft = { home: string; away: string };

type PickRowProps = {
  game: Game;
  /** The pick as saved. */
  pick: Pick | null;
  /** Present when the pick can be edited: the numbers in the boxes. */
  draft?: Draft;
  onDraftChange?: (draft: Draft) => void;
  /** Marks the row while it has unsaved changes. */
  dirty?: boolean;
  expanded: boolean;
  onToggle: () => void;
  /** "Your pick", or "Their pick" when the admin is editing someone else's. */
  pickLabel: string;
};

/**
 * One game on one line: away team, the two score boxes, home team, and how the
 * pick is doing. Tapping the row (anywhere but a box) opens the details.
 */
const PickRow = ({ game, pick, draft, onDraftChange, dirty, expanded, onToggle, pickLabel }: PickRowProps) => {
  const editing = draft !== undefined && onDraftChange !== undefined;
  const hasResult = game.homeScore !== null && game.awayScore !== null;

  const scoreCell = (side: "away" | "home") => {
    const team = side === "home" ? game.homeTeam : game.awayTeam;

    if (editing) {
      return (
        <TextField
          size="small"
          type="number"
          value={draft[side]}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onDraftChange({ ...draft, [side]: e.target.value.replace(/\D/g, "").slice(0, 2) })}
          onFocus={(e) => e.target.select()}
          slotProps={{ htmlInput: { inputMode: "numeric", min: 0, max: 99, "aria-label": `${team} points` } }}
          sx={{ width: { xs: 42, sm: 56 }, "& input": { textAlign: "center", fontWeight: 700, py: 0.75, px: 0.5 } }}
        />
      );
    }

    const value = side === "home" ? pick?.homeScore : pick?.awayScore;
    return (
      <Typography
        sx={{
          width: { xs: 42, sm: 56 },
          textAlign: "center",
          fontWeight: 700,
          color: value === undefined ? "text.disabled" : "text.primary",
        }}>
        {value ?? "–"}
      </Typography>
    );
  };

  const teamCell = (side: "away" | "home") => {
    const isHome = side === "home";
    const abbr = isHome ? game.homeTeam : game.awayTeam;
    const name = isHome ? game.homeName : game.awayName;
    const logo = isHome ? game.homeLogo : game.awayLogo;
    // The logo sits next to the score box on both sides, so the row reads
    // outward from the middle: JAX [17] @ [24] BAL.
    return (
      <Stack
        direction={isHome ? "row" : "row-reverse"}
        sx={{ alignItems: "center", gap: { xs: 0.5, sm: 1 }, minWidth: 0, justifyContent: "flex-start" }}>
        <TeamLogo src={logo} alt={abbr} size={22} />
        <Typography noWrap sx={{ fontWeight: 600, display: { xs: "block", md: "none" } }}>
          {abbr}
        </Typography>
        <Typography noWrap sx={{ fontWeight: 600, display: { xs: "none", md: "block" } }}>
          {name}
        </Typography>
      </Stack>
    );
  };

  let outcome: ReactNode = null;
  if (pick?.points) outcome = <PointsChip points={pick.points} />;
  else if (game.status === "LIVE") outcome = <Typography variant="caption" sx={{ color: "error.main", fontWeight: 700 }}>LIVE</Typography>;
  else if (game.status === "CANCELED") outcome = <Typography variant="caption" color="text.secondary">Off</Typography>;
  else if (game.locked) outcome = <Box sx={{ color: "text.disabled" }}><FontAwesomeIcon icon={faLock} size="sm" /></Box>;

  return (
    <Box
      sx={(theme) => ({
        borderLeft: 3,
        borderColor: dirty ? "primary.main" : "transparent",
        bgcolor: dirty ? alpha(theme.palette.primary.main, 0.04) : "transparent",
      })}>
      <Box
        onClick={onToggle}
        role="button"
        aria-expanded={expanded}
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr) auto auto auto minmax(0, 1fr) auto 10px", sm: "minmax(0, 1fr) auto auto auto minmax(0, 1fr) auto 16px" },
          alignItems: "center",
          columnGap: { xs: 0.5, sm: 1.5 },
          px: { xs: 1, sm: 2 },
          py: 1,
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
        }}>
        {teamCell("away")}
        {scoreCell("away")}
        <Typography color="text.secondary" sx={{ fontSize: "0.85rem" }}>
          @
        </Typography>
        {scoreCell("home")}
        {teamCell("home")}

        <Stack direction="row" sx={{ alignItems: "center", gap: 1.5, justifyContent: "flex-end", minWidth: { xs: 0, sm: 120 } }}>
          {hasResult && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: { xs: "none", sm: "block" }, whiteSpace: "nowrap" }}>
              {game.awayScore}–{game.homeScore}
            </Typography>
          )}
          {outcome}
        </Stack>

        <Box
          sx={{
            color: "text.secondary",
            display: "flex",
            justifyContent: "center",
            transition: "transform 150ms",
            transform: expanded ? "rotate(180deg)" : "none",
          }}>
          <FontAwesomeIcon icon={faChevronDown} size="xs" />
        </Box>
      </Box>

      <Collapse in={expanded} unmountOnExit>
        <Details game={game} pick={pick} pickLabel={pickLabel} {...(editing && { onClear: () => onDraftChange({ home: "", away: "" }) })} />
      </Collapse>
    </Box>
  );
};

function Details({
  game,
  pick,
  pickLabel,
  onClear,
}: {
  game: Game;
  pick: Pick | null;
  pickLabel: string;
  onClear?: () => void;
}) {
  const hasResult = game.homeScore !== null && game.awayScore !== null;
  const points = pick?.points;

  const breakdown = points && [
    { label: "Winner", value: points.winner },
    { label: `${game.awayTeam} score`, value: points.awayScore },
    { label: `${game.homeTeam} score`, value: points.homeScore },
    { label: "Differential", value: points.differential },
  ];

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2 },
        pb: 2,
        pt: 0.5,
        display: "grid",
        gap: { xs: 2, sm: 4 },
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
      }}>
      <Stack spacing={0.75}>
        <Typography variant="body2">
          <b>{game.awayName}</b>
          {game.awayRecord && <Box component="span" sx={{ color: "text.secondary" }}> ({game.awayRecord})</Box>} at{" "}
          <b>{game.homeName}</b>
          {game.homeRecord && <Box component="span" sx={{ color: "text.secondary" }}> ({game.homeRecord})</Box>}
        </Typography>
        <Box>
          <StatusLine game={game} />
        </Box>
        {game.status !== "SCHEDULED" && (
          <Typography variant="body2" color="text.secondary">
            Kicked off {kickoffLabel(game.kickoff)}
          </Typography>
        )}
        {hasResult && (
          <Typography variant="body2">
            {game.status === "FINAL" ? "Final" : "Current"} score: {game.awayTeam} {game.awayScore}, {game.homeTeam}{" "}
            {game.homeScore}
          </Typography>
        )}
        <Typography variant="body2">
          {pickLabel}:{" "}
          {pick ? (
            <>
              {game.awayTeam} {pick.awayScore}, {game.homeTeam} {pick.homeScore}
              <Box component="span" sx={{ color: "text.secondary" }}>
                {" "}
                · saved {new Date(pick.updatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </Box>
            </>
          ) : (
            <Box component="span" sx={{ color: "text.secondary" }}>
              none yet
            </Box>
          )}
        </Typography>
        {onClear && pick && (
          <Box>
            <Button size="small" color="inherit" onClick={onClear} sx={{ color: "text.secondary", px: 0 }}>
              Clear this pick
            </Button>
          </Box>
        )}
      </Stack>

      <Box>
        {breakdown ? (
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
            {breakdown.map((row) => (
              <Stack
                key={row.label}
                direction="row"
                sx={{ justifyContent: "space-between", px: 1.5, py: 0.5, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="body2">{row.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {row.value} / 10
                </Typography>
              </Stack>
            ))}
            <Stack direction="row" sx={{ justifyContent: "space-between", px: 1.5, py: 0.75, bgcolor: "action.hover" }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Total{points.final ? "" : " if it ends like this"}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {points.total} / 40
              </Typography>
            </Stack>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {game.status === "CANCELED"
              ? "This game won't be scored."
              : pick
                ? "Points show up here once the game starts."
                : game.locked
                  ? "No pick was made before kickoff."
                  : "Enter both scores and save to lock in a pick."}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default PickRow;
