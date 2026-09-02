import re, sys, json
path = sys.argv[1]
lines = open(path, encoding='utf-8', errors='replace').read().split('\n')
hdr = re.compile(r'^\[(\d+)\] (.*)$')
blocks = []
cur = None
pre = []  # lines before first marker
for i, ln in enumerate(lines, 1):
    m = hdr.match(ln)
    if m:
        cur = {'n': int(m.group(1)), 'loc': m.group(2).strip(), 'start': i, 'lines': []}
        blocks.append(cur)
    elif cur is not None:
        cur['lines'].append((i, ln))
    else:
        pre.append((i, ln))

def summarize(b):
    enc = []; choices = []; casts = []; outcome = []; free = False; notes = []; uses = []; items = []
    prefs = []
    for i, ln in b['lines']:
        if ln.startswith('Encounter: '): enc.append(ln[11:])
        elif ln.startswith('Took choice '): choices.append(ln[12:])
        elif re.match(r'^Round \d+: \S+ casts ', ln):
            casts.append(re.sub(r'^Round \d+: \S+ casts ', '', ln).rstrip('!'))
        elif re.match(r'^Round \d+: \S+ (uses|throws|attacks) ', ln):
            casts.append(re.sub(r'^Round \d+: \S+ ', '', ln))
        elif 'wins the fight' in ln: outcome.append('WIN')
        elif 'This combat did not cost a turn' in ln: free = True
        elif ln.startswith('> '): notes.append(ln[2:][:80])
        elif re.match(r'^use \d+ ', ln) or ln.startswith('cast ') or ln.startswith('eat ') or ln.startswith('drink '): uses.append(ln)
        elif ln.startswith('You acquire an item: '): items.append(ln[21:])
        elif ln.startswith('Preference _') and 'changed from' in ln:
            mm = re.match(r'^Preference (\S+) changed from (.*) to (.*)$', ln)
            if mm and mm.group(1) not in ('_lastCombatActions','_concoctionDatabaseRefreshes','_perilLocations','_currentDartboard','_dartsLeft','_swordOfSWordsMonsterChanged','_lastCombatStarted','_vampyreCloakeFormUses','_swordOfSWordsKills'):
                prefs.append(f"{mm.group(1)}:{mm.group(2)[:20]}->{mm.group(3)[:20]}")
        elif 'runs away' in ln or 'You run away' in ln: outcome.append('RUNAWAY')
        elif 'banish' in ln.lower() and 'Preference' not in ln: outcome.append('BANISH?')
    combat = any(ln.startswith('Round 0:') for _, ln in b['lines'])
    return dict(enc=enc, choices=choices, casts=casts, outcome=outcome, free=free, notes=notes, uses=uses, items=items, prefs=prefs, combat=combat)

rows = []
for idx, b in enumerate(blocks):
    nxt = blocks[idx+1]['n'] if idx+1 < len(blocks) else None
    s = summarize(b)
    cost = None if nxt is None else nxt - b['n']
    rows.append(dict(n=b['n'], line=b['start'], loc=b['loc'], cost=cost, **s))

mode = sys.argv[2] if len(sys.argv) > 2 else 'table'
if mode == 'json':
    print(json.dumps(rows, indent=1))
else:
    for r in rows:
        flag = 'PAID' if r['cost'] else ('free' if r['combat'] or r['choices'] or r['enc'] else '----')
        print(f"L{r['line']:<6} t{r['n']:<3} {flag:<4} cost={r['cost']} | {r['loc'][:38]:<38} | enc={'; '.join(r['enc'])[:60]} | ch={'; '.join(c[:30] for c in r['choices'])[:70]} | casts={', '.join(r['casts'])[:120]} | out={'/'.join(r['outcome'])} | uses={'; '.join(r['uses'])[:60]} | prefs={' '.join(r['prefs'])[:160]}")
    print('TOTAL blocks', len(rows), 'paid', sum(1 for r in rows if r['cost']), 'sum cost', sum(r['cost'] or 0 for r in rows))
