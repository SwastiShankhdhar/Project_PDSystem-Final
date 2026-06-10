const InputOTP = ({ value, onChange, maxLength = 4}) => {
  return (
    <input
      type="text"
      maxLength={maxLength}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter OTP"
      className="border rounded px-3 py-2 text-center tracking-widest w-full"
    />
  );
};

export default InputOTP;