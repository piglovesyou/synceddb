import express from 'express';
const router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
  const data = {
    title: 'Express',
    flash: req.session.flash,
    profile: req.session.profile
  };
  data.json = JSON.stringify(data);
  res.render('index', data);
});

export default router;
