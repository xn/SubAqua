import json, sys
rows = json.load(open(sys.argv[1]))
title = sys.argv[2]; logname = sys.argv[3]
src=[('flap your bat wings','bat wings proc'),('SWEAT BULLETS','free kill: BCZ Sweat Bullets'),('shadow brick','free kill: shadow brick'),('SHATTERING PUNCH','free kill: Shattering Punch'),('GINGERBREAD MOB HIT','free kill: Gingerbread Mob Hit'),('CHEST X-RAY','free kill: Chest X-Ray'),('ASSERT YOUR AUTHORITY','free kill: Assert your Authority'),('AIM FOR THE BULLSEYE','darts bullseye'),("CLUB 'EM",'free kill: Club Em'),('BOWL A CURVEBALL','banish: Bowl a Curveball'),('SNOKEBOMB','banish: Snokebomb'),('FEEL HATRED','banish: Feel Hatred'),('THROW LATTE','banish: latte'),('SPRING AWAY','free run: Spring Away'),('USE THE FORCE','saber Force'),('MACROMETEORITE','Macrometeorite re-roll'),('BACK-UP','backup camera copy'),('AVALANCHE','Avalanche (NC forcer)'),('PATRIOTIC SCREECH','Patriotic Screech'),('RAISE BACKUP DANCER','backup dancer'),('THROW CYBER ROCK','cyber rock')]
freezones = ('Shadow Rift','Cyberzone','Combat Lover','mimic egg','Dig up','Trick-or-Treat')
print(f"# {title}\n")
print(f"Source: `{logname}`. One row per `[N]` marker. **cost** = next marker's N minus this one (1 = this block spent a turn; 0 = free; last block: 0 if it printed `This combat did not cost a turn`, else 1). **ended by** is read from the block's own action lines; blank on a free win means the fight was free by zone or by wanderer type (goblin, golem copy, rift, cyber, locket, time cop).\n")
print("| line | turn | cost | zone | encounter | ended by |")
print("| --- | --- | --- | --- | --- | --- |")
paid=0
for r in rows:
    blob=' | '.join(r['casts']).upper()
    tags=[t for k,t in src if k.upper() in blob]
    if r['combat'] and 'WIN' not in r['outcome'] and not any(t.startswith(('banish','free run','saber','bat')) for t in tags):
        tags.append('fight ended without a win (run/loss/cap)')
    win = 'WIN' in r['outcome']
    kind = 'combat' if r['combat'] else ('NC' if (r['enc'] or r['choices']) else 'prep')
    if r["cost"] is None: r["cost"] = 0 if r["free"] else 1
    if r["cost"]: paid += r["cost"]
    ended = ', '.join(tags) if tags else (('paid kill' if r['cost'] else 'free win') if win else ('' if r['combat'] else kind))
    enc = '; '.join(e.replace('|','/') for e in r['enc'])[:70]
    print(f"| {r['line']} | {r['n']} | {r['cost'] if r['cost'] is not None else '–'} | {r['loc'][:34]} | {enc} | {ended} |")
print(f"\nBlocks: {len(rows)}. Paid turns: {paid}.")
