const { sign, cookies, cookie } = require('../../lib/auth');
const { isMember } = require('../../lib/discord');

const avatar = u => u.avatar
  ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64`
  : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`;

module.exports = async (req, res) => {
  const go = to => res.redirect(302, to);
  try {
    const { code, state } = req.query;
    if (!code || !state || state !== cookies(req).cc_state) return go('/?error=login');
    const t = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID, client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code', code, redirect_uri: process.env.SITE_URL + '/auth/callback',
      }),
    });
    if (!t.ok) return go('/?error=login');
    const tok = await t.json();
    const me = await (await fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + tok.access_token } })).json();
    if (!(await isMember(me.id))) return go('/?error=notmember');
    const session = sign({ id: me.id, name: me.global_name || me.username, avatar: avatar(me), exp: Date.now() / 1000 + 30 * 86400 });
    res.setHeader('Set-Cookie', [cookie('cc_session', session, 30 * 86400), cookie('cc_state', '', 0)]);
    go('/');
  } catch (e) { console.error(e); go('/?error=login'); }
};
