export const nl = {
  "app.tagline": "Beachvolleybal: posities en tactiek",
  "app.logoAlt": "Logo van {club}",
  "court.title": "Beachvolleybalveld van 16 bij 8 meter, van bovenaf gezien",
  "court.hint":
    "Sleep een speler of de bal. Met het toetsenbord: tab en pijltjes.",
  "court.reset": "Beginopstelling",
  "court.flip": "Draai veld",
  "court.teamA": "Team A",
  "court.teamB": "Team B",
  "court.player": "Speler {label}, team {team}, op {x} bij {y} meter",
  "court.ball": "Bal, op {x} bij {y} meter",
} as const;

export type MessageKey = keyof typeof nl;
