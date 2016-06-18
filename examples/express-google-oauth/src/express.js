import express from 'express';
import path from 'path';
import favicon from 'serve-favicon';
import logger from 'morgan';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import flash from 'express-flash';
import webpackDevMiddleware from "webpack-dev-middleware";
import webpack from "webpack";
import webpackConfig from '../webpack.config';
import sessionParser from './session-parser';

import routes from './routes/index';
import auth from './routes/auth';

const app = express();

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);
app.set('views', `${__dirname}/components`);
app.set('view engine', 'jsx');

app.engine('jsx', require('express-react-views').createEngine({
  transformViews: false
}));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sessionParser);
app.use(flash());
// app.use(express.static(path.join(__dirname, 'public')));
app.use(webpackDevMiddleware(webpack(webpackConfig), {}));

app.use('/', routes);
app.use('/', auth);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

export default app;

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
