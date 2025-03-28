import React, { useState, useEffect } from "react";
import { orderService } from "../api/api";

const Orders = () => {
  useEffect(() => {
    fetchOrders();
  }, []);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOrder, setNewOrder] = useState({
    user_id: 1, // Default user ID
    status: "pending"
  });
  const [statusOptions] = useState([
    "pending", "in_progress", "in_transit", "delivered", "cancelled"
  ]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewOrder({
      ...newOrder,
      [name]: name === "user_id" ? parseInt(value) : value
    });
  };


  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.getOrders();
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      await orderService.createOrder(newOrder);
      // Reset form
      setNewOrder({
        user_id: 1,
        status: "pending"
      });
      // Refresh orders list
      fetchOrders();
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };
 
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Orders</h1>
      
      {/* Create Order Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Order</h2>
        <form onSubmit={handleCreateOrder}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">User ID</label>
            <input
              type="number"
              name="user_id"
              value={newOrder.user_id}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              min="1"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Status</label>
            <select
              name="status"
              value={newOrder.status}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white p-2 rounded"
          >
            Create Order
          </button>
        </form>
      </div>
      
      {/* Orders List */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Orders List</h2>
        {loading ? (
          <p>Loading orders...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">ID</th>
                  <th className="py-2 px-4 border-b">User ID</th>
                  <th className="py-2 px-4 border-b">Status</th>
                  <th className="py-2 px-4 border-b">Created At</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td className="py-2 px-4 border-b">{order.id}</td>
                    <td className="py-2 px-4 border-b">{order.user_id}</td>
                    <td className="py-2 px-4 border-b">
                      <span className={`px-2 py-1 rounded ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b">{new Date(order.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-4 text-center">No orders found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
