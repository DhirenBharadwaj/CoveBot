const API = 'https://discord.com/api/v10';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function call(path, opts = {}, tries = 0) {
  const r = await fetch(API + path, {
    ...opts,
    headers: { Authorization: 'Bot ' + process.env.BOT_TOKEN, 'Content-Type': 'application/json' },
  });
  if (r.status === 429 && tries < 2) {
    const j = await r.json().catch(() => ({}));
    await sleep(Math.min((j.retry_after || 1) * 1000, 3000));
    return call(path, opts, tries + 1);
  }
  if (!r.ok) { const e = new Error('Discord ' + r.status); e.status = r.status; throw e; }
  return r.status === 204 ? null : r.json();
}

const snowflake = ts => ((BigInt(ts) - 1420070400000n) << 22n).toString();
const avatarUrl = u => u.avatar
  ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64`
  : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`;

// Image posts in #art between startTs and endTs (endTs omitted = now), oldest first.
async function fetchPieces(startTs, endTs) {
  const out = [];
  let before = endTs ? snowflake(endTs) : null;
  let done = false;
  for (let page = 0; page < 6 && !done; page++) {
    const msgs = await call(`/channels/${process.env.ART_CHANNEL_ID}/messages?limit=100${before ? '&before=' + before : ''}`);
    if (!msgs.length) break;
    for (const m of msgs) {
      const ts = Date.parse(m.timestamp);
      if (ts < startTs) { done = true; continue; }
      if (m.author.bot) continue;
      for (const a of m.attachments || []) {
        if (!(a.content_type || '').startsWith('image/')) continue;
        out.push({
          id: a.id, msgId: m.id, authorId: m.author.id, created: ts, url: a.url,
          title: (m.content || '').trim().split('\n')[0].slice(0, 80) || a.filename.replace(/\.[^.]+$/, '').replace(/_/g, ' '),
          artist: m.author.global_name || m.author.username, avatar: avatarUrl(m.author),
        });
      }
    }
    before = msgs[msgs.length - 1].id;
    if (msgs.length < 100) break;
  }
  return out.sort((a, b) => a.created - b.created);
}

async function announce(text) {
  const ch = process.env.ANNOUNCE_CHANNEL_ID || process.env.ART_CHANNEL_ID;
  try { await call(`/channels/${ch}/messages`, { method: 'POST', body: JSON.stringify({ content: text }) }); }
  catch (e) { console.error('announce failed', e.message); }
}

async function isMember(uid) {
  try { await call(`/guilds/${process.env.GUILD_ID}/members/${uid}`); return true; }
  catch (e) { if (e.status === 404) return false; throw e; }
}

module.exports = { call, fetchPieces, announce, isMember };
