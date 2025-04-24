import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/DocumentRequests.css"; // shared styles

const CreateIDRequests = () => {
    const [idRequests, setIdRequests] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [activeTab, setActiveTab] = useState("pending");

    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

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
        const updatedRequest = {
            ...selectedRequest,
            status,
            rejectionReason: status === "Rejected" ? rejectionReason : undefined,
        };
        setHistory(prev => [...prev, updatedRequest]);
        setIdRequests(prev => prev.filter(req => req !== selectedRequest));
        setSelectedRequest(null);
        setShowRejectForm(false);
        setRejectionReason("");
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
                                    {req.rejectionReason && (
                                        <p><strong>Rejection Reason:</strong> {req.rejectionReason}</p>
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
                        <p><strong>Full Name:</strong> {selectedRequest.name}</p>
                        <p><strong>Birth Date:</strong> {selectedRequest.birthdate}</p>
                        <p><strong>Address:</strong> {selectedRequest.userAddress}</p>
                        <p><strong>Contact:</strong> {selectedRequest.contact}</p>
                        {selectedRequest.media && <img src={selectedRequest.media} alt="ID request" width="150" />}
                        <div className="modal-buttons">
                            <button onClick={() => handleDecision("Approved")} className="approve">Approve</button>
                            <button
                                onClick={() => setShowRejectForm(true)}
                                className="reject"
                            >
                                Reject
                            </button>
                        </div>
                        <button onClick={() => setSelectedRequest(null)} className="close">Close</button>
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

export default CreateIDRequests;
