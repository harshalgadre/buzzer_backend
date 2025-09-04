const express = require("express");
const { getProfile, updateProfile, uploadResume, getInterviewHistory } = require("../controllers/authController");
const { ensureAuthenticated } = require("../middleware/authMiddleware");
const multer = require("multer");
const cloudinaryStorage = require("../config/cloudinaryMulter");

const router = express.Router();

// Multer config for Cloudinary PDF resume upload
const upload = multer({
  storage: cloudinaryStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed!"));
  },
});

// Get user profile
router.get("/profile", ensureAuthenticated, getProfile);
// Update user profile
router.put("/profile", ensureAuthenticated, updateProfile);
// Upload resume
router.post("/resume", ensureAuthenticated, upload.single("resume"), uploadResume);
// Get interview history
router.get("/interviews", ensureAuthenticated, getInterviewHistory);

module.exports = router;
