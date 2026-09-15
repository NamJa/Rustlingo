/* Rustlingo — Duolingo-style tutorial for The Rust Programming Language */
'use strict';

const CHAPTER_IDS = Array.from({ length: 22 }, (_, i) => 'ch' + String(i + 1).padStart(2, '0'));
const SECTIONS = [
  { title: '입문', sub: 'SECTION 1', chapters: ['ch01', 'ch02', 'ch03'] },
  { title: '핵심 개념', sub: 'SECTION 2', chapters: ['ch04', 'ch05', 'ch06', 'ch07', 'ch08', 'ch09'] },
  { title: '추상화와 테스트', sub: 'SECTION 3', chapters: ['ch10', 'ch11', 'ch12', 'ch13'] },
  { title: '심화', sub: 'SECTION 4', chapters: ['ch14', 'ch15', 'ch16', 'ch17'] },
  { title: '마스터', sub: 'SECTION 5', chapters: ['ch18', 'ch19', 'ch20', 'ch21', 'ch22'] },
];
const XP_PER_CORRECT = 10, XP_LESSON = 20, XP_PERFECT = 10, MAX_HEARTS = 5, XP_PER_LEVEL = 200;

// ---------- state ----------
const KEY = 'rustlingo.v1';
const state = load();
function load() {
  try { return Object.assign({ xp: 0, streak: 0, lastDay: '', done: {}, perfect: 0, free: false }, JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch { return { xp: 0, streak: 0, lastDay: '', done: {}, perfect: 0, free: false }; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { } }
const today = () => new Date().toISOString().slice(0, 10);
function bumpStreak() {
  const t = today();
  if (state.lastDay === t) return;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  state.streak = state.lastDay === y ? state.streak + 1 : 1;
  state.lastDay = t;
}
const level = () => 1 + Math.floor(state.xp / XP_PER_LEVEL);

// ---------- data ----------
let chapters = [], lessons = [];
async function loadData() {
  const res = await Promise.all(CHAPTER_IDS.map(id => fetch(`data/${id}.json`).then(r => r.ok ? r.json() : null).catch(() => null)));
  chapters = res.filter(Boolean);
  lessons = chapters.flatMap(c => c.lessons.map(l => Object.assign(l, { chapter: c })));
}
const lessonIndex = id => lessons.findIndex(l => l.id === id);
function unlocked(l) {
  if (state.free) return true;
  const i = lessonIndex(l.id);
  return i === 0 || !!state.done[lessons[i - 1].id];
}
const chapterPct = c => Math.round(100 * c.lessons.filter(l => state.done[l.id]).length / c.lessons.length);

// ---------- utils ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
function hl(code) {
  // tiny Rust highlighter: comments, strings, macros, keywords, numbers
  let out = String(code).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); // no quote entities: digit regex below would split them
  const KW = /\b(fn|let|mut|const|static|if|else|match|loop|while|for|in|return|break|continue|struct|enum|impl|trait|pub|use|mod|crate|self|Self|super|as|where|type|dyn|move|ref|unsafe|async|await|extern|true|false|Some|None|Ok|Err|String|Vec|Option|Result|Box|Rc|Arc|RefCell|i32|u32|i64|u64|usize|isize|u8|f64|f32|bool|char|str)\b/g;
  out = out.replace(/(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)')|(\b[a-zA-Z_]\w*!)|(\b\d[\d_]*(?:\.\d+)?\b)|('[a-z_]+\b)/g,
    (m, c, s, mac, n, lt) => c ? `<span class="c">${c}</span>` : s ? `<span class="s">${s}</span>` : mac ? `<span class="m">${mac}</span>` : n ? `<span class="n">${n}</span>` : `<span class="k">${lt}</span>`);
  // keywords outside spans (good enough for teaching snippets)
  out = out.split(/(<span[^>]*>.*?<\/span>)/gs).map(p => p.startsWith('<span') ? p : p.replace(KW, '<span class="k">$1</span>')).join('');
  return out;
}
const codeBlock = c => `<pre class="code">${hl(c)}</pre>`;
// ---------- Rust Playground (play.rust-lang.org) ----------
const PG = 'https://play.rust-lang.org';
const snippets = [];
const pgSource = code => /\bfn\s+main\s*\(/.test(code) ? code : `#![allow(unused)]\nfn main() {\n${code}\n}`;
const pgLink = code => `${PG}/?version=stable&edition=2024&code=${encodeURIComponent(pgSource(code))}`;
function runnable(code) {
  const i = snippets.push(code) - 1;
  return `<div class="runwrap">${codeBlock(code)}<div class="runbar"><button class="run" data-i="${i}">▶ 실행</button><a class="pg" href="${pgLink(code)}" target="_blank" rel="noopener">Playground에서 열기 ↗</a></div><pre class="out" id="out-${i}" hidden></pre></div>`;
}
async function runSnippet(i) {
  const out = $('#out-' + i, L.el), btn = L.el.querySelector(`.run[data-i="${i}"]`);
  out.hidden = false; out.textContent = '컴파일 중… (play.rust-lang.org)'; out.className = 'out'; btn.disabled = true;
  try {
    const r = await fetch(PG + '/evaluate.json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: 'stable', optimize: '0', edition: '2024', code: pgSource(snippets[i]) }) });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    out.textContent = j.result?.trim() || '(출력 없음)';
    if (/^error(\[E\d+\])?:/m.test(j.result)) out.classList.add('err');
  } catch (e) {
    out.classList.add('err'); out.textContent = `실행 실패: ${e.message}\nPlayground에서 열기 링크로 직접 실행해보세요.`;
  }
  btn.disabled = false;
}
function md(text) {
  // minimal markdown: ```code```, paragraphs, **bold**, `code`, "- " lists
  const parts = text.split(/```(rust|toml|text|bash|console|sh)?\n?([\s\S]*?)```/g);
  return parts.map((p, i) => {
    if (i % 3 === 1) return ''; // language tag
    if (i % 3 === 2) { const c = p.replace(/\n$/, ''); return parts[i - 1] && parts[i - 1] !== 'rust' ? codeBlock(c) : runnable(c); }
    return p.split(/\n\s*\n/).filter(s => s.trim()).map(par => {
      const lines = par.trim().split('\n');
      const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
      if (lines.every(l => /^\s*[-*] /.test(l))) return '<ul>' + lines.map(l => `<li>${inline(l.replace(/^\s*[-*] /, ''))}</li>`).join('') + '</ul>';
      if (/^#{1,4} /.test(lines[0])) return `<h4>${inline(lines[0].replace(/^#+ /, ''))}</h4>` + (lines.length > 1 ? `<p>${inline(lines.slice(1).join(' '))}</p>` : '');
      return `<p>${inline(lines.join(' '))}</p>`;
    }).join('');
  }).join('');
}
const inl = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); // `inline code` in prose
const optLabel = s => /[가-힣]/.test(s) ? inl(s) : (/[{};()=:<>!&]|::|->/.test(s) && s.length < 80 ? `<code>${esc(s)}</code>` : esc(s));

// ---------- header ----------
function renderStats() {
  $('#st-streak').textContent = state.streak;
  $('#st-xp').textContent = state.xp;
  $('#st-level').textContent = level();
}

// ---------- tabs ----------
let tab = 'path';
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  tab = b.dataset.tab;
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x === b));
  render();
});
function render() {
  renderStats();
  const v = $('#view');
  v.innerHTML = { path: renderPath, curriculum: renderCurriculum, practice: renderPractice, profile: renderProfile }[tab]();
  bind(v);
}
function bind(root) {
  root.querySelectorAll('[data-lesson]').forEach(b => b.onclick = () => startLesson(lessons[lessonIndex(b.dataset.lesson)]));
  const p = $('#practice-btn', root); if (p) p.onclick = startPractice;
  const f = $('#free-toggle', root); if (f) f.onchange = () => { state.free = f.checked; save(); render(); };
  const r = $('#reset', root); if (r) r.onclick = () => { if (confirm('모든 학습 진행 상황을 삭제할까요?')) { localStorage.removeItem(KEY); location.reload(); } };
}

