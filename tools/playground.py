#!/usr/bin/env python3
"""Rust Playground helper. Usage: python3 pg.py file.rs  |  python3 pg.py - <<'EOF' ... EOF
Prints JSON {"compiled":bool,"stdout":..,"stderr":..,"panicked":bool}. Wraps fragments lacking fn main."""
import json, sys, time, urllib.request, re
def run(code, edition="2024"):
    if not re.search(r"\bfn\s+main\s*\(", code):
        code = "#![allow(unused)]\nfn main() {\n" + code + "\n}"
    body = json.dumps({"channel":"stable","mode":"debug","edition":edition,"crateType":"bin","tests":False,"code":code,"backtrace":False}).encode()
    for attempt in range(5):
        try:
            req = urllib.request.Request("https://play.rust-lang.org/execute", body, {"Content-Type":"application/json"})
            with urllib.request.urlopen(req, timeout=60) as r: j = json.load(r)
            break
        except Exception as e:
            if attempt == 4: return {"error": str(e)}
            time.sleep(3 * (attempt + 1))
    stderr = j.get("stderr", "")
    errs = re.findall(r"^error(?:\[E\d+\])?: .*", stderr, re.M)
    return {"compiled": not errs, "success": j.get("success"), "stdout": j.get("stdout", ""),
            "errors": errs[:4], "panicked": "panicked at" in stderr, "stderr": stderr[-1500:]}
if __name__ == "__main__":
    src = sys.stdin.read() if sys.argv[1] == "-" else open(sys.argv[1]).read()
    print(json.dumps(run(src), ensure_ascii=False, indent=1))
