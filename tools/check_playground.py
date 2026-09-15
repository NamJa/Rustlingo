#!/usr/bin/env python3
"""Compile/run every code snippet in data/*.json on the Rust Playground and compare with claimed answers.
Usage (from repo root): python3 tools/check_playground.py [data/chNN.json ...]  -> tools/report/chNN.json"""
import json, glob, re, sys, time, os
sys.path.insert(0, os.path.dirname(__file__)); from playground import run
OUT = os.path.join(os.path.dirname(__file__), 'report'); os.makedirs(OUT, exist_ok=True)
norm = lambda s: re.sub(r'\s+', ' ', s.strip())
def classify(opt):
    o = opt.replace(' ', '')
    if '컴파일에러' in o or '컴파일오류' in o or '컴파일되지않' in o or '컴파일실패' in o: return 'cerr'
    if '패닉' in o or 'panic' in o.lower(): return 'panic'
    return 'out'
files = sys.argv[1:] or sorted(glob.glob('data/ch*.json'))
for path in files:
    ch = json.load(open(path)); rep = []
    def add(**k): rep.append(k); print(json.dumps(k, ensure_ascii=False)[:200], flush=True)
    for l in ch['lessons']:
        # summary blocks
        for m in re.finditer(r'```([\w,+-]*)\n?([\s\S]*?)^```', l['summary'], re.M):
            lang, code = m.group(1), m.group(2)
            if lang not in ('rust', ''): continue
            if '❌' in code: continue  # intentionally failing example
            r = run(code); time.sleep(0.6)
            if 'error' in r: add(lesson=l['id'], where='summary', status='api_error', detail=r['error']); continue
            expects_err = bool(re.search(r'에러|오류|error|❌|컴파일되지|않는다|안 된다|불가', code))
            if not r['compiled']: add(lesson=l['id'], where='summary', status='compile_fail' + ('_expected?' if expects_err else ''), code=code[:400], errors=r['errors'])
            elif r['panicked'] and not re.search(r'패닉|panic', code): add(lesson=l['id'], where='summary', status='panicked', code=code[:400], stderr=r['stderr'][-300:])
        for i, e in enumerate(l['exercises']):
            t = e['type']; tag = dict(lesson=l['id'], idx=i, type=t, q=e['q'][:80])
            if t == 'output' and e.get('code'):
                r = run(e['code']); time.sleep(0.6)
                if 'error' in r: add(**tag, status='api_error'); continue
                ans = e['options'][e['answer']]; kind = classify(ans)
                actual = 'cerr' if not r['compiled'] else 'panic' if r['panicked'] else 'out'
                if kind != actual: add(**tag, status='MISMATCH', expected=ans, actual_kind=actual, stdout=r['stdout'][:300], errors=r['errors'], stderr=r['stderr'][-300:] if actual=='panic' else '')
                elif kind == 'out':
                    so = norm(r['stdout'])
                    if norm(ans) != so and norm(ans).replace(' ', '') != so.replace(' ', ''):
                        # tolerate options that describe output in prose
                        add(**tag, status='OUTPUT_DIFF', expected=ans, stdout=r['stdout'][:300], other_options=[o for k,o in enumerate(e['options']) if k!=e['answer']])
                    # also flag if a wrong option equals actual output
                    for k, o in enumerate(e['options']):
                        if k != e['answer'] and norm(o) == so: add(**tag, status='WRONG_OPTION_MATCHES_OUTPUT', option=o)
            elif t == 'fill' and e.get('code'):
                code = e['code'].replace('___', e['options'][e['answer']])
                r = run(code); time.sleep(0.6)
                if 'error' in r: add(**tag, status='api_error'); continue
                if not r['compiled']: add(**tag, status='FILL_ANSWER_DOES_NOT_COMPILE', code=code[:400], errors=r['errors'])
                else:
                    # wrong options that also compile with identical output are ambiguous
                    for k, o in enumerate(e['options']):
                        if k == e['answer']: continue
                        r2 = run(e['code'].replace('___', o)); time.sleep(0.6)
                        if r2.get('compiled') and not r2.get('panicked') and r2.get('stdout') == r.get('stdout'):
                            add(**tag, status='FILL_AMBIGUOUS_OPTION_ALSO_WORKS', option=o, stdout=r['stdout'][:200])
            elif t == 'order':
                r = run('\n'.join(e['items'])); time.sleep(0.6)
                if 'error' in r: add(**tag, status='api_error'); continue
                if not r['compiled']: add(**tag, status='ORDER_DOES_NOT_COMPILE', errors=r['errors'])
            elif t == 'mc' and e.get('code'):
                r = run(e['code']); time.sleep(0.6)
                if 'error' in r: add(**tag, status='api_error'); continue
                add(**tag, status='mc_info', compiled=r['compiled'], panicked=r['panicked'], stdout=r['stdout'][:200], errors=r['errors'][:2], answer=e['options'][e['answer']])
    json.dump(rep, open(os.path.join(OUT, os.path.basename(path)), 'w'), ensure_ascii=False, indent=1)
    print(f'== {path}: {len(rep)} findings', flush=True)
