const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', {
    title: 'Express',
    flash: req.session.flash,
    name: req.session.profile && req.session.profile.name
  });
});

module.exports = router;