// ---------- path tab ----------
function renderPath() {
  if (!chapters.length) return '<div class="empty">학습 데이터를 불러올 수 없습니다. data/ 폴더를 확인하세요.</div>';
  const next = lessons.find(l => !state.done[l.id] && unlocked(l));
  let html = `<div class="hero"><h1>🦀 Rust 배우기</h1><p>《The Rust Programming Language》를 한 걸음씩. ${next ? `다음 레슨: <b>${esc(next.title)}</b>` : '모든 레슨을 완료했어요! 🎉'}</p></div>`;
  SECTIONS.forEach(sec => {
    const chs = sec.chapters.map(id => chapters.find(c => c.id === id)).filter(Boolean);
    if (!chs.length) return;
    html += `<section class="section"><div class="section-hd"><small>${sec.sub}</small><h2>${esc(sec.title)}</h2></div>`;
    chs.forEach(c => {
      html += `<div class="chapter"><div class="chapter-hd"><span class="em">${c.emoji || '📘'}</span><div><h3>${c.number}. ${esc(c.title)}</h3><small>${esc(c.titleEn)} · ${c.lessons.length}개 레슨</small></div><span class="pct">${chapterPct(c)}%</span></div><div class="nodes">`;
      c.lessons.forEach((l, i) => {
        const done = !!state.done[l.id], un = unlocked(l);
        const cls = done ? 'done' : un ? 'active' : 'locked';
        const pos = ['', 'l', '', 'r'][i % 4];
        html += `<div class="node-wrap ${pos}"><button class="node ${cls}" data-lesson="${l.id}" ${un ? '' : 'disabled'} aria-label="${esc(l.title)}">${done ? '👑' : un ? '★' : '🔒'}${!done && un && l === next ? '<span class="lbl">시작</span>' : ''}<span class="title">${esc(l.title)}</span></button></div>`;
      });
      html += '</div></div>';
    });
    html += '</section>';
  });
  return html;
}

