"""pg4300(율리시스) 남은 페이지를 15병렬 워커로 번역 — 누락분만."""
import json, os, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRANS = ROOT / "public" / "translations"
BOOK = 4300
N_WORKERS = 15

src = json.load(open(TRANS / f"_source_pg{BOOK}.json"))
total = len(src)
D = TRANS / f"pg{BOOK}"

def done(i):
    f = D / f"p{i}.json"
    if not f.exists():
        return False
    try:
        arr = json.loads(f.read_text(encoding="utf-8"))
        return any(s.strip() for s in arr)
    except Exception:
        return False

missing = [i for i in range(1, total + 1) if not done(i)]
print(f"total={total} missing={len(missing)}")
if not missing:
    print("ALL DONE")
    sys.exit(0)

# round-robin 분배 (책 전체에 고르게)
chunks = [[] for _ in range(N_WORKERS)]
for idx, p in enumerate(missing):
    chunks[idx % N_WORKERS].append(p)

log_path = ROOT / "scripts" / "_4300_progress.log"
log_path.write_text("", encoding="utf-8")

# claude CLI를 워커 서브프로세스 PATH에 주입
CLAUDE_BIN_DIR = "/home/purple/.nvm/versions/node/v24.16.0/bin"
env = dict(os.environ)
env["PATH"] = CLAUDE_BIN_DIR + ":" + env.get("PATH", "")

procs = []
for w, pages in enumerate(chunks):
    if not pages:
        continue
    cmd = ["python3", str(ROOT / "scripts" / "translate-worker.py"),
           "--book", str(BOOK),
           "--pages", ",".join(map(str, pages)),
           "--log", str(log_path)]
    p = subprocess.Popen(cmd, cwd=str(ROOT), env=env,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    procs.append(p)
    print(f"worker {w}: {len(pages)} pages pid={p.pid}")

print(f"launched {len(procs)} workers, log={log_path}")
for p in procs:
    p.wait()
print("ALL WORKERS EXITED")
