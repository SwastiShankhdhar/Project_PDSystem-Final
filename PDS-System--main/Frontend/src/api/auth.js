import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api/auth",
});

export const sendOtpAPI = (email) =>
  API.post("/send-otp", { email });

export const verifyOtpAPI = (email, otp) =>
  API.post("/verify-otp", { email, otp });

export const getDashboardAPI = (token) =>
  API.get("/dashboard", {
    headers: { Authorization: `Bearer ${token}` }
  });