const crypto = require('crypto');
const SECURE = (process.env.SITE_URL || '').startsWith('https');
const mac = raw => crypto.createHmac('sha256', process.env.SECRET_KEY).update(raw).digest('hex');

function sign(data) {
  const raw = Buffer.from(JSON.stringify(data)).toString('base64url');
  return raw + '.' + mac(raw);
}
function unsign(tok) {
  try {
    const i = tok.lastIndexOf('.');
    const raw = tok.slice(0, i), sig = tok.slice(i + 1), good = mac(raw);
    if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
    const d = JSON.parse(Buffer.from(raw, 'base64url').toString());
    return d.exp > Date.now() / 1000 ? d : null;
  } catch { return null; }
}
function cookies(req) {
  const o = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) o[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return o;
}
const getUser = req => { const t = cookies(req).cc_session; return t ? unsign(t) : null; };
const cookie = (name, val, maxAge) =>
  `${name}=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${SECURE ? '; Secure' : ''}`;

module.exports = { sign, getUser, cookies, cookie };