// ---------- curriculum tab ----------
function renderCurriculum() {
  const total = lessons.length, done = Object.keys(state.done).filter(id => lessonIndex(id) >= 0).length;
  let html = `<div class="card"><h3>📚 커리큘럼</h3><p class="muted">책 22개 단원(부록 포함) → ${SECTIONS.length}개 섹션, ${chapters.length}개 챕터, ${total}개 레슨. 레슨당 약 10~15분.</p><div class="row"><div class="bar"><i style="width:${total ? 100 * done / total : 0}%"></i></div><b>${done}/${total}</b></div></div>`;
  SECTIONS.forEach(sec => {
    html += `<div class="card"><h3>${esc(sec.sub)} · ${esc(sec.title)}</h3><table class="cur">`;
    sec.chapters.map(id => chapters.find(c => c.id === id)).filter(Boolean).forEach(c => {
      html += `<tr class="ch"><td colspan="2">${c.emoji || ''} ${c.number}. ${esc(c.title)} <span class="muted" style="font-weight:400">— 책 p.${esc(c.pages || '')}</span></td><td><span class="tag ${chapterPct(c) === 100 ? 'ok' : ''}">${chapterPct(c)}%</span></td></tr>`;
      if (c.intro) html += `<tr><td colspan="3" class="muted" style="font-weight:400;padding-left:26px">${esc(c.intro)}</td></tr>`;
      c.lessons.forEach(l => {
        const d = state.done[l.id];
        html += `<tr class="lesson"><td>${esc(l.title)}</td><td>${l.exercises.length}문제</td><td>${d ? `<span class="tag ok">완료 ${d.best}%</span>` : unlocked(l) ? `<button class="tag" data-lesson="${l.id}" style="border:0;cursor:pointer">시작</button>` : '🔒'}</td></tr>`;
      });
    });
    html += '</table></div>';
  });
  return html;
}

