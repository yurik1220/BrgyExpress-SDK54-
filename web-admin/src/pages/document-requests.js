import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/DocumentRequests.css";

const DocumentRequests = () => {
    const [requests, setRequests] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [activeTab, setActiveTab] = useState("pending");

    useEffect(() => {
        const fetchDocumentRequests = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/requests");
                const filtered = response.data.filter(req => req.type === "Document Request");
                setRequests(filtered);
            } catch (error) {
                setError("Error fetching document requests");
            } finally {
                setLoading(false);
            }
        };
        fetchDocumentRequests();
    }, []);

    const handleDecision = (status) => {
        setHistory(prev => [...prev, { ...selectedRequest, status }]);
        setRequests(prev => prev.filter(req => req !== selectedRequest));
        setSelectedRequest(null);
    };

    if (loading) return <p>Loading document requests...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div className="requests-container">
            <h2>📄 Document Requests</h2>

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
                    {requests.length > 0 ? (
                        <ul className="request-list">
                            {requests.map((request, index) => (
                                <li key={index} className="request-item" onClick={() => setSelectedRequest(request)}>
                                    <p><strong>{request.document}</strong> requested by <strong>{request.user}</strong></p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No pending document requests.</p>
                    )}
                </>
            )}

            {activeTab === "history" && (
                <>
                    {history.length > 0 ? (
                        <ul className="request-list">
                            {history.map((req, index) => (
                                <li key={index} className={`request-item ${req.status.toLowerCase()}`}>
                                    <p><strong>{req.document}</strong> by <strong>{req.user}</strong> — <em>{req.status}</em></p>
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
                        <p><strong>Request Type:</strong> {selectedRequest.type}</p>
                        <p><strong>Document:</strong> {selectedRequest.document}</p>
                        <p><strong>Reason:</strong> {selectedRequest.reason}</p>
                        <p><strong>User:</strong> {selectedRequest.user}</p>
                        {selectedRequest.media && <img src={selectedRequest.media} alt="Media" width="150" />}
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

export default DocumentRequests;
