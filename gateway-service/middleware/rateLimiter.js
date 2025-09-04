import rateLimit from 'express-rate-limit';

const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      status: 'error',
      message: 'Too many requests from this IP, please try again later.',
      details: 'Rate limit exceeded'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  };

  return rateLimit({
    ...defaultOptions,
    ...options,
    handler: (req, res) => {
      res.status(429).json({
        status: 'error',
        message: options.message || defaultOptions.message.message,
        details: 'Rate limit exceeded',
        path: req.path,
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Different rate limiters for different endpoints
export const rateLimiters = {
  // General API rate limiter
  api: createRateLimiter(),

  // More strict rate limiter for authentication endpoints
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: 'Too many authentication attempts, please try again later.'
  }),

  // Rate limiter for interview creation
  interview: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // Limit each IP to 30 interview creations per hour
    message: 'Interview creation rate limit exceeded, please try again later.'
  })
};