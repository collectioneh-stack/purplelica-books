import json, os

D = 'public/translations/pg158'
SRC = 'public/translations/_source_pg158.json'

# source pages
src = json.load(open(SRC, encoding='utf-8'))
n_src = len(src)

filled, empty, missing = [], [], []
maxp = 0
for fn in os.listdir(D):
    if fn.startswith('p') and fn.endswith('.json') and '_en' not in fn:
        try:
            num = int(fn[1:-5])
            maxp = max(maxp, num)
        except ValueError:
            pass

total = max(maxp, n_src)
for n in range(1, total + 1):
    f = os.path.join(D, 'p%d.json' % n)
    if not os.path.exists(f):
        missing.append(n)
        continue
    raw = open(f, encoding='utf-8').read().strip()
    try:
        j = json.loads(raw)
    except Exception:
        empty.append(n)
        continue
    if isinstance(j, list):
        joined = ''.join(str(x) for x in j).strip()
    elif isinstance(j, str):
        joined = j.strip()
    else:
        joined = json.dumps(j, ensure_ascii=False).strip()
    if len(joined) < 5:
        empty.append(n)
    else:
        filled.append(n)

print('SOURCE_PAGES', n_src)
print('MAX_PAGE_FILE', maxp)
print('FILLED', len(filled))
print('EMPTY', len(empty))
print('MISSING', len(missing))
print('TODO_COUNT', len(empty) + len(missing))
todo = sorted(empty + missing)
print('TODO_LIST', todo)
