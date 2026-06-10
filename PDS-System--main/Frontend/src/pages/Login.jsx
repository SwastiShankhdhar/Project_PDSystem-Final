
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

const Header = () => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-10 py-6">
        
        {/* Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-3"
        >
          <MapPin className="text-gray-800 w-8 h-8" />
          <span className="text-3xl font-extrabold tracking-wide text-gray-700">
            RoadWatch
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-10 text-lg font-semibold text-gray-800">
          
          <Link 
            to="/" 
            className="hover:text-gray-600 transition duration-200"
          >
            Home
          </Link>

<Link 
  to="/signup" 
  className="px-6 py-3 rounded-md bg-gray-900 text-white hover:bg-gray-700 hover:text-white transition duration-200 shadow-sm"
>
  Sign Up
</Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;