#!/usr/bin/env python3
"""
session_monitor.py - Paralel Claude Code oturumlari icin canli durum panosu.

Ne yapar: ~/.claude/projects altindaki oturum kayitlarini (.jsonl transcript)
okuyup her oturumun SU AN ne yaptigini, hangi dosyalara dokundugunu, aktif mi
bekliyor mu oldugunu tek ekranda gosterir. Buyuk dosyalari sondan okur (tail),
tamamini yuklemez.

Kullanim:
  python tools/session_monitor.py                 # bu projeyi, canli izle (2sn)
  python tools/session_monitor.py --once          # tek sefer bas, cik
  python tools/session_monitor.py --all           # tum projelerdeki oturumlar
  python tools/session_monitor.py --interval 5    # yenileme araligi (saniye)
  python tools/session_monitor.py --json          # ham veri (baska araclara)
"""
import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

PROJECTS_ROOT = Path.home() / ".claude" / "projects"
# Bu proje: cwd'den turetilmis transcript klasoru adi (kolon/ters bolu -> tire).
THIS_PROJECT_DIR = "c--Users-bosta-Desktop-langapp"

# Oturum "aktif" sayilma esikleri (saniye).
ACTIVE_SECS = 45      # son 45sn'de yazilmis -> calisiyor
IDLE_SECS = 600       # son 10dk -> bekliyor/uykuda; oncesi -> eski

# ---------- ANSI renk ----------
def _supports_color():
    if os.environ.get("NO_COLOR"):
        return False
    if sys.platform == "win32":
        # Windows Terminal / VSCode ANSI destekler; legacy konsol icin colorama yoksa da denenir.
        os.system("")  # VT modunu ac
    return sys.stdout.isatty() or os.environ.get("FORCE_COLOR")

# Konsol ciktisini UTF-8'e zorla (Windows cp1252 Turkce/isaret karakterlerini bozar).
try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

_C = _supports_color()
def c(code, s):
    return f"\033[{code}m{s}\033[0m" if _C else s
def dim(s):    return c("2", s)
def bold(s):   return c("1", s)
def green(s):  return c("32", s)
def yellow(s): return c("33", s)
def gray(s):   return c("90", s)
def cyan(s):   return c("36", s)
def red(s):    return c("31", s)

# ---------- verimli tail okuma ----------
def read_tail_lines(path, max_bytes=256 * 1024):
    """Dosyanin son max_bytes kadarini oku, tam satirlara bol."""
    try:
        size = path.stat().st_size
    except OSError:
        return []
    with open(path, "rb") as f:
        if size > max_bytes:
            f.seek(size - max_bytes)
            f.readline()  # yarim satiri at
        data = f.read()
    text = data.decode("utf-8", errors="replace")
    return [ln for ln in text.splitlines() if ln.strip()]

def parse_last_events(lines, want=60):
    """Son 'want' JSON olayini (parse edilmis) dondur, eskiden yeniye."""
    out = []
    for ln in lines[-want:]:
        try:
            out.append(json.loads(ln))
        except json.JSONDecodeError:
            continue
    return out

# ---------- olaydan ozet cikarma ----------
FILE_TOOLS = {"Edit", "Write", "Read", "NotebookEdit", "MultiEdit"}

def _content_list(msg):
    if isinstance(msg, dict):
        cont = msg.get("content")
        if isinstance(cont, list):
            return cont
        if isinstance(cont, str):
            return [{"type": "text", "text": cont}]
    return []

def summarize_tool_use(name, inp):
    inp = inp or {}
    if name in ("Edit", "Write", "Read", "NotebookEdit", "MultiEdit"):
        fp = inp.get("file_path") or inp.get("notebook_path") or ""
        return os.path.basename(fp) or fp
    if name == "Bash":
        cmd = (inp.get("command") or "").strip().replace("\n", " ")
        return cmd[:60]
    if name in ("Grep", "Glob"):
        return inp.get("pattern") or inp.get("query") or ""
    if name == "Task" or name == "Agent":
        return inp.get("description") or inp.get("subagent_type") or ""
    if name == "TodoWrite":
        todos = inp.get("todos") or []
        active = [t.get("content", "") for t in todos if t.get("status") == "in_progress"]
        return active[0][:50] if active else f"{len(todos)} gorev"
    if name == "Skill":
        return inp.get("skill") or ""
    # genel
    for k in ("query", "prompt", "path", "url", "description"):
        if inp.get(k):
            return str(inp[k])[:60]
    return ""

