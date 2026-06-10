import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 route:", location.pathname);
  }, [location]);

  return (
    <div className="flex min-h-screen items-center justify-center text-center">
      <div>
        <h1 className="text-5xl font-bold mb-2">404</h1>
        <p className="mb-4">Page not found</p>
        <Link to="/" className="text-blue-600 underline">
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;