// ---------- practice tab ----------
function renderPractice() {
  const pool = lessons.filter(l => state.done[l.id]);
  return `<div class="card"><h3>🎯 복습 연습</h3><p class="muted">완료한 레슨(${pool.length}개)의 문제를 무작위로 10개 풀어요. 틀린 개념을 다시 다져보세요.</p><button id="practice-btn" class="btn blue wide" ${pool.length ? '' : 'disabled'}>${pool.length ? '연습 시작 (+XP)' : '먼저 레슨을 완료하세요'}</button></div>
  <div class="card"><h3>💡 학습 팁</h3><ul class="muted"><li>하트 5개로 레슨을 시작하고, 틀리면 하트가 하나 줄어요.</li><li>틀린 문제는 레슨 끝에 다시 나와요. 정답을 맞혀야 끝!</li><li>하루에 한 레슨이라도 완료하면 🔥 연속 기록이 이어져요.</li><li>코드는 실제로 <code>cargo run</code>으로 실행해보는 것이 가장 좋아요.</li></ul></div>`;
}

// ---------- profile tab ----------
function achievements() {
  const doneIds = Object.keys(state.done);
  const chDone = chapters.filter(c => chapterPct(c) === 100).length;
  return [
    ['🐣', '첫 걸음', '첫 레슨 완료', doneIds.length >= 1],
    ['📗', '챕터 완주', '챕터 1개 100%', chDone >= 1],
    ['🔑', '소유권 마스터', '4장 완료', chapterPct(chapters.find(c => c.id === 'ch04') || { lessons: [1] }) === 100],
    ['🧬', '트레이트 장인', '10장 완료', chapterPct(chapters.find(c => c.id === 'ch10') || { lessons: [1] }) === 100],
    ['🧵', '두려움 없는 동시성', '16장 완료', chapterPct(chapters.find(c => c.id === 'ch16') || { lessons: [1] }) === 100],
    ['🔥', '일주일 연속', '7일 스트릭', state.streak >= 7],
    ['⚡', 'XP 1000', '경험치 1000 달성', state.xp >= 1000],
    ['💎', '완벽주의자', '만점 레슨 10회', state.perfect >= 10],
    ['🏆', '절반 돌파', '챕터 11개 완료', chDone >= 11],
    ['🦀', 'Rustacean', '모든 챕터 완료', chapters.length > 0 && chDone === chapters.length],
  ];
}
function renderProfile() {
  const ach = achievements(), got = ach.filter(a => a[3]).length;
  const nextXp = level() * XP_PER_LEVEL;
  return `<div class="card"><div class="row"><span style="font-size:56px">🦀</span><div><div class="big">Lv.${level()}</div><div class="muted">다음 레벨까지 ${nextXp - state.xp} XP</div></div></div><div class="row" style="margin-top:8px"><div class="bar"><i style="width:${100 * (state.xp % XP_PER_LEVEL) / XP_PER_LEVEL}%"></i></div></div></div>
  <div class="grid2">
    <div class="card"><small class="muted">총 XP</small><div class="big">⚡ ${state.xp}</div></div>
    <div class="card"><small class="muted">연속 학습</small><div class="big">🔥 ${state.streak}일</div></div>
    <div class="card"><small class="muted">완료 레슨</small><div class="big">👑 ${Object.keys(state.done).length}</div></div>
    <div class="card"><small class="muted">만점 레슨</small><div class="big">💎 ${state.perfect}</div></div>
  </div>
  <div class="card"><h3>🏅 업적 (${got}/${ach.length})</h3><div class="ach">${ach.map(a => `<div class="a ${a[3] ? 'got' : ''}"><div class="em">${a[0]}</div><b>${a[1]}</b><small>${a[2]}</small></div>`).join('')}</div></div>
  <div class="card"><h3>⚙️ 설정</h3><label class="switch"><input type="checkbox" id="free-toggle" ${state.free ? 'checked' : ''}> 자유 모드 (모든 레슨 잠금 해제)</label><p class="muted" style="font-size:13px">진행 상황은 이 브라우저의 localStorage에만 저장됩니다.</p><button id="reset" class="btn red">진행 상황 초기화</button></div>`;
}

// ---------- lesson engine ----------
const L = { el: null, lesson: null, queue: [], idx: 0, hearts: MAX_HEARTS, correct: 0, total: 0, firstTry: {}, practice: false, retried: new Set() };

