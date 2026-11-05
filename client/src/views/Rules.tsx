import { Box, Card, Container, Stack, Typography } from "@mui/material";

// Mirrors server/src/scoring.ts. If the numbers change there, change them here.
const PARTS = [
  {
    title: "Winner",
    max: 10,
    body: "10 points for calling the result. Your winner is the team you gave more points. A predicted tie only pays if the game actually ties.",
  },
  {
    title: "Away team's score",
    max: 10,
    body: "10 minus how many points you were off, never below zero. Say 24 when they score 21 and you get 7.",
  },
  {
    title: "Home team's score",
    max: 10,
    body: "Same as the away team.",
  },
  {
    title: "Point differential",
    max: 10,
    body: "10 minus how far your margin was from the real one, never below zero. Direction counts: picking a 7-point home win when the away team wins by 3 is 10 off.",
  },
];

const Rules = () => (
  <Container maxWidth="md" sx={{ py: 3 }}>
    <Typography variant="h5" sx={{ mb: 1 }}>
      Scoring
    </Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>
      Every game is worth up to 40 points, in four parts. You make one set of picks and it counts on every leaderboard
      you're on.
    </Typography>

    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, mb: 4 }}>
      {PARTS.map((part) => (
        <Card key={part.title} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
            <Typography sx={{ fontWeight: 700 }}>{part.title}</Typography>
            <Typography color="primary" sx={{ fontWeight: 700 }}>
              up to {part.max}
            </Typography>
          </Stack>
          <Typography color="text.secondary">{part.body}</Typography>
        </Card>
      ))}
    </Box>

    <Typography variant="h6" sx={{ mb: 1 }}>
      Example
    </Typography>
    <Card variant="outlined" sx={{ p: 2, mb: 4 }}>
      <Typography sx={{ mb: 1 }}>
        You pick <b>Vikings 20, Buccaneers 13</b> (Vikings home). It ends <b>Vikings 24, Buccaneers 21</b>.
      </Typography>
      <Typography color="text.secondary" component="div">
        Winner: Vikings, correct → <b>10</b>
        <br />
        Vikings score: off by 4 → <b>6</b>
        <br />
        Buccaneers score: off by 8 → <b>2</b>
        <br />
        Differential: you said +7, it was +3, off by 4 → <b>6</b>
        <br />
        Total: <b>24 points</b>
      </Typography>
    </Card>

    <Typography variant="h6" sx={{ mb: 1 }}>
      The fine print
    </Typography>
    <Typography color="text.secondary" component="ul" sx={{ pl: 2.5, "& li": { mb: 1 } }}>
      <li>Each game's picks lock at its kickoff. Until then you can change them as often as you like.</li>
      <li>Everyone in your league can see your picks at any time, before or after kickoff.</li>
      <li>Only finished games count toward the leaderboard. Points shown with a * are from games still being played.</li>
      <li>Postponed or canceled games aren't scored.</li>
      <li>Scores and schedules come from ESPN. If a result there is wrong, the admin can correct it.</li>
    </Typography>
  </Container>
);

export default Rules;
