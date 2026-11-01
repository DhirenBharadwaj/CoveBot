// Past winners' images: Discord links expire, so look up a fresh one and redirect (cached 6h at the edge).
const { redis } = require('../lib/redis');
const D = require('../lib/discord');

module.exports = async (req, res) => {
  const { m, a } = req.query;
  if (!/^\d+$/.test(m || '') || !/^\d+$/.test(a || '')) return res.status(400).end();
  try {
    let url = await redis.get('img:' + a);
    if (!url) {
      const msg = await D.call(`/channels/${process.env.ART_CHANNEL_ID}/messages/${m}`);
      const att = (msg.attachments || []).find(x => x.id === a);
      if (!att) return res.status(404).end();
      url = att.url;
      await redis.set('img:' + a, url, { ex: 21600 });
    }
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=21600');
    res.redirect(302, url);
  } catch { res.status(404).end(); }
};
