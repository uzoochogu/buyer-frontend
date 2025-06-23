import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Search from "./pages/Search";
import Community from "./pages/Community";
import Chats from "./pages/Chats";
import Orders from "./pages/Orders";
import PostDetail from "./pages/PostDetail";
import Offers from "./pages/Offers";
import OfferDetail from "./pages/OfferDetail";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import NotificationBanner from "./components/NotificationBanner";
import { WebSocketProvider, useWebSocket } from "./contexts/WebSocketContext";
import { locationService } from "./api/services";

// Protected route component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    // Redirect to login if not authenticated
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

// Main app content component that uses WebSocket context
const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );
  const { connect, disconnect } = useWebSocket();

  // location fetched and served on load
  useEffect(() => {
    async function getLocation() {
      try {
        const location = await locationService.getCurrentLocation();
        if (location) {
          localStorage.setItem("latitude", location.latitude);
          localStorage.setItem("longitude", location.longitude);
          localStorage.setItem("gps_accuracy", location.accuracy);
        }
      } catch (error) {
        console.log("Error getting location: ", error);
        // Hardcode Lagos coordinates as fallback
        localStorage.setItem("latitude", 6.5244);
        localStorage.setItem("longitude", 3.3792);
        localStorage.setItem("gps_accuracy", 100);
        // use IP address as fallback ?
      }
    }
    async function saveLocation() {
      try {
        await locationService.saveLocation(
          localStorage.getItem("latitude"),
          localStorage.getItem("longitude"),
          localStorage.getItem("gps_accuracy")
        );
      } catch (error) {
        console.log("Error saving location: ", error);
      }
    }
    getLocation();
    saveLocation();
  }, []);

  // Listen for authentication changes
  useEffect(() => {
    const checkAuth = () => {
      const newAuthState = !!localStorage.getItem("token");
      setIsAuthenticated(newAuthState);

      // Connect/disconnect WebSocket based on auth state
      if (newAuthState) {
        connect();
      } else {
        disconnect();
      }
    };

    // Check initially
    checkAuth();

    // Set up event listener for storage changes (for multi-tab support)
    window.addEventListener("storage", checkAuth);

    // Custom event for auth changes within the same tab
    window.addEventListener("auth-change", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth-change", checkAuth);
    };
  }, [connect, disconnect]);

  return (
    <div className="flex">
      {isAuthenticated && <Sidebar />}
      <div className={isAuthenticated ? "flex-1" : "w-full"}>
        {isAuthenticated && <Header setIsAuthenticated={setIsAuthenticated} />}
        <div className={isAuthenticated ? "p-8" : ""}>
          <Routes>
            {/* Public routes */}
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <Login setIsAuthenticated={setIsAuthenticated} />
                )
              }
            />
            <Route
              path="/register"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <Register setIsAuthenticated={setIsAuthenticated} />
                )
              }
            />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              }
            />
            <Route
              path="/community"
              element={
                <ProtectedRoute>
                  <Community />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chats"
              element={
                <ProtectedRoute>
                  <Chats />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/community/post/:id"
              element={
                <ProtectedRoute>
                  <PostDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/offers"
              element={
                <ProtectedRoute>
                  <Offers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/offers/:id"
              element={
                <ProtectedRoute>
                  <OfferDetail />
                </ProtectedRoute>
              }
            />
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
      {isAuthenticated && <NotificationBanner />}
    </div>
  );
};

const App = () => {
  return (
    <WebSocketProvider>
      <AppContent />
    </WebSocketProvider>
  );
};

export default App;
