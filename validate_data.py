#!/usr/bin/env python3
"""data/*.json 스펙 검증. 실패 시 exit 1. CI(pages.yml)와 로컬에서 동일하게 사용."""
import glob, json, sys

TYPES = {"mc", "tf", "fill", "output", "order", "match"}
errors, lessons, exercises = [], 0, 0

for path in sorted(glob.glob("data/ch*.json")):
    try:
        ch = json.load(open(path, encoding="utf-8"))
    except Exception as e:
        errors.append(f"{path}: invalid JSON: {e}"); continue
    for k in ("id", "number", "title", "titleEn", "lessons"):
        if k not in ch: errors.append(f"{path}: missing '{k}'")
    ids = set()
    for l in ch.get("lessons", []):
        lessons += 1
        lid = l.get("id", "?")
        if lid in ids: errors.append(f"{path}: duplicate lesson id {lid}")
        ids.add(lid)
        if not l.get("summary") or not l.get("title"): errors.append(f"{path}:{lid}: missing title/summary")
        exs = l.get("exercises", [])
        if not 4 <= len(exs) <= 12: errors.append(f"{path}:{lid}: {len(exs)} exercises (want 4-12)")
        if len({e.get("type") for e in exs}) < 3: errors.append(f"{path}:{lid}: fewer than 3 exercise types")
        for i, e in enumerate(exs):
            exercises += 1
            tag = f"{path}:{lid}#{i}"
            t = e.get("type")
            if t not in TYPES: errors.append(f"{tag}: bad type {t!r}"); continue
            if not e.get("q") or not e.get("explain"): errors.append(f"{tag}: missing q/explain")
            if t in ("mc", "fill", "output"):
                opts = e.get("options", [])
                if not 3 <= len(opts) <= 4: errors.append(f"{tag}: {len(opts)} options")
                if not isinstance(e.get("answer"), int) or not 0 <= e["answer"] < len(opts): errors.append(f"{tag}: answer out of range")
                if t == "fill" and e.get("code", "").count("___") != 1: errors.append(f"{tag}: fill needs exactly one ___")
            elif t == "tf":
                if not isinstance(e.get("answer"), bool): errors.append(f"{tag}: tf answer must be bool")
            elif t == "order":
                if not 3 <= len(e.get("items", [])) <= 6: errors.append(f"{tag}: order needs 3-6 items")
            elif t == "match":
                pairs = e.get("pairs", [])
                if not 3 <= len(pairs) <= 5 or any(len(p) != 2 for p in pairs): errors.append(f"{tag}: match needs 3-5 [l,r] pairs")
                if len({p[1] for p in pairs if len(p) == 2}) != len(pairs): errors.append(f"{tag}: duplicate right-hand values")

print(f"chapters={len(glob.glob('data/ch*.json'))} lessons={lessons} exercises={exercises} errors={len(errors)}")
for e in errors: print(" -", e)
sys.exit(1 if errors else 0)
