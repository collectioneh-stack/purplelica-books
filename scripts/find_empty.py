import json, glob, os, sys

pg = sys.argv[1]
base = os.path.join(os.path.dirname(__file__), '..', 'public', 'translations', pg)
files = sorted(glob.glob(os.path.join(base, 'p*.json')),
               key=lambda f: int(os.path.basename(f)[1:-5]))
empty = []
for f in files:
    d = json.load(open(f, encoding='utf-8'))
    if isinstance(d, list):
        txt = ''.join(x for x in d if isinstance(x, str))
    elif isinstance(d, dict):
        txt = json.dumps(d, ensure_ascii=False)
    else:
        txt = str(d)
    if len(txt.strip()) == 0:
        empty.append(os.path.basename(f)[:-5])
print(pg, 'total:', len(files), 'empty:', len(empty))
print('EMPTY_PAGES:', ' '.join(empty))
