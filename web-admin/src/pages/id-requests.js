import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/DocumentRequests.css"; // Use the same shared CSS or create custom for this file

const CreateIDRequests = () => {
    const [idRequests, setIdRequests] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [activeTab, setActiveTab] = useState("pending");

    useEffect(() => {
        const fetchIDRequests = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/requests");
                const filteredRequests = response.data.filter(
                    (request) => request.type === "Create ID"
                );
                setIdRequests(filteredRequests);
            } catch (error) {
                setError("Error fetching ID requests");
            } finally {
                setLoading(false);
            }
        };

        fetchIDRequests();
    }, []);

    const handleDecision = (status) => {
        setHistory(prev => [...prev, { ...selectedRequest, status }]);
        setIdRequests(prev => prev.filter(req => req !== selectedRequest));
        setSelectedRequest(null);
    };

    if (loading) return <p>Loading ID requests...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div className="requests-container">
            <h2>🆔 ID Requests</h2>

            <div className="tabs">
                <button
                    className={activeTab === "pending" ? "active-tab" : ""}
                    onClick={() => setActiveTab("pending")}
                >
                    Pending Requests
                </button>
                <button
                    className={activeTab === "history" ? "active-tab" : ""}
                    onClick={() => setActiveTab("history")}
                >
                    History Log
                </button>
            </div>

            {activeTab === "pending" && (
                <>
                    {idRequests.length > 0 ? (
                        <ul className="request-list">
                            {idRequests.map((request, index) => (
                                <li key={index} className="request-item" onClick={() => setSelectedRequest(request)}>
                                    <p><strong>{request.fullName}</strong> requesting ID</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No pending ID requests.</p>
                    )}
                </>
            )}

            {activeTab === "history" && (
                <>
                    {history.length > 0 ? (
                        <ul className="request-list">
                            {history.map((req, index) => (
                                <li key={index} className={`request-item ${req.status.toLowerCase()}`}>
                                    <p><strong>{req.fullName}</strong> — <em>{req.status}</em></p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No history available.</p>
                    )}
                </>
            )}

            {selectedRequest && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Request Details</h3>
                        <p><strong>Full Name:</strong> {selectedRequest.name}</p>
                        <p><strong>Birth Date:</strong> {selectedRequest.birthdate}</p>
                        <p><strong>Address:</strong> {selectedRequest.address}</p>
                        <p><strong>Contact:</strong> {selectedRequest.contact}</p>
                        {selectedRequest.media && <img src={selectedRequest.media} alt="ID request" width="150" />}
                        <div className="modal-buttons">
                            <button onClick={() => handleDecision("Approved")} className="approve">Approve</button>
                            <button onClick={() => handleDecision("Rejected")} className="reject">Reject</button>
                        </div>
                        <button onClick={() => setSelectedRequest(null)} className="close">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateIDRequests;
