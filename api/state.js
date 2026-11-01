const { getUser } = require('../lib/auth');
const { buildState, closeWeeks } = require('../lib/core');

module.exports = async (req, res) => {
  try {
    await closeWeeks();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(await buildState(getUser(req)));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
};
