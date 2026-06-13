import json
with open('/home/purple/ai-ceo-os/projects/bookmap/public/translations/_source_pg1322.json') as f:
    source = json.load(f)
for n in range(207, 224):
    print(f'=== PAGE {n+1} (index {n}) ===')
    for i, para in enumerate(source[n]):
        print(f'[{i}]')
        print(para)
        print()
    print()
