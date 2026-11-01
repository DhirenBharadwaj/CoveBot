const { redis, getJSON, setJSON } = require('./redis');
const T = require('./time');
const D = require('./discord');

const MAX = 3;
const KEEP = 60 * 24 * 3600;

// This week's art, cached for 45s so busy moments don't hammer Discord.
async function livePieces() {
  const now = Date.now(), wk = T.weekKey(now), ck = 'cache:pieces:' + wk;
  let pieces = await getJSON(ck);
  if (!pieces) { pieces = await D.fetchPieces(T.weekStart(now)); await setJSON(ck, pieces, { ex: 45 }); }
  return { wk, pieces };
}

async function counts(wk, pieces) {
  if (!pieces.length) return [];
  const pl = redis.pipeline();
  pieces.forEach(p => pl.scard(`v:${wk}:${p.id}`));
  return (await pl.exec()).map(Number);
}

async function siteName() {
  if (process.env.SERVER_NAME) return process.env.SERVER_NAME;
  try {
    let n = await redis.get('guildname');
    if (!n) { n = (await D.call('/guilds/' + process.env.GUILD_ID)).name; await redis.set('guildname', n, { ex: 86400 }); }
    return n;
  } catch { return ''; }
}

const pub = (p, votes, mine) => ({ id: p.id, title: p.title, artist: p.artist, avatar: p.avatar, img: p.url, votes, mine });

async function buildState(user) {
  const { wk, pieces } = await livePieces();
  const c = await counts(wk, pieces);
  const mine = user ? new Set(await redis.smembers(`u:${wk}:${user.id}`)) : new Set();
  return {
    name: await siteName(), invite: process.env.INVITE_URL || '', max: MAX, week: wk,
    closes: T.weekEnd(Date.now()),
    user: user ? { name: user.name, avatar: user.avatar } : null,
    pieces: pieces.map((p, i) => pub(p, c[i], mine.has(p.id))),
  };
}

async function toggleVote(user, id) {
  const { wk, pieces } = await livePieces();
  const p = pieces.find(x => x.id === id);
  if (!p) return 'That piece isn’t open for voting.';
  if (p.authorId === user.id) return 'You can’t vote for your own art.';
  const uk = `u:${wk}:${user.id}`, vk = `v:${wk}:${id}`;
  if (await redis.sismember(uk, id)) {
    await redis.srem(uk, id); await redis.srem(vk, user.id);
  } else {
    if ((await redis.scard(uk)) >= MAX) return 'You’ve used all your votes. Remove one to switch.';
    await redis.sadd(uk, id); await redis.sadd(vk, user.id);
    await redis.expire(uk, KEEP); await redis.expire(vk, KEEP);
  }
  return null;
}

async function showcase() {
  await closeWeeks();
  const { wk, pieces } = await livePieces();
  const c = await counts(wk, pieces);
  const top = pieces.map((p, i) => pub(p, c[i], false))
    .filter(p => p.votes > 0).sort((a, b) => b.votes - a.votes).slice(0, 3);
  const weeks = await redis.zrange('closed', 0, 11, { rev: true });
  const raw = weeks.length ? await redis.mget(...weeks.map(w => 'win:' + w)) : [];
  const past = weeks.map((w, i) => ({
    week: w,
    winners: (raw[i] ? JSON.parse(raw[i]) : []).map(x => ({
      id: x.id, title: x.title, artist: x.artist, avatar: x.avatar, votes: x.votes,
      img: `/api/img?m=${x.msgId}&a=${x.id}`,
    })),
  })).filter(w => w.winners.length);
  return { live: { week: wk, top }, past };
}

// Lock in the top 3 for any finished week (runs on visits and on the daily cron).
async function finalize(wk, start, end) {
  const pieces = await D.fetchPieces(start, end);
  const c = await counts(wk, pieces);
  const winners = pieces.map((p, i) => ({ ...p, votes: c[i] }))
    .sort((a, b) => b.votes - a.votes || a.created - b.created)
    .filter(p => p.votes > 0).slice(0, 3)
    .map(p => ({ id: p.id, msgId: p.msgId, title: p.title, artist: p.artist, avatar: p.avatar, votes: p.votes }));
  await redis.set('win:' + wk, JSON.stringify(winners));
  await redis.zadd('closed', { score: start, member: wk });
  if (winners.length) {
    const medals = ['🥇', '🥈', '🥉'];
    await D.announce(`**Showcase for week ${parseInt(wk.split('-W')[1], 10)}**\n`
      + winners.map((w, i) => `${medals[i]} **${w.title}** by ${w.artist} (${w.votes} votes)`).join('\n')
      + `\n\n${process.env.SITE_URL}/#showcase`);
  }
}

async function closeWeeks(force) {
  try {
    const now = Date.now(), cur = T.weekStart(now), chk = 'chk:' + T.weekKey(now);
    if (!force && (await redis.get(chk))) return;
    await redis.set('installed', String(cur), { nx: true });
    const installed = Number(await redis.get('installed'));
    let end = cur;
    for (let i = 0; i < 4; i++) {
      const start = T.weekStart(end - 1);
      if (start < installed) break;
      const wk = T.weekKey(start);
      if ((await redis.zscore('closed', wk)) !== null) break;
      if (await redis.set('lock:' + wk, '1', { nx: true, ex: 120 })) await finalize(wk, start, end);
      end = start;
    }
    await redis.set(chk, '1', { ex: 600 });
  } catch (e) { console.error('closeWeeks failed', e.message); }
}

module.exports = { buildState, toggleVote, showcase, closeWeeks };
