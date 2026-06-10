import { Link } from "react-router-dom";
import { ArrowRight, MapPin, BarChart3, Navigation, Activity, Shield } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import demo from "../assets/h.png";
import heroImage from "../assets/pd.jpeg";

const Home = () => {
  return (
    <div className="flex min-h-screen flex-col bg-white">

      <Header />

      {/* ================= HERO ================= */}
      <section className="relative h-screen w-full overflow-hidden">

        {/* Background Image */}
        <img
          src={heroImage}
          alt="road"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* White Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-white/40"></div>

        <div className="relative z-10 flex h-full items-center px-8 md:px-20">
          <div className="max-w-2xl">

            <span className="mb-5 inline-block rounded-md bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white tracking-wide">
              Pothole Detection System • AI Powered
            </span>

            <h1 className="mb-6 text-5xl font-bold text-gray-900 md:text-6xl leading-tight">
              Making Roads Safer,
              <br />
              Real Time Pothole Detection
            </h1>

            <p className="mb-8 text-lg text-gray-700">
              Track and visualize road conditions in your city.
              Help authorities fix roads faster with real-time pothole data.
            </p>

            <div className="flex gap-4">
              <Link to="/signup">
                <button className="flex items-center gap-2 rounded-md bg-gray-900 px-6 py-3 text-white font-medium hover:bg-gray-800 transition">
                  Get Started <ArrowRight size={18} />
                </button>
              </Link>
            </div>

            {/* STATUS PILLS */}
            <div className="flex gap-6 mt-12">
              <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-white">Live Detection Active</span>
              </div>

              <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-white">85% Accuracy</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= WHY WE BUILT ================= */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="mx-auto max-w-6xl text-center">

          <h2 className="mb-3 text-3xl font-bold text-gray-900">
            Why We Built This
          </h2>

          <p className="mb-12 text-gray-600 max-w-3xl mx-auto">
            Road safety is a major concern in many cities. Potholes not only damage vehicles
            but also cause accidents and delays. We built this system to detect and
            visualize road damage in real time, enabling faster response and better
            infrastructure management.
          </p>

          <div className="grid gap-8 md:grid-cols-3 text-left">

            {/* Card 1 */}
            <div className="rounded-lg border bg-white p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition">
              <Shield className="text-blue-500 mb-4" size={24} />
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                Improve Road Safety
              </h3>
              <p className="text-sm text-gray-600">
                Help drivers avoid risky roads by providing clear and updated pothole information.
              </p>
              <div className="mt-4 flex items-center gap-2 text-blue-500 text-xs">
                <Navigation size={12} />
                <span>Safer routes • fewer accidents</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-lg border bg-white p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition">
              <MapPin className="text-green-500 mb-4" size={24} />
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                Live Map Interaction
              </h3>
              <p className="text-sm text-gray-600">
                Interactive real-time map showing pothole locations and live updates.
              </p>
              <div className="mt-4 flex items-center gap-2 text-green-500 text-xs">
                <Navigation size={12} />
                <span>Live tracking • potholes detected</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-lg border bg-white p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition">
              <BarChart3 className="text-purple-500 mb-4" size={24} />
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                Smart Monitoring
              </h3>
              <p className="text-sm text-gray-600">
                Facilitating Real Time Pothole Detection.
              </p>
              <div className="mt-4 flex items-center gap-2 text-purple-500 text-xs">
                <Activity size={12} />
                <span>Analytics • performance insights</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= IMAGE + TEXT ================= */}
      <section className="bg-white py-20 px-6">
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">

          {/* Image */}
          <div>
            <img
              src={demo}
              alt="pothole detection"
              className="rounded-xl shadow-lg border"
            />
          </div>

          {/* Text */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Real-Time Detection Interface
            </h2>

            <p className="text-gray-600 text-lg leading-relaxed">
              This is how the system works in real time. When a pothole is detected,
              the interface highlights it instantly, providing clear visual feedback
              to the user. The system also integrates map-based components to display
              the current location.
            </p>

            <div className="mt-6 flex gap-3">
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Active Detection</span>
              </div>

              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
                <Activity size={14} className="text-green-500" />
                <span className="text-sm text-gray-700">Real-time Analysis</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      <Footer />

    </div>
  );
};

export default Home;