import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Camera from "../components/Camera";
import MapComponent from "../components/Map";
import Header from "../components/Header";
import { Activity, MapPin, Radar } from "lucide-react";

function Dashboard() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
    else setIsAuthenticated(true);
  }, [navigate]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <div className="p-6 max-w-7xl mx-auto">

        {/* TOP HEADING */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Detection Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              Real-time pothole monitoring system
            </p>
          </div>

          <div className="flex gap-3">
            <div className="bg-white shadow-sm px-4 py-2 rounded-lg flex items-center gap-2">
              <Activity size={16} className="text-green-500" />
              <span className="text-sm text-gray-700">Live</span>
            </div>
            <div className="bg-white shadow-sm px-4 py-2 rounded-lg flex items-center gap-2">
              <Radar size={16} className="text-blue-500" />
              <span className="text-sm text-gray-700">AI Active</span>
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* CAMERA CARD */}
          <div className="bg-white rounded-2xl shadow-md border hover:shadow-xl transition">

            <div className="p-5 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Live Camera
                </h2>
                <p className="text-sm text-gray-500">
                  Detect potholes in real-time
                </p>
              </div>
              <span className="text-xs bg-green-100 text-green-600 px-3 py-1 rounded-full">
                Active
              </span>
            </div>

            <div className="p-5">
              <Camera />
            </div>
          </div>

          {/* MAP CARD */}
          <div className="bg-white rounded-2xl shadow-md border hover:shadow-xl transition flex flex-col">

            <div className="p-5 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Pothole Map
                </h2>
                <p className="text-sm text-gray-500">
                  Real-time geolocation tracking
                </p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full">
                Live Map
              </span>
            </div>

            <div className="flex-1 min-h-[420px] p-2">
              <MapComponent />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;