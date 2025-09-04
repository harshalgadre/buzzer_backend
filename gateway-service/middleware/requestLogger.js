import morgan from 'morgan';

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req, res) => {
  if (!req._startAt || !res._startAt) {
    return '';
  }
  const ms = (res._startAt[0] - req._startAt[0]) * 1000 +
    (res._startAt[1] - req._startAt[1]) * 1e-6;
  return ms.toFixed(3);
});

// Custom token for request body
morgan.token('request-body', (req) => {
  if (req.body && Object.keys(req.body).length) {
    return JSON.stringify(req.body);
  }
  return '-';
});

// Custom format string
const logFormat = '[:date[iso]] :method :url :status :response-time-ms ms - :res[content-length] - :request-body';

// Development logging format with colors
const developmentFormat = morgan((tokens, req, res) => {
  const status = tokens.status(req, res);
  const statusColor = status >= 500 ? '\x1b[31m' : // red
    status >= 400 ? '\x1b[33m' : // yellow
    status >= 300 ? '\x1b[36m' : // cyan
    '\x1b[32m'; // green

  return [
    '\x1b[90m' + tokens.date(req, res, 'iso'), // gray
    tokens.method(req, res),
    tokens.url(req, res),
    statusColor + status + '\x1b[0m',
    tokens['response-time-ms'](req, res) + ' ms',
    '-',
    tokens.res(req, res, 'content-length'),
    '-',
    tokens['request-body'](req, res)
  ].join(' ');
});

// Production logging format
const productionFormat = morgan(logFormat);

export const requestLogger = (env = 'development') => {
  return env === 'production' ? productionFormat : developmentFormat;
};