// Daily job (see vercel.json): closes finished weeks even if nobody visited.
const { closeWeeks } = require('../lib/core');

module.exports = async (req, res) => {
  const s = process.env.CRON_SECRET;
  if (s && req.headers.authorization !== 'Bearer ' + s) return res.status(401).end();
  await closeWeeks(true);
  res.status(200).json({ ok: true });
};