def analyze_session(path):
    lines = read_tail_lines(path)
    events = parse_last_events(lines)
    info = {
        "session_id": path.stem,
        "file": str(path),
        "mtime": path.stat().st_mtime,
        "cwd": "",
        "git_branch": "",
        "entrypoint": "",
        "last_ts": None,
        "last_kind": "",       # tool / text / user / system
        "last_action": "",     # insan-okur ozet
        "recent_files": [],    # son dokunulan dosyalar (goruntu icin, basename)
        "writes": {},          # abs_path -> son yazma zamani (Edit/Write) - cakisma icin
        "reads": {},           # abs_path -> son okuma zamani (Read)
        "last_user_prompt": "",
        "n_events": len(events),
    }
    seen_files = []
    writes, reads = {}, {}
    for ev in events:
        info["cwd"] = ev.get("cwd") or info["cwd"]
        info["git_branch"] = ev.get("gitBranch") or info["git_branch"]
        info["entrypoint"] = ev.get("entrypoint") or info["entrypoint"]
        ts = ev.get("timestamp")
        if ts:
            info["last_ts"] = ts
        etype = ev.get("type")
        msg = ev.get("message") if isinstance(ev.get("message"), dict) else {}
        for item in _content_list(msg):
            if not isinstance(item, dict):
                continue
            if item.get("type") == "tool_use":
                nm = item.get("name", "")
                inp = item.get("input") or {}
                summ = summarize_tool_use(nm, inp)
                if nm in FILE_TOOLS:
                    f = summarize_tool_use(nm, inp)
                    if f and f not in seen_files:
                        seen_files.append(f)
                    raw = inp.get("file_path") or inp.get("notebook_path")
                    if raw:
                        try:
                            ap = os.path.normcase(os.path.abspath(
                                raw if os.path.isabs(raw) else os.path.join(info["cwd"] or "", raw)))
                        except Exception:
                            ap = os.path.normcase(raw)
                        (reads if nm == "Read" else writes)[ap] = ts or ""
                if etype == "assistant":
                    info["last_kind"] = "tool"
                    info["last_action"] = f"{nm} {summ}".strip()
            elif item.get("type") == "text":
                txt = (item.get("text") or "").strip().replace("\n", " ")
                if etype == "assistant" and txt:
                    info["last_kind"] = "text"
                    info["last_action"] = txt[:80]
        # kullanici mesaji (string content)
        if etype == "user":
            cont = msg.get("content")
            if isinstance(cont, str) and cont.strip():
                info["last_user_prompt"] = cont.strip().replace("\n", " ")[:80]
                info["last_kind"] = "user"
                info["last_action"] = "(kullanici girdi bekliyor / yeni istek)"
            elif isinstance(cont, list):
                # tool_result icerebilir; metin varsa al
                for it in cont:
                    if isinstance(it, dict) and it.get("type") == "text":
                        t = (it.get("text") or "").strip()
                        if t:
                            info["last_user_prompt"] = t.replace("\n", " ")[:80]
    info["recent_files"] = seen_files[-5:]
    info["writes"] = writes
    info["reads"] = reads
    return info

def status_of(info, now):
    age = now - info["mtime"]
    if age <= ACTIVE_SECS:
        return "AKTIF", green
    if age <= IDLE_SECS:
        return "BEKLIYOR", yellow
    return "ESKI", gray

def compute_conflicts(sessions, now):
    """Cakisma: canli (eski olmayan) EN AZ IKI oturum ayni dosyaya dokunuyor
    ve en az biri YAZIYOR. Iki okuyucu cakisma sayilmaz."""
    live = [s for s in sessions if now - s["mtime"] <= IDLE_SECS]
    by_file = {}  # abs_path -> {"writers": set(sid), "readers": set(sid)}
    for s in live:
        sid = s["session_id"][:8]
        for ap in s.get("writes", {}):
            by_file.setdefault(ap, {"writers": set(), "readers": set()})["writers"].add(sid)
        for ap in s.get("reads", {}):
            by_file.setdefault(ap, {"writers": set(), "readers": set()})["readers"].add(sid)
    conflicts = []
    for ap, who in by_file.items():
        w, r = who["writers"], who["readers"]
        if len(w) >= 2:
            conflicts.append(("WRITE-WRITE", ap, sorted(w), sorted(r - w)))
        elif len(w) == 1 and (r - w):
            conflicts.append(("WRITE-READ", ap, sorted(w), sorted(r - w)))
    conflicts.sort(key=lambda x: (x[0] != "WRITE-WRITE", x[1]))
    return conflicts

def human_age(secs):
    secs = int(secs)
    if secs < 60:
        return f"{secs}sn"
    if secs < 3600:
        return f"{secs // 60}dk"
    if secs < 86400:
        return f"{secs // 3600}sa"
    return f"{secs // 86400}g"

# ---------- toplama + render ----------
def collect(project_dirs):
    sessions = []
    for d in project_dirs:
        if not d.is_dir():
            continue
        for jf in d.glob("*.jsonl"):
            try:
                sessions.append(analyze_session(jf))
            except Exception as e:  # tek dosya patlarsa panoyu dusurme
                sessions.append({
                    "session_id": jf.stem, "file": str(jf), "mtime": jf.stat().st_mtime,
                    "cwd": "", "git_branch": "", "entrypoint": "", "last_ts": None,
                    "last_kind": "hata", "last_action": f"parse hatasi: {e}",
                    "recent_files": [], "last_user_prompt": "", "n_events": 0,
                })
    sessions.sort(key=lambda s: s["mtime"], reverse=True)
    return sessions

