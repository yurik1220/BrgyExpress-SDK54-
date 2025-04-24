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

    const [showRejectForm, setShowRejectForm] = useState(false); // toggle reject form
    const [rejectionReason, setRejectionReason] = useState(""); // store input reason

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
        setHistory(prev => [...prev, { ...selectedRequest, status, rejectionReason }]);
        setRequests(prev => prev.filter(req => req !== selectedRequest));
        setSelectedRequest(null);
        setShowRejectForm(false);
        setRejectionReason("");
    };

    const handleRejectClick = () => {
        setShowRejectForm(true);
    };

    const confirmRejection = () => {
        if (!rejectionReason.trim()) {
            alert("Please enter a reason for rejection.");
            return;
        }
        handleDecision("Rejected");
    };

    if (loading) return <p>Loading document requests...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div className="requests-container">
            <h2>📄 Document Requests</h2>

            <div className="tabs">
                <button className={activeTab === "pending" ? "active-tab" : ""} onClick={() => setActiveTab("pending")}>
                    Pending Requests
                </button>
                <button className={activeTab === "history" ? "active-tab" : ""} onClick={() => setActiveTab("history")}>
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
                                    {req.status === "Rejected" && req.rejectionReason && (
                                        <p><strong>Reason:</strong> {req.rejectionReason}</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No history available.</p>
                    )}
                </>
            )}

            {selectedRequest && !showRejectForm && (
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
                            <button
                                onClick={() => {
                                    setShowRejectForm(true);
                                }}
                                className="reject"
                            >
                                Reject
                            </button>
                        </div>
                        <button
                            onClick={() => setSelectedRequest(null)}
                            className="close"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {showRejectForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Reason for Rejection</h3>
                        <textarea
                            placeholder="Enter rejection reason..."
                            rows="5"
                            style={{ width: "100%" }}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />
                        <div className="modal-buttons" style={{ marginTop: "1rem" }}>
                            <button
                                onClick={() => {
                                    if (!rejectionReason.trim()) {
                                        alert("Please provide a reason.");
                                        return;
                                    }
                                    handleDecision("Rejected");
                                }}
                                className="reject"
                            >
                                Confirm Rejection
                            </button>
                            <button
                                onClick={() => {
                                    setShowRejectForm(false);
                                    setRejectionReason("");
                                }}
                                className="close"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default DocumentRequests;
