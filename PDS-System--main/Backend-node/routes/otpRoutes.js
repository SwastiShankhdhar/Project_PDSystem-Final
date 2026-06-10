const express = require("express");
const router = express.Router();

const {
  sendOtp,
  verifyOtp,
  dashboard
} = require("../controllers/otpController");

const authMiddleware = require("../middleware/authMiddleware");

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/dashboard", authMiddleware, dashboard);

module.exports = router;