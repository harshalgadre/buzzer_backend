import express from 'express';
import proxy from 'express-http-proxy';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimiters } from './middleware/rateLimiter.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(requestLogger(process.env.NODE_ENV));

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Gateway service is running' });
});

// Proxy options
const proxyOptions = {
  proxyTimeout: 10000,  // 10 seconds
  timeout: 10000,
  proxyErrorHandler: (err, res, next) => {
    if (err.code === 'ECONNREFUSED') {
      res.status(503).json(createErrorResponse(
        503,
        'Service Unavailable',
        'The requested service is currently not available'
      ));
    } else {
      next(err);
    }
  }
};

// Service configurations
const services = {
  auth: {
    path: '/auth',
    port: process.env.AUTH_SERVICE_PORT || 6001,
    rateLimit: rateLimiters.auth
  },
  mockInterview: {
    path: '/mock-interview',
    port: process.env.MOCK_INTERVIEW_SERVICE_PORT || 6002,
    rateLimit: rateLimiters.interview
  },
  room: {
    path: '/room',
    port: process.env.ROOM_INTERVIEW_SERVICE_PORT || 6003,
    rateLimit: rateLimiters.api
  },
  liveInterview: {
    path: '/live-interview',
    port: process.env.LIVE_INTERVIEW_SERVICE_PORT || 6004,
    rateLimit: rateLimiters.interview
  }
};

// Apply rate limiters and proxy routes for each service
Object.values(services).forEach(service => {
  app.use(service.path, 
    service.rateLimit,
    proxy(`http://localhost:${service.port}`, proxyOptions)
  );
});

// Custom error response function
const createErrorResponse = (statusCode, message, details = null) => ({
  status: 'error',
  timestamp: new Date().toISOString(),
  message,
  ...(details && { details }),
  path: null // Will be set in error handler
});

// Service availability check middleware
const checkServiceAvailability = async (serviceUrl) => {
  try {
    const response = await fetch(`${serviceUrl}/health`, { timeout: 5000 });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Error handling middleware
app.use(async (err, req, res, next) => {
  console.error(`[Error] ${err.stack}`);

  // Set the request path in error response
  const errorResponse = createErrorResponse(
    err.status || 500,
    err.message || 'Internal Server Error',
    process.env.NODE_ENV === 'development' ? err.stack : null
  );
  errorResponse.path = req.path;

  // Check if error is related to service availability
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    const servicePath = req.path.split('/')[1];
    const servicePort = {
      'auth': process.env.AUTH_SERVICE_PORT || 6001,
      'mock-interview': process.env.MOCK_INTERVIEW_SERVICE_PORT || 6002,
      'room': process.env.ROOM_INTERVIEW_SERVICE_PORT || 6003,
      'live-interview': process.env.LIVE_INTERVIEW_SERVICE_PORT || 6004
    }[servicePath];

    if (servicePort) {
      const isAvailable = await checkServiceAvailability(`http://localhost:${servicePort}`);
      if (!isAvailable) {
        errorResponse.message = `Service '${servicePath}' is currently unavailable`;
        errorResponse.details = 'The requested microservice is not responding';
        return res.status(503).json(errorResponse);
      }
    }
  }

  // Handle different types of errors
  switch (err.name) {
    case 'ValidationError':
      return res.status(400).json({
        ...errorResponse,
        message: 'Validation Error',
        details: err.details
      });
    case 'UnauthorizedError':
      return res.status(401).json({
        ...errorResponse,
        message: 'Authentication Required'
      });
    default:
      return res.status(err.status || 500).json(errorResponse);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Gateway service running on http://localhost:${PORT}`);
  console.log('Routes:');
  console.log(`- Auth Service: http://localhost:${PORT}/auth`);
  console.log(`- Mock Interview Service: http://localhost:${PORT}/mock-interview`);
  console.log(`- Room Service: http://localhost:${PORT}/room`);
  console.log(`- Live Interview Service: http://localhost:${PORT}/live-interview`);
});