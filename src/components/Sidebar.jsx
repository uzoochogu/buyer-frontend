import React from "react";
import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <div className="w-64 bg-gray-800 text-white h-screen p-4">
      <h1 className="text-2xl font-bold mb-6">Menu</h1>
      <ul>
        <li className="mb-4">
          <Link to="/search" className="hover:text-gray-400">
            Search
          </Link>
        </li>
        <li className="mb-4">
          <Link to="/community" className="hover:text-gray-400">
            Community
          </Link>
        </li>
        <li className="mb-4">
          <Link to="/chats" className="hover:text-gray-400">
            Chats
          </Link>
        </li>
        <li className="mb-4">
          <Link to="/orders" className="hover:text-gray-400">
            Orders
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
