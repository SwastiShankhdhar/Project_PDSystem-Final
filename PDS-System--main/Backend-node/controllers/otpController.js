const generateOtp = require("../utils/generateOtp");
const sendEmail = require("../utils/sendEmail");
const OTP = require("../models/Otp");
const jwt = require("jsonwebtoken");

// ================= SEND OTP =================
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    console.log("📩 OTP request for:", email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // generate OTP
    const otp = generateOtp();

    console.log("🔑 Generated OTP:", otp);

    // expiry time
    const expireAt = new Date(
      Date.now() + process.env.OTP_EXPIRE_MIN * 60 * 1000
    );

    // save in DB
    await OTP.create({
      email,
      otp,
      expireAt,
    });

    // send email
    await sendEmail(email, otp);

    console.log("✅ OTP sent successfully");

    res.json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (error) {
    console.error("❌ Send OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= VERIFY OTP =================
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log("🔐 Verifying OTP:", otp);

    const record = await OTP.findOne({ email, otp });

    if (!record) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    // check expiry
    if (record.expireAt < new Date()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    // create JWT
    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log("✅ OTP verified");

    res.json({
      success: true,
      token,
    });

  } catch (error) {
    console.error("❌ Verify OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= DASHBOARD =================
exports.dashboard = async (req, res) => {
  res.json({
    message: "Welcome to dashboard",
    user: req.user,
  });
};