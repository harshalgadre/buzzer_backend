const express = require("express");
const { connectDB } = require("./config/database");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
require("dotenv").config();
const path = require("path");

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

// Passport configuration
require("./config/passport");

// Environment Configuration
const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:4001",
  "http://localhost:6001",
  "https://interview-backend-2-30dl.onrender.com/"
];
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://lanbixinfo:VfcMo7euOiX1mJ1w@interview-backend.p4usgoo.mongodb.net/interview?retryWrites=true&w=majority&appName=Interview-backend";
const SESSION_SECRET =
  process.env.SESSION_SECRET || "your-secret-key-change-in-production";
const SERVICE_NAME = "auth-service";
const SERVICE_VERSION = "v1.0.0";

// Express App Setup
const app = express();

// Trust proxy for accurate IP addresses
app.set("trust proxy", 1);

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: SERVICE_NAME,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: NODE_ENV === "production" ? undefined : false,
    hsts: NODE_ENV === "production" ? { maxAge: 31536000 } : false,
  })
);

// Rate Limiting - Restrictive for auth service
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === "production" ? 20 : 100,
  message: {
    success: false,
    error: "Too many authentication attempts from this IP",
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Specific rate limiting for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === "production" ? 5 : 20,
  message: {
    success: false,
    error: "Too many login attempts",
    retryAfter: 15 * 60,
  },
  skipSuccessfulRequests: true,
});

app.use(limiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression
app.use(compression());

// CORS Configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-API-Key",
    ],
    exposedHeaders: ["X-Total-Count", "X-Rate-Limit-Remaining"],
    optionsSuccessStatus: 200,
  })
);

// Session Configuration
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      touchAfter: 24 * 3600,
    }),
    cookie: {
      secure: NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: NODE_ENV === "production" ? "strict" : "lax",
    },
    name: "auth.session.id",
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Database Connection
let dbConnected = false;
const initializeDatabase = async () => {
  try {
    await connectDB();
    dbConnected = true;
    console.log("✅ Auth Service - Database connected successfully");
  } catch (error) {
    console.error(
      "❌ Auth Service - Database connection failed:",
      error.message
    );
    if (NODE_ENV === "production") {
      process.exit(1);
    }
  }
};

// =================================
// ROUTES SECTION
// =================================

// Service Info
app.get("/api/info", (req, res) => {
  res.status(200).json({
    message: "Auth Service Information",
  });
});
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    environment: NODE_ENV,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Apply auth rate limiting to sensitive routes
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/google", authLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

// Service Status
app.get("/api/status", (req, res) => {
  res.status(200).json({
    success: true,
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    environment: NODE_ENV,
    database: dbConnected ? "connected" : "disconnected",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});
app.use(
  "/uploads/resumes",
  express.static(path.join(process.cwd(), "uploads/resumes"))
);

// =================================
// ERROR HANDLING
// =================================

// 404 Handler
app.use("*", (req, res) => {
  console.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: "Route not found",
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Simple Error Handler
app.use((err, req, res, next) => {
  console.error("Error occurred:", err.message);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  });
});

// Start Server
const startServer = async () => {
  try {
    await initializeDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\n🚀 ${SERVICE_NAME.toUpperCase()} STARTED SUCCESSFULLY!`);
      console.log(`📡 Running on: http://localhost:${PORT}`);
      console.log(`🌐 Port: ${PORT}`);
      console.log(`🎯 Environment: ${NODE_ENV}`);
      console.log(`🔐 Authentication service ready`);
      console.log(`📊 Health Check: http://localhost:${PORT}/health`);
      console.log(`📈 Status: http://localhost:${PORT}/api/status\n`);
    });
  } catch (error) {
    console.error("Failed to start auth service:", error.message);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception in Auth Service:", error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection in Auth Service:", reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;