function startLesson(lesson) {
  Object.assign(L, { lesson, queue: lesson.exercises.slice(), hearts: MAX_HEARTS, correct: 0, total: lesson.exercises.length, firstTry: {}, practice: false, retried: new Set(), idx: 0 });
  L.el = $('#lesson'); L.el.hidden = false;
  showStudy();
}
function startPractice() {
  const pool = shuffle(lessons.filter(l => state.done[l.id]).flatMap(l => l.exercises)).slice(0, 10);
  Object.assign(L, { lesson: { id: 'practice', title: '복습 연습', exercises: pool }, queue: pool, hearts: MAX_HEARTS, correct: 0, total: pool.length, firstTry: {}, practice: true, retried: new Set(), idx: 0 });
  L.el = $('#lesson'); L.el.hidden = false;
  nextExercise();
}
function closeLesson() { L.el.hidden = true; render(); }

function frame(bodyHtml, footHtml, progress) {
  L.el.innerHTML = `<div class="hd"><button class="x" aria-label="닫기">✕</button><div class="bar"><i style="width:${progress}%"></i></div><span class="hearts">${'❤️'.repeat(L.hearts)}${'🖤'.repeat(MAX_HEARTS - L.hearts)}</span></div>
  <div class="body"><div class="inner">${bodyHtml}</div></div>
  <div class="ft"><div class="inner">${footHtml}</div></div>`;
  $('.x', L.el).onclick = () => { if (confirm('레슨을 나갈까요? 진행 상황은 저장되지 않아요.')) closeLesson(); };
}

function showStudy() {
  const l = L.lesson;
  frame(`<div class="study"><small class="muted">${esc(l.chapter.title)} · 책 p.${esc(l.chapter.pages || '')}</small><h2>${esc(l.title)}</h2><div class="md">${md(l.summary || '')}</div>${l.keyPoints?.length ? `<div class="kp"><b>핵심 정리</b><ul>${l.keyPoints.map(k => `<li>${inl(k)}</li>`).join('')}</ul></div>` : ''}</div>`,
    `<span class="muted">문제 ${l.exercises.length}개</span><button class="btn" id="go">문제 풀기 →</button>`, 0);
  $('#go', L.el).onclick = nextExercise;
  L.el.querySelectorAll('.run').forEach(b => b.onclick = () => runSnippet(+b.dataset.i));
}

function nextExercise() {
  if (!L.queue.length) return showResult();
  const ex = L.queue.shift(); L.current = ex;
  const progress = 100 * (L.total - L.queue.length - 1) / L.total;
  const r = RENDER[ex.type] ? RENDER[ex.type](ex) : { html: `<p>알 수 없는 문제 유형: ${esc(ex.type)}</p>`, check: () => true };
  frame(r.html, `<button class="btn ghost" id="skip">건너뛰기</button><button class="btn" id="check" disabled>확인</button>`, progress);
  const checkBtn = $('#check', L.el);
  r.init && r.init(checkBtn);
  $('#skip', L.el).onclick = () => grade(ex, false, r);
  checkBtn.onclick = () => grade(ex, r.check(), r);
}

function grade(ex, ok, r) {
  const key = ex.q + (ex.code || '');
  if (!(key in L.firstTry)) L.firstTry[key] = ok;
  if (ok) { L.correct++; if (L.firstTry[key]) state.xp += XP_PER_CORRECT; }
  else { L.hearts--; if (!L.retried.has(ex)) { L.retried.add(ex); L.queue.push(ex); L.total++; } }
  r.reveal && r.reveal(ok);
  const ft = $('.ft', L.el); ft.classList.add(ok ? 'ok' : 'bad');
  $('.inner', ft).innerHTML = `<div class="fb"><h4>${ok ? ['정답이에요! 🎉', '훌륭해요! ✨', '완벽해요! 🦀'][Math.floor(Math.random() * 3)] : '아쉬워요 😢'}</h4><p>${ok ? inl(ex.explain || '') : (r.answerText ? `<b>정답: </b>${r.answerText} <br>` : '') + inl(ex.explain || '')}</p></div><button class="btn ${ok ? '' : 'red'}" id="cont">계속</button>`;
  $('#cont', L.el).onclick = () => L.hearts <= 0 ? showFail() : nextExercise();
  $('#cont', L.el).focus();
  save(); renderStats();
}

