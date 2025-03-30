import React, { useEffect, useState } from "react";
import { dashboardService } from "../api/services";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await dashboardService.getDashboardData();
        setDashboardData(response.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Orders</h2>
          <p className="text-gray-700">
            Total Orders:{" "}
            {dashboardData?.orders?.delivered +
              dashboardData?.orders?.in_progress || 0}
          </p>
          <p className="text-gray-700">
            Delivered: {dashboardData?.orders?.delivered || 0}
          </p>
          <p className="text-gray-700">
            In progress: {dashboardData?.orders?.in_progress || 0}
          </p>
        </div>
        {/* Other cards... */}
      </div>
    </div>
  );
};

export default Dashboard;
