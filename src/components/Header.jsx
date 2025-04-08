import React from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../api/services";

const Header = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  const handleTitleClick = () => {
    navigate("/dashboard");
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      // Clear local storage
      localStorage.clear();

      // Update authentication state
      setIsAuthenticated(false);

      // Dispatch custom event to notify about auth change
      window.dispatchEvent(new Event("auth-change"));

      // Redirect to login
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
      // Even if there's an error, clear local storage and redirect
      localStorage.clear();
      setIsAuthenticated(false);
      window.dispatchEvent(new Event("auth-change"));
      navigate("/");
    }
  };

  return (
    <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <h1
        className="text-2xl font-bold cursor-pointer hover:text-gray-300 transition-colors"
        onClick={handleTitleClick}
      >
        Agentic ECommerce App
      </h1>

      <div className="flex items-center">
        {username && <span className="mr-4">Welcome, {username}</span>}
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Header;
