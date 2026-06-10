const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-8 py-8 text-center space-y-3">
        
        <h2 className="text-lg font-semibold text-white tracking-wide">
          RoadWatch
        </h2>

        <p className="text-sm text-gray-400 max-w-2xl mx-auto">
          A Smart Pothole Detection System developed as a 3rd Year Engineering Project.
          Designed to improve road safety using real-time monitoring and intelligent reporting.
        </p>

        <p className="text-xs text-gray-500 pt-4 border-t border-gray-700">
          © {new Date().getFullYear()} RoadWatch • All Rights Reserved
        </p>

      </div>
    </footer>
  );
};

export default Footer;