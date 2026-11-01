const { cookie } = require('../../lib/auth');

module.exports = (req, res) => {
  res.setHeader('Set-Cookie', cookie('cc_session', '', 0));
  res.redirect(302, '/');
};
