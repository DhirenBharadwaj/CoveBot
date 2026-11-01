const { getUser } = require('../lib/auth');
const { buildState, toggleVote } = require('../lib/core');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Log in with Discord to vote.' });
    const id = String((req.body || {}).id || '');
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Bad request' });
    const err = await toggleVote(user, id);
    if (err) return res.status(400).json({ error: err });
    res.status(200).json(await buildState(user));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
};
