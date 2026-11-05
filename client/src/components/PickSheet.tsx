import { useState } from "react";
import { Alert, Box, Button, Card, Divider, Paper, Stack, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faLock } from "@fortawesome/free-solid-svg-icons";
import { kickoffLabel, timeUntil } from "../utils/api";
import type { GameWithPick, Pick } from "../utils/types";
import PickRow, { type Draft } from "./PickRow";

type PickSheetProps = {
  /** Remount (key) the sheet when the week changes: drafts start from these. */
  games: GameWithPick[];
  onSave: (gameId: number, homeScore: number, awayScore: number) => Promise<{ pick: Pick }>;
  onClear: (gameId: number) => Promise<void>;
  /** The admin can edit games that have already kicked off. */
  ignoreLock?: boolean;
  pickLabel?: string;
};

const draftOf = (pick: Pick | null): Draft =>
  pick ? { home: String(pick.homeScore), away: String(pick.awayScore) } : { home: "", away: "" };

type DraftState = "clean" | "save" | "clear" | "incomplete";

function stateOf(draft: Draft, pick: Pick | null): DraftState {
  if (draft.home === "" && draft.away === "") return pick ? "clear" : "clean";
  if (draft.home === "" || draft.away === "") return "incomplete";
  if (pick && Number(draft.home) === pick.homeScore && Number(draft.away) === pick.awayScore) return "clean";
  return "save";
}

/** Games that kick off together share a header: "Sun, Nov 8, 1:00 PM · locks in 3d". */
function groupByKickoff(games: GameWithPick[]) {
  const groups: { kickoff: string; games: GameWithPick[] }[] = [];
  for (const game of games) {
    const last = groups.at(-1);
    if (last && last.kickoff === game.kickoff) last.games.push(game);
    else groups.push({ kickoff: game.kickoff, games: [game] });
  }
  return groups;
}

function SlotStatus({ games }: { games: GameWithPick[] }) {
  if (games.some((g) => g.status === "LIVE")) {
    return (
      <Typography variant="body2" sx={{ color: "error.main", fontWeight: 700 }}>
        Live
      </Typography>
    );
  }
  if (games.every((g) => g.status === "FINAL" || g.status === "CANCELED")) {
    return (
      <Typography variant="body2" color="text.secondary">
        Final
      </Typography>
    );
  }
  if (games.some((g) => g.locked)) {
    return (
      <Typography variant="body2" color="text.secondary">
        <FontAwesomeIcon icon={faLock} size="xs" /> Locked
      </Typography>
    );
  }
  return (
    <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 600 }}>
      Locks in {timeUntil(games[0]!.kickoff)}
    </Typography>
  );
}

/**
 * A week of score boxes with one save button for all of them, so you can fill
 * in a whole slate and commit it at once. Only the games you changed are sent.
 */
const PickSheet = ({ games: initial, onSave, onClear, ignoreLock = false, pickLabel = "Your pick" }: PickSheetProps) => {
  const [games, setGames] = useState(initial);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() =>
    Object.fromEntries(initial.map((g) => [g.id, draftOf(g.pick)])),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const editable = (game: GameWithPick) => game.status !== "CANCELED" && (ignoreLock || !game.locked);

  const states = new Map(games.map((g) => [g.id, editable(g) ? stateOf(drafts[g.id]!, g.pick) : ("clean" as const)]));
  const pending = games.filter((g) => {
    const state = states.get(g.id);
    return state === "save" || state === "clear";
  });
  const incomplete = games.filter((g) => states.get(g.id) === "incomplete");

  const saveAll = async () => {
    setIsSaving(true);
    setErrors([]);
    setSavedCount(null);

    const results = await Promise.allSettled(
      pending.map(async (game) => {
        const draft = drafts[game.id]!;
        if (states.get(game.id) === "clear") {
          await onClear(game.id);
          return { gameId: game.id, pick: null };
        }
        const { pick } = await onSave(game.id, Number(draft.home), Number(draft.away));
        return { gameId: game.id, pick };
      }),
    );

    const saved = new Map<number, Pick | null>();
    const failed: string[] = [];

    results.forEach((result, i) => {
      const game = pending[i]!;
      if (result.status === "fulfilled") saved.set(result.value.gameId, result.value.pick);
      else failed.push(`${game.awayTeam} @ ${game.homeTeam}: ${result.reason instanceof Error ? result.reason.message : "failed"}`);
    });

    setGames((current) => current.map((g) => (saved.has(g.id) ? { ...g, pick: saved.get(g.id)! } : g)));
    setErrors(failed);
    setSavedCount(saved.size);
    setIsSaving(false);
  };

  if (games.length === 0) {
    return <Typography color="text.secondary">No games on the schedule for this week yet.</Typography>;
  }

  return (
    <Box>
      {errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </Alert>
      )}

      <Stack spacing={2}>
        {groupByKickoff(games).map((group) => (
          <Card key={group.kickoff} variant="outlined">
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                px: { xs: 1.5, sm: 2 },
                py: 0.75,
                bgcolor: "action.hover",
                borderBottom: 1,
                borderColor: "divider",
              }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {kickoffLabel(group.kickoff)}
              </Typography>
              <SlotStatus games={group.games} />
            </Stack>

            {group.games.map((game, i) => (
              <Box key={game.id}>
                {i > 0 && <Divider />}
                <PickRow
                  game={game}
                  pick={game.pick}
                  pickLabel={pickLabel}
                  dirty={states.get(game.id) !== "clean"}
                  expanded={expanded.has(game.id)}
                  onToggle={() =>
                    setExpanded((open) => {
                      const next = new Set(open);
                      if (next.has(game.id)) next.delete(game.id);
                      else next.add(game.id);
                      return next;
                    })
                  }
                  {...(editable(game) && {
                    draft: drafts[game.id]!,
                    onDraftChange: (draft: Draft) => {
                      setSavedCount(null);
                      setDrafts((d) => ({ ...d, [game.id]: draft }));
                    },
                  })}
                />
              </Box>
            ))}
          </Card>
        ))}
      </Stack>

      <Paper
        elevation={3}
        sx={{
          position: "sticky",
          bottom: 16,
          mt: 3,
          p: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 2,
          border: 1,
          borderColor: "divider",
        }}>
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {pending.length > 0
              ? `${pending.length} unsaved ${pending.length === 1 ? "change" : "changes"}`
              : savedCount
                ? "Saved"
                : "All picks saved"}
          </Typography>
          {incomplete.length > 0 && (
            <Typography variant="caption" color="error">
              {incomplete.length} {incomplete.length === 1 ? "game needs" : "games need"} both scores
            </Typography>
          )}
        </Stack>
        <Button
          variant="contained"
          disabled={isSaving || pending.length === 0}
          onClick={saveAll}
          startIcon={<FontAwesomeIcon icon={faFloppyDisk} />}>
          {isSaving ? "Saving…" : "Save picks"}
        </Button>
      </Paper>
    </Box>
  );
};

export default PickSheet;