function showFail() {
  frame(`<div class="result"><div class="em">💔</div><h2>하트가 모두 소진되었어요</h2><p class="muted">괜찮아요. 해설을 다시 읽고 도전해봐요!</p></div>`,
    `<button class="btn ghost" id="quit">나가기</button><button class="btn" id="retry">다시 도전</button>`, 100);
  $('#quit', L.el).onclick = closeLesson;
  $('#retry', L.el).onclick = () => L.practice ? startPractice() : startLesson(L.lesson);
}

function showResult() {
  const answered = Object.values(L.firstTry);
  const acc = answered.length ? Math.round(100 * answered.filter(Boolean).length / answered.length) : 100;
  let bonus = 0;
  if (!L.practice) {
    bonus = XP_LESSON + (acc === 100 ? XP_PERFECT : 0);
    if (acc === 100) state.perfect++;
    const prev = state.done[L.lesson.id];
    state.done[L.lesson.id] = { best: Math.max(acc, prev?.best || 0), count: (prev?.count || 0) + 1, at: today() };
    bumpStreak();
  }
  state.xp += bonus; save();
  const earned = answered.filter(Boolean).length * XP_PER_CORRECT + bonus;
  frame(`<div class="result"><div class="em">${acc === 100 ? '🏆' : acc >= 70 ? '🎉' : '👍'}</div><h2>${acc === 100 ? '완벽한 레슨!' : '레슨 완료!'}</h2>
    <div class="grid2"><div class="card xp"><small>획득 XP</small><div class="big">⚡ ${earned}</div></div><div class="card acc"><small>정확도</small><div class="big">${acc}%</div></div></div>
    ${!L.practice && state.streak ? `<p class="muted" style="margin-top:16px">🔥 ${state.streak}일 연속 학습 중!</p>` : ''}</div>`,
    `<span></span><button class="btn" id="done">계속</button>`, 100);
  $('#done', L.el).onclick = closeLesson;
  renderStats();
}

