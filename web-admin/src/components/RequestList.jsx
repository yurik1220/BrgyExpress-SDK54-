import React, { useEffect, useState } from 'react';
import axios from 'axios';

const RequestList = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios
            .get("http://192.168.254.106:5000/api/requests")
            .then((res) => {
                // Handle different possible structures of the response
                if (Array.isArray(res.data)) {
                    setRequests(res.data);
                } else if (Array.isArray(res.data.document_requests)) {
                    setRequests(res.data.document_requests); // Adjusted field name
                } else {
                    console.error("Unexpected response format:", res.data);
                    setRequests([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching requests:", err);
                setError(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-4 text-blue-500">Loading requests...</div>;
    if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;

    return (
        <div className="p-4">
            <h2 className="text-2xl font-semibold mb-4">Request List</h2>
            {requests.length === 0 ? (
                <p>No requests found.</p>
            ) : (
                <ul className="space-y-2">
                    {requests.map((request, index) => (
                        <li key={index} className="bg-white p-4 shadow rounded">
                            <p><strong>Name:</strong> {request.name}</p>
                            <p><strong>Document Type:</strong> {request.document_type}</p> {/* Adjusted field name */}
                            <p><strong>Status:</strong> {request.status}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default RequestList;
