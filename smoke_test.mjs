// Headless smoke test via Chrome DevTools Protocol (no deps). Plays through a lesson answering correctly.
import { spawn } from 'node:child_process';
// usage: python3 -m http.server 8123 &  then  node smoke_test.mjs [url]   (CHROME env overrides binary path)
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const url = process.argv[2] || 'http://localhost:8123/#lesson=ch01-1';
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9333', '--window-size=480,1200', 'about:blank'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));
const targets = await (await fetch('http://localhost:9333/json')).json();
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = {}; const logs = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; } if (m.method === 'Runtime.consoleAPICalled' || m.method === 'Runtime.exceptionThrown') logs.push(JSON.stringify(m.params).slice(0, 300)); };
const send = (method, params = {}) => new Promise(r => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description||'')); return r.result.result.value; };
await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url });
await new Promise(r => setTimeout(r, 1500));
const sleep = ms => new Promise(r => setTimeout(r, ms));
console.log('study title:', await ev(`document.querySelector('#lesson .study h2')?.textContent`));
await ev(`document.querySelector('#go').click()`);
let steps = 0;
while (steps++ < 60) {
  await sleep(60);
  const st = await ev(`(()=>{const l=document.querySelector('#lesson');if(l.hidden)return 'closed';if(l.querySelector('#done'))return 'result';if(l.querySelector('#retry'))return 'fail';if(l.querySelector('#cont'))return 'feedback';return 'exercise'})()`);
  if (st === "result") { console.log('RESULT:', await ev(`document.querySelector('.result').innerText.replace(/\\n+/g,' | ')`)); break; }
  if (st === 'fail') throw new Error('hearts depleted');
  if (st === 'feedback') { await ev(`document.querySelector('#cont').click()`); continue; }
  // answer correctly using internal exercise data: find current exercise by matching question text
  const ok = await ev(`(()=>{
    const q=document.querySelector('#lesson .q')?.textContent; if(!q) return 'noq';
    const ex=L.current; if(!ex) return 'noex';
    const opts=[...document.querySelectorAll('#lesson .opts .opt')];
    if(ex.type==='tf'){opts[ex.answer?0:1].click();}
    else if(['mc','fill','output'].includes(ex.type)){opts[ex.answer].click();}
    else if(ex.type==='order'){for(let i=0;i<ex.items.length;i++){[...document.querySelectorAll('#chips .chip')].find(c=>c.textContent===ex.items[i]).click();}}
    else if(ex.type==='match'){for(const [l,r] of ex.pairs){[...document.querySelectorAll('#mL .opt')].find(b=>!b.classList.contains('paired')&&b.textContent===l.replace(/\x60/g,"")).click();[...document.querySelectorAll('#mR .opt')].find(b=>!b.classList.contains('paired')&&b.textContent===r.replace(/\x60/g,"")).click();}}
    const c=document.querySelector('#check'); if(c&&!c.disabled&&ex.type!=='match') c.click();
    return ex.type;
  })()`);
  if (ok === 'noq' || ok === 'noex') throw new Error('cannot locate exercise: ' + ok);
  process.stdout.write(ok + ' ');
}
console.log('\nstate:', await ev(`JSON.stringify(JSON.parse(localStorage.getItem('rustlingo.v1')))`));
if (logs.length) console.log('CONSOLE:', logs.join('\n'));
const bad = logs.some(l => l.includes('exceptionThrown') || l.includes('"type":"error"'));
chrome.kill(); ws.close(); process.exit(bad ? 1 : 0);
