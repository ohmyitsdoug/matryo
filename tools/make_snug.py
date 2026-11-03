"""Build data/fits.json and data/dailies.json for v0.4 "Snug".
tools/fits.txt lists real spaces ("in a suitcase", "through a door") with the longest thing that fits, in cm.
Each daily has 7 of them: a mix of small, medium and big spaces, in a random order. Every prompt is used once
before any repeats, so with 120 prompts a prompt comes back about every 17 days. Add lines to fits.txt to stretch that.
Usage: python3 tools/make_snug.py 2026-11-03 365
"""
import json, math, os, random, sys, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
start = datetime.date.fromisoformat(sys.argv[1] if len(sys.argv) > 1 else '2026-11-03')
days = int(sys.argv[2]) if len(sys.argv) > 2 else 365
fits = []
for line in open(os.path.join(HERE, 'fits.txt')):
    line = line.strip()
    if not line or line.startswith('#'): continue
    phrase, head, cm = [x.strip() for x in line.split('|')]
    cm = float(cm)
    fits.append({'id': len(fits), 'phrase': phrase, 'head': head, 'cm': cm,
                 'size': round(math.log(cm / 0.001) / math.log(1.5) + 1, 2)})
json.dump(fits, open(os.path.join(HERE, '..', 'data', 'fits.json'), 'w'), separators=(',', ':'))
random.seed(5)
by_size = sorted(fits, key=lambda f: f['size'])
third = len(by_size) // 3
small, mid, big = by_size[:third], by_size[third:2 * third], by_size[2 * third:]
out, queue = [], {'s': [], 'm': [], 'b': []}
def take(kind, pool, today):
    if not queue[kind]: queue[kind] = random.sample(pool, len(pool))
    for i, f in enumerate(queue[kind]):
        if f['id'] not in today: return queue[kind].pop(i)
    return queue[kind].pop(0)
for d in range(days):
    today, picks = set(), []
    for kind, pool in [('s', small), ('s', small), ('m', mid), ('m', mid), ('m', mid), ('b', big), ('b', big)]:
        f = take(kind, pool, today); today.add(f['id']); picks.append(f['id'])
    random.shuffle(picks)
    out.append({'n': d + 1, 'date': (start + datetime.timedelta(days=d)).isoformat(), 'rounds': picks})
json.dump(out, open(os.path.join(HERE, '..', 'data', 'dailies.json'), 'w'), separators=(',', ':'))
print(len(fits), 'prompts,', len(out), 'days')
for d in out[:2]: print(d['n'], ' / '.join(fits[i]['phrase'] for i in d['rounds']))