// ---------- exercise renderers ----------
// each returns {html, init(checkBtn), check()->bool, reveal(ok), answerText}
function choiceRenderer(ex, { tf = false } = {}) {
  const opts = tf ? ['참 (True)', '거짓 (False)'] : ex.options;
  const answer = tf ? (ex.answer ? 0 : 1) : ex.answer;
  let sel = -1;
  const codeHtml = ex.code ? (ex.type === 'fill' ? `<pre class="code">${hl(ex.code).replace('___', '<span class="blank" id="blank">___</span>')}</pre>` : codeBlock(ex.code)) : '';
  return {
    html: `<div class="q">${inl(ex.q)}</div>${codeHtml}<div class="opts ${tf ? 'tf' : ''}">${opts.map((o, i) => `<button class="opt" data-i="${i}">${tf ? '' : `<span class="i">${i + 1}</span>`}<span>${optLabel(o)}</span></button>`).join('')}</div>`,
    init(checkBtn) {
      L.el.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        sel = +b.dataset.i;
        L.el.querySelectorAll('.opt').forEach(x => x.classList.toggle('sel', x === b));
        const bl = $('#blank', L.el); if (bl) bl.textContent = opts[sel];
        checkBtn.disabled = false;
      });
    },
    check: () => sel === answer,
    reveal(ok) {
      L.el.querySelectorAll('.opt').forEach((b, i) => { b.disabled = true; if (i === answer) b.classList.add('right'); else if (i === sel && !ok) b.classList.add('wrong'); });
      const bl = $('#blank', L.el); if (bl) bl.textContent = opts[answer];
    },
    answerText: optLabel(opts[answer]),
  };
}
function orderRenderer(ex) {
  const items = ex.items, pool = shuffle(items.map((_, i) => i));
  let placed = [];
  const draw = (checkBtn) => {
    $('#slots', L.el).innerHTML = placed.map(i => `<button class="chip" data-i="${i}">${esc(items[i])}</button>`).join('') || '<span class="muted" style="font-size:13px">아래 줄을 순서대로 눌러 배치하세요</span>';
    $('#chips', L.el).innerHTML = pool.filter(i => !placed.includes(i)).map(i => `<button class="chip" data-i="${i}">${esc(items[i])}</button>`).join('');
    $('#slots', L.el).querySelectorAll('.chip').forEach(b => b.onclick = () => { placed = placed.filter(i => i !== +b.dataset.i); draw(checkBtn); });
    $('#chips', L.el).querchips = $('#chips', L.el).querySelectorAll('.chip').forEach(b => b.onclick = () => { placed.push(+b.dataset.i); draw(checkBtn); });
    checkBtn.disabled = placed.length !== items.length;
  };
  return {
    html: `<div class="q">${inl(ex.q)}</div><div class="slots" id="slots"></div><div class="chips" id="chips"></div>`,
    init: draw,
    check: () => placed.every((v, i) => v === i),
    reveal(ok) { L.el.querySelectorAll('.chip').forEach(b => b.disabled = true); if (!ok) $('#slots', L.el).innerHTML = items.map(s => `<div class="chip" style="background:var(--green-l);border-color:var(--green)">${esc(s)}</div>`).join(''); },
    answerText: '',
  };
}
function matchRenderer(ex) {
  const pairs = ex.pairs, right = shuffle(pairs.map((_, i) => i));
  let selL = null, selR = null, matched = 0, mistakes = 0;
  return {
    html: `<div class="q">${inl(ex.q)}</div><div class="mgrid"><div class="mcol" id="mL">${pairs.map((p, i) => `<button class="opt" data-i="${i}">${optLabel(p[0])}</button>`).join('')}</div><div class="mcol" id="mR">${right.map(i => `<button class="opt" data-i="${i}">${optLabel(pairs[i][1])}</button>`).join('')}</div></div>`,
    init(checkBtn) {
      const pick = (side, b) => {
        const col = side === 'L' ? '#mL' : '#mR';
        $(col, L.el).querySelectorAll('.opt').forEach(x => x.classList.toggle('sel', x === b));
        if (side === 'L') selL = b; else selR = b;
        if (selL && selR) {
          if (selL.dataset.i === selR.dataset.i) { selL.classList.add('paired'); selR.classList.add('paired'); matched++; }
          else { mistakes++; selL.classList.add('shake'); selR.classList.add('shake'); setTimeout(() => L.el.querySelectorAll('.shake').forEach(x => x.classList.remove('shake')), 300); }
          selL.classList.remove('sel'); selR.classList.remove('sel'); selL = selR = null;
          if (matched === pairs.length) { checkBtn.disabled = false; checkBtn.click(); }
        }
      };
      $('#mL', L.el).querySelectorAll('.opt').forEach(b => b.onclick = () => pick('L', b));
      $('#mR', L.el).querySelectorAll('.opt').forEach(b => b.onclick = () => pick('R', b));
    },
    check: () => mistakes <= 1, // ponytail: one slip allowed; tighten if too lenient
    reveal() { L.el.querySelectorAll('.opt').forEach(b => b.disabled = true); },
    answerText: pairs.map(p => `${inl(p[0])} ↔ ${inl(p[1])}`).join(', '),
  };
}
const RENDER = {
  mc: ex => choiceRenderer(ex),
  output: ex => choiceRenderer(ex),
  fill: ex => choiceRenderer(ex),
  tf: ex => choiceRenderer(ex, { tf: true }),
  order: orderRenderer,
  match: matchRenderer,
};

// ---------- boot ----------
loadData().then(() => {
  render();
  const m = location.hash.match(/^#lesson=([\w-]+)(&start)?/); // deep link: #lesson=ch04-2 (study) / #lesson=ch04-2&start (straight to exercises)
  if (m) { const l = lessons[lessonIndex(m[1])]; if (l) { startLesson(l); if (m[2]) nextExercise(); } }
});