def render(sessions, project_label, now):
    W = 100
    lines = []
    header = f" PARALEL OTURUM PANOSU  |  {project_label}  |  {datetime.now().strftime('%H:%M:%S')} "
    lines.append(bold(cyan(header)))
    active = sum(1 for s in sessions if now - s["mtime"] <= ACTIVE_SECS)
    waiting = sum(1 for s in sessions if ACTIVE_SECS < now - s["mtime"] <= IDLE_SECS)
    lines.append(dim(f" {len(sessions)} oturum | {green(str(active)+' aktif')} | {yellow(str(waiting)+' bekliyor')} | cikis: Ctrl+C"))
    lines.append(dim("-" * W))
    # --- cakisma uyari bandi ---
    conflicts = compute_conflicts(sessions, now)
    if conflicts:
        lines.append(red(bold(f" !! CAKISMA: {len(conflicts)} dosya ayni anda birden cok oturumda")))
        for kind, ap, writers, readers in conflicts:
            fname = os.path.basename(ap) or ap
            if kind == "WRITE-WRITE":
                detail = red(f"{len(writers)} oturum YAZIYOR: {', '.join(writers)}")
            else:
                detail = yellow(f"yazan: {', '.join(writers)} | okuyan: {', '.join(readers)}")
            lines.append(f"   {red('*')} {bold(fname)}  {detail}")
            lines.append(dim(f"     {ap}"))
        lines.append(dim("-" * W))
    for s in sessions:
        label, col = status_of(s, now)
        age = human_age(now - s["mtime"])
        sid = s["session_id"][:8]
        branch = s["git_branch"] or "?"
        proj = os.path.basename(s["cwd"].rstrip("\\/")) if s["cwd"] else "?"
        line1 = f" {col(label.ljust(9))} {bold(sid)}  {dim('['+branch+']')}  {dim(proj)}  {dim('son '+age)}"
        lines.append(line1)
        act = s["last_action"] or "(bilinmiyor)"
        kind = s["last_kind"]
        tag = {"tool": cyan("calisiyor"), "text": green("yaniti"),
               "user": yellow("bekliyor"), "system": gray("sistem"),
               "hata": red("hata")}.get(kind, gray(kind or "-"))
        lines.append(f"   {tag}: {act}")
        if s["recent_files"]:
            lines.append(dim("   dosyalar: " + ", ".join(s["recent_files"])))
        lines.append("")
    return "\n".join(lines)

def detect_project_dir():
    """Bulundugun klasore (cwd) ait transcript klasorunu bul.
    Dizin adi surumden surume degisebildigi icin, her projenin en yeni
    kaydindaki 'cwd' alanini okuyup mevcut cwd ile eslestiririz."""
    target = os.path.normcase(os.path.abspath(os.getcwd()))
    if not PROJECTS_ROOT.is_dir():
        return None
    best = None
    for d in PROJECTS_ROOT.iterdir():
        if not d.is_dir():
            continue
        jfs = list(d.glob("*.jsonl"))
        if not jfs:
            continue
        newest = max(jfs, key=lambda p: p.stat().st_mtime)
        for ev in parse_last_events(read_tail_lines(newest, 32 * 1024), want=5):
            cwd = ev.get("cwd")
            if cwd and os.path.normcase(os.path.abspath(cwd)) == target:
                return d
    return best

def project_dirs_for(args):
    if args.all:
        return sorted([p for p in PROJECTS_ROOT.iterdir() if p.is_dir()])
    if args.project_dir:
        return [Path(args.project_dir)]
    auto = detect_project_dir()
    if auto:
        return [auto]
    return [PROJECTS_ROOT / THIS_PROJECT_DIR]  # geri dusus

def main():
    ap = argparse.ArgumentParser(description="Paralel Claude Code oturum panosu")
    ap.add_argument("--once", action="store_true", help="tek sefer bas, cik")
    ap.add_argument("--all", action="store_true", help="tum projeler")
    ap.add_argument("--project-dir", help="belirli transcript klasoru")
    ap.add_argument("--interval", type=float, default=2.0, help="yenileme araligi (sn)")
    ap.add_argument("--json", action="store_true", help="JSON ciktisi")
    args = ap.parse_args()

    dirs = project_dirs_for(args)
    label = "TUM PROJELER" if args.all else (os.path.basename(str(dirs[0])) if dirs else "?")

    if args.json:
        now = time.time()
        data = collect(dirs)
        conflicts = compute_conflicts(data, now)
        for s in data:
            s["status"] = status_of(s, now)[0]
            s["age_secs"] = int(now - s["mtime"])
            s["writes"] = list(s.get("writes", {}).keys())
            s["reads"] = list(s.get("reads", {}).keys())
        out = {
            "sessions": data,
            "conflicts": [
                {"kind": k, "path": p, "writers": w, "readers": r}
                for (k, p, w, r) in conflicts
            ],
        }
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return

    if args.once:
        now = time.time()
        print(render(collect(dirs), label, now))
        return

    try:
        while True:
            now = time.time()
            out = render(collect(dirs), label, now)
            # ekrani temizle
            sys.stdout.write("\033[2J\033[H" if _C else "\n" * 3)
            sys.stdout.write(out + "\n")
            sys.stdout.flush()
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nkapatildi.")

if __name__ == "__main__":
    main()
