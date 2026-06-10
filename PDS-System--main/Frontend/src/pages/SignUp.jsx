// src/pages/Signup.jsx

import { Link, useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useState } from "react";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Label from "../components/ui/Label";
import InputOTP from "../components/ui/InputOTP";

import { sendOtpAPI, verifyOtpAPI } from "../api/auth";

const Signup = () => {

  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ================= SEND OTP =================
  const handleSendOtp = async (e) => {
    e.preventDefault();

    if (!email) {
      alert("Enter email first");
      return;
    }

    try {
      setLoading(true);

      const res = await sendOtpAPI(email);

      console.log("OTP sent:", res.data);

      setOtpSent(true);
      setOtp("");

      alert("OTP sent successfully 📩");

    } catch (err) {
      console.error(err);
      alert("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // ================= VERIFY OTP =================
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (otp.length < 4) {
      alert("Enter valid OTP");
      return;
    }

    try {
      setLoading(true);

      const res = await verifyOtpAPI(email, otp);

      const token = res.data.token;

      localStorage.setItem("token", token);

      alert("Signup successful 🎉");

      navigate("/dashboard");

    } catch (err) {
      console.error(err);
      alert("Invalid / Expired OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      <main className="flex flex-1 items-center justify-center px-6">

        <div className="w-full max-w-md bg-white border rounded-2xl shadow-sm p-10">

          <div className="text-center mb-10">
            <MapPin className="mx-auto mb-4 text-gray-800" size={36} />
            <h2 className="text-3xl font-bold text-gray-900">
              SignUp to RoadWatch
            </h2>
          </div>

          {!otpSent ? (

            // EMAIL INPUT
            <form onSubmit={handleSendOtp} className="space-y-6">

              <div>
                <Label>Email Address</Label>

                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3"
              >
                {loading ? "Sending..." : "Send OTP"}
              </Button>

            </form>

          ) : (

            // OTP INPUT
            <form onSubmit={handleVerifyOtp} className="space-y-6">

              <p className="text-sm text-center text-gray-600">
                Enter 4-digit OTP sent to{" "}
                <span className="font-medium text-gray-900">{email}</span>
              </p>

              <InputOTP
                value={otp}
                onChange={setOtp}
                maxLength={4}
              />

              <Button
                type="submit"
                disabled={otp.length < 4 || loading}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3"
              >
                {loading ? "Verifying..." : "Verify & Signup"}
              </Button>

            </form>

          )}

          

        </div>

      </main>
    </div>
  );
};

export default Signup;