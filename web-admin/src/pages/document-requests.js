import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/DocumentRequests.css";

const DocumentRequests = () => {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [activeTab, setActiveTab] = useState("pending");
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [historyFilter, setHistoryFilter] = useState("all");
    const [showAppointmentModal, setShowAppointmentModal] = useState(false);
    const [appointmentDate, setAppointmentDate] = useState("");
    const [appointmentTime, setAppointmentTime] = useState("");

    useEffect(() => {
        const fetchDocumentRequests = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/requests");
                const allRequests = response.data.filter(req => req.type === "Document Request");
                const pending = allRequests.filter(req => !req.status || req.status === 'pending');
                const resolved = allRequests.filter(req => req.status && req.status !== 'pending');
                setPendingRequests(pending);
                setHistory(resolved);
            } catch (error) {
                setError("Error fetching document requests");
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDocumentRequests();
    }, []);

    const handleApproveWithAppointment = async () => {
        if (!appointmentDate || !appointmentTime) {
            alert("Please select both date and time for the appointment");
            return;
        }

        const appointmentDateTime = `${appointmentDate}T${appointmentTime}:00.000Z`;

        try {
            const payload = {
                status: 'approved',
                resolved_at: new Date().toISOString(),
                appointment_date: appointmentDateTime
            };

            const response = await axios.patch(
                `http://localhost:5000/api/document-requests/${selectedRequest.id}`,
                payload,
                { headers: { 'Content-Type': 'application/json' } }
            );

            if (response.data && response.data.id) {
                setPendingRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
                setHistory(prev => [response.data, ...prev]);
                setSelectedRequest(null);
                setShowAppointmentModal(false);
                setAppointmentDate("");
                setAppointmentTime("");
            }
        } catch (error) {
            console.error("Update error:", error);
            alert("Failed to schedule appointment. Please try again.");
        }
    };

    const handleDecision = async (status) => {
        if (!selectedRequest) return;

        try {
            const normalizedStatus = status.toLowerCase();
            const payload = {
                status: normalizedStatus,
                resolved_at: new Date().toISOString()
            };

            if (normalizedStatus === 'rejected') {
                payload.rejection_reason = rejectionReason;
            }

            const response = await axios.patch(
                `http://localhost:5000/api/document-requests/${selectedRequest.id}`,
                payload,
                { headers: { 'Content-Type': 'application/json' } }
            );

            if (response.data && response.data.id) {
                setPendingRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
                setHistory(prev => [response.data, ...prev]);
                setSelectedRequest(null);
                setShowRejectForm(false);
                setRejectionReason("");
            }
        } catch (error) {
            console.error("Update error:", error);
            alert("Failed to update request status");
        }
    };

    const confirmRejection = () => {
        if (!rejectionReason.trim()) {
            alert("Please enter a reason for rejection.");
            return;
        }
        handleDecision("Rejected");
    };

    const filteredHistory = history.filter(request => {
        if (historyFilter === "all") return true;
        return request.status.toLowerCase() === historyFilter.toLowerCase();
    });

    if (loading) return <div className="scrollable-content">Loading document requests...</div>;
    if (error) return <div className="scrollable-content">{error}</div>;

    return (
        <>
            <div className="content-header">
                <h2>📄 Document Requests</h2>
            </div>
            <div className="tabs-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                {activeTab === "history" && (
                    <div className="status-dropdown-container">
                        <select
                            id="historyFilter"
                            className="status-dropdown"
                            value={historyFilter}
                            onChange={(e) => setHistoryFilter(e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="scrollable-content">
                {activeTab === "pending" && (
                    <div className="request-list-container">
                        {pendingRequests.length > 0 ? (
                            <ul className="request-list">
                                {pendingRequests.map((request) => (
                                    <li key={request.id} className="request-card"
                                        onClick={() => setSelectedRequest(request)}>
                                        <p><strong>{request.document_type}</strong> requested by Clerk ID: {request.clerk_id}</p>
                                        <p>Reason: {request.reason}</p>
                                        <small>{new Date(request.created_at).toLocaleString()}</small>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="no-requests-message">No pending document requests.</p>
                        )}
                    </div>
                )}

                {activeTab === "history" && (
                    <div className="history-list-container">
                        {filteredHistory.length > 0 ? (
                            <ul className="request-list">
                                {filteredHistory.map((request) => (
                                    <li key={request.id} className={`request-card ${request.status.toLowerCase()}`}
                                        onClick={() => setSelectedRequest(request)}>
                                        <p><strong>{request.document_type}</strong> (Clerk ID: {request.clerk_id}) — <em>{request.status}</em></p>
                                        <p>Reason: {request.reason}</p>
                                        {request.status.toLowerCase() === 'approved' && request.appointment_date && (
                                            <p><strong>Pickup Date:</strong> {new Date(request.appointment_date).toLocaleString()}</p>
                                        )}
                                        <small>
                                            Submitted: {new Date(request.created_at).toLocaleString()} |
                                            Resolved: {new Date(request.resolved_at).toLocaleString()}
                                        </small>
                                        {request.status.toLowerCase() === 'rejected' && request.rejection_reason && (
                                            <p><strong>Rejection Reason:</strong> {request.rejection_reason}</p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="no-history-message">No {historyFilter === "all" ? "" : historyFilter} requests in history.</p>
                        )}
                    </div>
                )}

                {selectedRequest && !showRejectForm && !showAppointmentModal && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <h3>Request Details</h3>
                            <div className="modal-content">
                                <p><strong>Document Type:</strong> {selectedRequest.document_type}</p>
                                <p><strong>Clerk ID:</strong> {selectedRequest.clerk_id}</p>
                                <p><strong>Reason:</strong> {selectedRequest.reason}</p>
                                <p><strong>Date Submitted:</strong> {new Date(selectedRequest.created_at).toLocaleString()}</p>
                            </div>
                            {(!selectedRequest.status || selectedRequest.status === 'pending') && (
                                <div className="modal-buttons">
                                    <button onClick={() => setShowAppointmentModal(true)} className="approve">
                                        Approve
                                    </button>
                                    <button onClick={() => setShowRejectForm(true)} className="reject">
                                        Reject
                                    </button>
                                </div>
                            )}
                            <button onClick={() => setSelectedRequest(null)} className="close">
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {showRejectForm && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <h3>Reason for Rejection</h3>
                            <textarea placeholder="Enter rejection reason..." rows="5"
                                      className="rejection-textarea" value={rejectionReason}
                                      onChange={(e) => setRejectionReason(e.target.value)} />
                            <div className="modal-buttons">
                                <button onClick={confirmRejection} className="confirm-reject">
                                    Confirm Rejection
                                </button>
                                <button onClick={() => { setShowRejectForm(false); setRejectionReason(""); }} className="cancel">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showAppointmentModal && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <h3>Schedule Appointment for Document Pickup</h3>
                            <div className="appointment-form">
                                <label>
                                    Date:
                                    <input type="date" value={appointmentDate}
                                           onChange={(e) => setAppointmentDate(e.target.value)}
                                           min={new Date().toISOString().split('T')[0]} />
                                </label>
                                <label>
                                    Time:
                                    <input type="time" value={appointmentTime}
                                           onChange={(e) => setAppointmentTime(e.target.value)}
                                           min="08:00" max="17:00" />
                                </label>
                                <p className="appointment-note">
                                    Note: Documents can be picked up from 8AM to 5PM at the Barangay Hall
                                </p>
                            </div>
                            <div className="modal-buttons">
                                <button onClick={handleApproveWithAppointment} className="approve">
                                    Confirm Appointment
                                </button>
                                <button onClick={() => { setShowAppointmentModal(false); setAppointmentDate(""); setAppointmentTime(""); }} className="cancel">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default DocumentRequests;