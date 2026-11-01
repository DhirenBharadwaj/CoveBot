const crypto = require('crypto');
const { cookie } = require('../../lib/auth');

module.exports = (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const q = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID, redirect_uri: process.env.SITE_URL + '/auth/callback',
    response_type: 'code', scope: 'identify', state, prompt: 'none',
  });
  res.setHeader('Set-Cookie', cookie('cc_state', state, 600));
  res.redirect(302, 'https://discord.com/oauth2/authorize?' + q);
};
