const { showcase } = require('../lib/core');

module.exports = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(await showcase());
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
};
