import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/DocumentRequests.css";

const IncidentReports = () => {
    const [incidents, setIncidents] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [activeTab, setActiveTab] = useState("pending");
    const [mapUrl, setMapUrl] = useState("");
    const [historyFilter, setHistoryFilter] = useState("all");

    useEffect(() => {
        const fetchIncidentReports = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/requests");
                const allIncidents = response.data.filter(req => req.type === "Incident Report");

                // Separate pending and resolved incidents
                const pending = allIncidents.filter(i => !i.status || i.status === 'pending');
                const resolved = allIncidents.filter(i => i.status && i.status !== 'pending');

                setIncidents(pending);
                setHistory(resolved);
            } catch (error) {
                setError("Error fetching incident reports");
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchIncidentReports();
    }, []);

    const handleDecision = async (status) => {
        if (!selectedIncident) return;

        try {
            // Convert status to lowercase to match backend expectations
            const normalizedStatus = status.toLowerCase();

            const response = await axios.patch(
                `http://localhost:5000/api/incidents/${selectedIncident.id}`,
                {
                    status: normalizedStatus,
                    resolved_at: new Date().toISOString()
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Verify the response
            if (response.data && response.data.id) {
                setIncidents(prev => prev.filter(i => i.id !== selectedIncident.id));
                setHistory(prev => [response.data, ...prev]);
                setSelectedIncident(null);
            } else {
                throw new Error("Invalid response from server");
            }
        } catch (error) {
            console.error("Update error:", error);

            let errorMessage = "Failed to update incident status";
            if (error.response) {
                // Server responded with error status
                errorMessage = error.response.data?.error || errorMessage;
            } else if (error.request) {
                // Request was made but no response
                errorMessage = "No response from server. Please check your connection.";
            }

            alert(errorMessage);
        }
    };

    // Generate map URL when incident is selected
    useEffect(() => {
        if (selectedIncident?.location) {
            const [longitude, latitude] = selectedIncident.location.split(",").map(Number);
            setMapUrl(`https://www.google.com/maps?q=${latitude},${longitude}`);
        }
    }, [selectedIncident]);

    // Filter history based on selected filter
    const filteredHistory = history.filter(incident => {
        if (historyFilter === "all") return true;
        return incident.status.toLowerCase() === historyFilter.toLowerCase();
    });

    if (loading) return <p>Loading incident reports...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div className="requests-container">
            <h2>🚨 Incident Reports</h2>

            <div className="tabs">
                <button
                    className={activeTab === "pending" ? "active-tab" : ""}
                    onClick={() => setActiveTab("pending")}
                >
                    Pending Reports
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
                    {incidents.length > 0 ? (
                        <ul className="request-list">
                            {incidents.map((incident) => (
                                <li
                                    key={incident.id}
                                    className="request-item"
                                    onClick={() => setSelectedIncident(incident)}
                                >
                                    <p>
                                        <strong>{incident.title}</strong> reported by Clerk ID: {incident.clerk_id}
                                        <br />
                                        <small>{new Date(incident.created_at).toLocaleString()}</small>
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No pending incident reports.</p>
                    )}
                </>
            )}

            {activeTab === "history" && (
                <>
                    <div className="history-filters">
                        <button
                            className={historyFilter === "all" ? "active-filter" : ""}
                            onClick={() => setHistoryFilter("all")}
                        >
                            All
                        </button>
                        <button
                            className={historyFilter === "approved" ? "active-filter" : ""}
                            onClick={() => setHistoryFilter("approved")}
                        >
                            Approved
                        </button>
                        <button
                            className={historyFilter === "rejected" ? "active-filter" : ""}
                            onClick={() => setHistoryFilter("rejected")}
                        >
                            Rejected
                        </button>
                    </div>

                    {filteredHistory.length > 0 ? (
                        <ul className="request-list">
                            {filteredHistory.map((incident) => (
                                <li
                                    key={incident.id}
                                    className={`request-item ${incident.status.toLowerCase()}`}
                                    onClick={() => setSelectedIncident(incident)}
                                >
                                    <p>
                                        <strong>{incident.title}</strong> (Clerk ID: {incident.clerk_id}) —
                                        <em> {incident.status}</em>
                                        <br />
                                        <small>
                                            Reported: {new Date(incident.created_at).toLocaleString()} |
                                            Resolved: {new Date(incident.resolved_at).toLocaleString()}
                                        </small>
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No {historyFilter === "all" ? "" : historyFilter} incidents in history.</p>
                    )}
                </>
            )}

            {selectedIncident && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Incident Details</h3>
                        <p><strong>Title:</strong> {selectedIncident.title}</p>
                        <p><strong>Description:</strong> {selectedIncident.description}</p>
                        <p><strong>Reported by Clerk ID:</strong> {selectedIncident.clerk_id}</p>
                        <p><strong>Date Reported:</strong> {new Date(selectedIncident.created_at).toLocaleString()}</p>

                        {selectedIncident.location && (
                            <p>
                                <strong>Location:</strong>{" "}
                                <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                                    View on Map
                                </a>
                            </p>
                        )}

                        {selectedIncident.media_url && (
                            <div className="media-container">
                                <strong>Media:</strong>
                                <img
                                    src={`http://localhost:5000${selectedIncident.media_url}`}
                                    alt="Incident evidence"
                                    style={{ maxWidth: "100%", maxHeight: "200px" }}
                                />
                            </div>
                        )}

                        {(!selectedIncident.status || selectedIncident.status === 'pending') && (
                            <div className="modal-buttons">
                                <button onClick={() => handleDecision("Approved")} className="approve">
                                    Approve
                                </button>
                                <button onClick={() => handleDecision("Rejected")} className="reject">
                                    Reject
                                </button>
                            </div>
                        )}

                        <button onClick={() => setSelectedIncident(null)} className="close">
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncidentReports;