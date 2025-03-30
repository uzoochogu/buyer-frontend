import React from "react";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  const handleTitleClick = () => {
    navigate("/dashboard");
  };

  return (
    <div className="bg-gray-800 text-white p-4">
      <h1
        className="text-2xl font-bold cursor-pointer hover:text-gray-300 transition-colors"
        onClick={handleTitleClick}
      >
        Agentic ECommerce App
      </h1>
    </div>
  );
};

export default Header;
