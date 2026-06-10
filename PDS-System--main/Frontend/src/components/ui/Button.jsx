const Button = ({ children, className = "", variant = "primary", ...props }) => {
  const base = "px-4 py-2 rounded font-medium transition";

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-400 hover:bg-gray-100",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;