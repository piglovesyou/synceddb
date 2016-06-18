import session from 'express-session';

export default session({
  secret: 'baaa',
  resave: false,
  saveUninitialized: true,
});
