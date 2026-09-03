# The Mer-kin lockkey is gated on Outpost adventures, not luck

Diagnosis of the 2026-09-03 abort `Task Outpost/Outpost Lockkey did not complete
within 25 attempts` (turncount 11). Source: every session log 2026-08-01 to
2026-09-03 (33 runs with a key, one without), the KoL wiki, and mafia's source.

## What the logs say

Per-healer-kill key rate after Grandma's rescue, pooled over all 33 runs, keyed by
how many Outpost adventures the ascension had taken **including free fights,
copies and noncombats** (the fight that dropped the key counts):

| Outpost adventure # | keys / healer kills |
| ------------------- | ------------------- |
| 7-25                | 0 / 113             |
| 26                  | 5 / 19              |
| 27                  | 15 / 20             |
| 28                  | 8 / 9               |
| 29-30               | 5 / 5               |

Pre-rescue healer kills never dropped it either (0 / 25), and burglars and raiders
never carried it for this account (0 / 54 post-rescue kills). The wiki says +item
does not move the rate, and the toy Cupid bow never yanked the key in 83 attempts.

This is the counter the UnderTheSea fork calls `turns_spent < 24` in its Outpost
branch: it back-ups Golems until the gate and only then hunts healers. Mafia's
`$location.turnsSpent` increments at the end of every fight (FightRequest
`updateFinalRoundData`, unconditional) and on turn-costing noncombats, and resets in
ValhallaManager on ascension, so it is exactly this counter.

## Why SubAqua looked three times unluckier than the reference

Reference runs (08-01 to 08-26) needed 1-6 post-rescue healer kills; SubAqua runs
(08-27 on) needed 5-17. Neither is luck. The reference spent its pre-rescue Outpost
fights on Golem back-ups and reached the rescue with the counter near the gate, so
the first healers after step 9 were live rolls. SubAqua reaches the rescue at
adventure 5-11 and then kills healers into a closed gate.

## What happened today

Rescue at Outpost adventure 10. Healer kills at adventures 11, 13, 14, 15, 19, 22,
24, 25 were dead rolls; the kill at 26 was the first live one and missed (26%).
Adventures 27-30 came up Golem, burglar, Golem, Golem. Adventures 31-35 were all
healers, and `farmBackup` (habitats spent, recalled twice, cap 7) turned every one
into a Golem copy via Back-Up. The 25-attempt soft limit then fired with the key
at a near-certain drop on the next healer kill.

## Fix (`src/tasks/monkees/outpost.ts`)

- `lockkeyGateOpen()` = `outpost.turnsSpent >= 25`.
- Outpost Lockkey stops backing up once the gate is open, so post-gate healers are
  killed, not copied. Pre-gate back-ups stay: they fill the counter for free.
- The limit is `turns: 40` (15 adventures past the gate) instead of 25 attempts,
  so pre-gate filler no longer counts against the unlucky budget.

## Not changed, worth a later look

Pre-gate healer kills still spend free-kill charges and escalating Sweat Bullets
substats for nothing but beads and stats. Ordering the free Golem fights ahead of
the rescue, as the reference does, would put the first post-rescue healers on live
rolls. Zero turns either way; it is a resource question.
