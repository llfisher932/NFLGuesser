import { IconButton, ListSubheader, MenuItem, Select, Stack, Tooltip } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { sameWeek } from "../utils/api";
import type { Week, WeekKey } from "../utils/types";

type WeekPickerProps = {
  weeks: Week[];
  week: WeekKey | null;
  onChange: (week: WeekKey) => void;
};

const keyOf = (w: WeekKey) => `${w.season}-${w.seasonType}-${w.week}`;

/** Arrows step through the calendar in order; the menu jumps anywhere. */
const WeekPicker = ({ weeks, week, onChange }: WeekPickerProps) => {
  const ordered = [...weeks].sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
  const index = ordered.findIndex((w) => sameWeek(w, week));
  const previous = index > 0 ? ordered[index - 1] : undefined;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : undefined;

  // Newest season first in the menu, each season in calendar order.
  const seasons = [...new Set(ordered.map((w) => w.season))].sort((a, b) => b - a);

  const pick = (w: Week) => onChange({ season: w.season, seasonType: w.seasonType, week: w.week });

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      <Tooltip title={previous ? previous.label : ""}>
        <span>
          <IconButton size="small" disabled={!previous} onClick={() => previous && pick(previous)} aria-label="Previous week">
            <FontAwesomeIcon icon={faChevronLeft} />
          </IconButton>
        </span>
      </Tooltip>

      <Select
        size="small"
        value={index >= 0 ? keyOf(ordered[index]!) : ""}
        onChange={(e) => {
          const chosen = ordered.find((w) => keyOf(w) === e.target.value);
          if (chosen) pick(chosen);
        }}
        renderValue={(value) => {
          const chosen = ordered.find((w) => keyOf(w) === value);
          return chosen ? `${chosen.label} · ${chosen.season}` : "Pick a week";
        }}
        displayEmpty
        sx={{ minWidth: 200, fontWeight: 600 }}>
        {seasons.flatMap((season) => [
          <ListSubheader key={`s${season}`}>{season} season</ListSubheader>,
          ...ordered
            .filter((w) => w.season === season)
            .map((w) => (
              <MenuItem key={keyOf(w)} value={keyOf(w)}>
                {w.label}
              </MenuItem>
            )),
        ])}
      </Select>

      <Tooltip title={next ? next.label : ""}>
        <span>
          <IconButton size="small" disabled={!next} onClick={() => next && pick(next)} aria-label="Next week">
            <FontAwesomeIcon icon={faChevronRight} />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
};

export default WeekPicker;
