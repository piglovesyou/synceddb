const express = require('express');
const router = express.Router();
const google = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const oauth2 = google.oauth2('v2');
const concentUrl = createOAuth2Client().generateAuthUrl({ scope: [ 'profile' ] });

router.get('/login', (req, res, next) => {
  res.redirect(concentUrl);
});

router.get('/logout', (req, res, next) => {
  req.session.destroy();
  res.redirect('/');
});

router.get('/oauth2callback', (req, res, next) => {
  const code = req.param('code');
  const oauth2Client = createOAuth2Client();
  oauth2Client.getToken(code, (err, tokens) => {
    if (err) res.status(500).send('baaa');
    oauth2Client.setCredentials(tokens);
    req.session.tokens = tokens;
    oauth2.userinfo.get({ auth: oauth2Client }, (err, profile) => {
      if (err) res.status(500).send('baaa');
      req.session.profile = profile;
      req.flash('success', `${profile.name} is successfully logged in`);
      res.redirect('/');
    });
  });
});

module.exports = router;

function createOAuth2Client() {
  return new OAuth2(
    process.env.SYNCEDDB_EXAMPLE_CLIENT_ID,
    process.env.SYNCEDDB_EXAMPLE_CLIENT_SECRET,
    process.env.SYNCEDDB_EXAMPLE_REDIRECT_URI);
}
