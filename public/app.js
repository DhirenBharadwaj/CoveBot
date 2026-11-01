const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const wkLabel = w => 'Week ' + parseInt(String(w).split('-W')[1], 10);

let S = { pieces: [], user: null, max: 3, closes: 0, name: '', invite: '' };
let weeks = [], wsel = 0, painted = false;
const left = () => S.max - S.pieces.filter(p => p.mine).length;

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3200);
}

async function api(path, opts) {
  const r = await fetch(path, opts);
  if (!r.ok) throw r;
  return r.json();
}

/* ---------- data ---------- */
async function load(initial) {
  try {
    S = { ...S, ...(await api('/api/state')) };
    const sc = await api('/api/showcase');
    weeks = [{ k: wkLabel(sc.live.week), live: true, list: sc.live.top },
             ...sc.past.map(w => ({ k: wkLabel(w.week), list: w.winners }))];
  } catch (e) { toast('Couldn’t reach the server. Is the bot running?'); }
  const err = new URLSearchParams(location.search).get('error');
  if (err) {
    toast(err === 'notmember' ? 'Join the server first, then log in to vote.' : 'Login failed. Try again.');
    history.replaceState(null, '', location.pathname + location.hash);
  }
  render();
  if (initial) route();
  else if (!$('#showpage').hidden) showPage();
}

async function vote(id) {
  if (!S.user) { location.href = '/auth/login'; return; }
  try {
    S = { ...S, ...(await api('/api/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })) };
    const sc = await api('/api/showcase');
    weeks[0] = { k: wkLabel(sc.live.week), live: true, list: sc.live.top };
  } catch (r) {
    const j = r.json ? await r.json().catch(() => ({})) : {};
    toast(j.error || 'Something went wrong.');
    return;
  }
  paint();
}

/* ---------- render ---------- */
function paint() { const y = scrollY; render(); scrollTo(0, y); }

function render() {
  document.title = S.name ? S.name + ' · Weekly Showcase' : 'Weekly Showcase';
  $('#brand').textContent = S.name;
  $('#join').hidden = !S.invite;
  $('#join').href = S.invite || '#';
  $('#auth').innerHTML = S.user ? `<span class="me"><img alt="" src="${esc(S.user.avatar)}">${esc(S.user.name)} · <a href="/auth/logout">Log out</a></span>`
    : '<a href="/auth/login">Log in</a>';

  const rv = painted ? '' : 'rv';
  $('#wall').innerHTML = S.pieces.length ? S.pieces.map(p => `
    <div class="item ${rv}" data-id="${p.id}">
      <div class="im"><img class="art" loading="lazy" alt="${esc(p.title)}" src="${esc(p.img)}"></div>
      <div class="cap"><div><b>${esc(p.title)}</b><small>${p.avatar ? `<img class="av" alt="" src="${esc(p.avatar)}">` : ''}${esc(p.artist)} · ${p.votes} votes</small></div>
      <button class="v ${p.mine ? 'on' : ''}">${p.mine ? 'Voted' : 'Vote'}</button></div>
    </div>`).join('') : '<p class="empty">No art yet this week. Post in #art to be the first.</p>';

  const top = [...S.pieces].sort((a, b) => b.votes - a.votes).filter(p => p.votes > 0).slice(0, 3);
  $('#wins').innerHTML = top.length ? top.map((p, i) => `
    <div class="win ${rv}"><div class="n">0${i + 1}</div>
    <div><h3>${esc(p.title)}</h3><p>by ${esc(p.artist)} · ${p.votes} votes</p></div>
    <img alt="${esc(p.title)}" src="${esc(p.img)}"></div>`).join('') : '<p class="empty">No votes yet. Be the first to vote.</p>';

  const past = weeks.slice(1).flatMap(w => w.list.map(p => ({ ...p, k: w.k }))).slice(0, 9);
  $('#arch').innerHTML = past.length ? past.map(p => `<figure><img alt="${esc(p.title)}" src="${esc(p.img)}"><figcaption><b>${esc(p.title)}</b><br>${esc(p.artist)} · ${p.k}</figcaption></figure>`).join('')
    : '<p class="empty">The first showcase lands this Sunday.</p>';

  $('#dots').innerHTML = Array.from({ length: S.max }, (_, i) => `<i class="${i < left() ? 'f' : ''}"></i>`).join('');
  $('#cP').textContent = S.pieces.length;
  $('#cV').textContent = S.pieces.reduce((s, p) => s + p.votes, 0);
  const names = [...new Set(S.pieces.map(p => p.artist))];
  $('#mq').innerHTML = names.length ? (names.map(a => `${esc(a)}<i>✦</i>`).join('')).repeat(Math.max(2, Math.ceil(12 / names.length)) * 2) : '';
  painted = true;
  document.querySelectorAll('.rv:not(.in)').forEach(e => io.observe(e));
}

function showPage() {
  $('#weeks').innerHTML = weeks.map((w, i) => `<button class="wk ${i === wsel ? 'on' : ''}" data-w="${i}">${w.live ? '<i></i>' : ''}${w.k}</button>`).join('');
  const w = weeks[wsel], list = w ? w.list : [];
  if (!list.length) { $('#spBody').innerHTML = '<p class="empty">Nothing here yet. Votes decide who lands in this showcase.</p>'; return; }
  const cap = x => `<div class="cap"><div><b>${esc(x.title)}</b><br><small>${esc(x.artist)}</small></div><span class="medal">${x.votes} votes</span></div>`;
  $('#spBody').innerHTML = `
    <div class="first"><img alt="${esc(list[0].title)}" src="${esc(list[0].img)}"><div class="tag"><span class="medal">01 · ${w.live ? 'Leading' : 'Winner'}</span><b>${esc(list[0].title)}</b>${esc(list[0].artist)} · ${list[0].votes} votes</div></div>
    <div class="pair">${list.slice(1).map(x => `<div><img alt="${esc(x.title)}" src="${esc(x.img)}">${cap(x)}</div>`).join('')}</div>
    ${w.live ? '<p class="note">Still open. This lineup locks in on Sunday at midnight.</p>' : ''}`;
}

/* ---------- interactions ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .1 });

document.addEventListener('click', e => {
  const wk = e.target.closest('.wk');
  if (wk) { wsel = +wk.dataset.w; return showPage(); }
  const item = e.target.closest('.item');
  if (item) vote(item.dataset.id);
});

const cur = $('#cur');
addEventListener('mousemove', e => {
  cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px';
  cur.classList.toggle('big', !!e.target.closest('.item'));
});

function tick() {
  const ms = Math.max(0, S.closes - Date.now());
  $('#cT').textContent = S.closes ? `${Math.floor(ms / 864e5)}d ${Math.floor(ms % 864e5 / 36e5)}h` : '–';
}

function route() {
  const h = location.hash, sp = h === '#showcase';
  $('#home').hidden = sp; $('#showpage').hidden = !sp; $('.dock').hidden = sp;
  if (sp) { wsel = 0; showPage(); scrollTo(0, 0); }
  else if (!h || h === '#home') scrollTo(0, 0);
  else { const el = document.querySelector(h); if (el) el.scrollIntoView(); }
}
addEventListener('hashchange', route);

setInterval(tick, 6e4);
setInterval(() => { if (!document.hidden) load(false); }, 120000);
load(true).then(tick);
