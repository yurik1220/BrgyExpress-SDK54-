import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/DocumentRequests.css"; // Reuse same styles for consistency

const IncidentReports = () => {
    const [incidents, setIncidents] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [activeTab, setActiveTab] = useState("pending"); // Tab to toggle between "Pending" and "History Log"

    useEffect(() => {
        const fetchIncidentReports = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/requests");
                const filtered = response.data.filter(req => req.type === "Incident Report");
                setIncidents(filtered);
            } catch (error) {
                setError("Error fetching incident reports");
            } finally {
                setLoading(false);
            }
        };
        fetchIncidentReports();
    }, []);

    const handleDecision = (status) => {
        setHistory(prev => [...prev, { ...selectedIncident, status }]);
        setIncidents(prev => prev.filter(incident => incident !== selectedIncident));
        setSelectedIncident(null);
    };

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
                            {incidents.map((incident, index) => (
                                <li key={index} className="request-item" onClick={() => setSelectedIncident(incident)}>
                                    <p><strong>{incident.description}</strong> reported by <strong>{incident.user}</strong></p>
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
                    {history.length > 0 ? (
                        <ul className="request-list">
                            {history.map((incident, index) => (
                                <li key={index} className={`request-item ${incident.status.toLowerCase()}`}>
                                    <p><strong>{incident.description}</strong> reported by <strong>{incident.user}</strong> — <em>{incident.status}</em></p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No history available.</p>
                    )}
                </>
            )}

            {selectedIncident && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Incident Details</h3>
                        <p><strong>Description:</strong> {selectedIncident.description}</p>
                        <p><strong>Reported by:</strong> {selectedIncident.user}</p>
                        <p><strong>Reason:</strong> {selectedIncident.reason}</p>
                        {selectedIncident.media && <img src={selectedIncident.media} alt="Incident Media" width="150" />}
                        <div className="modal-buttons">
                            <button onClick={() => handleDecision("Approved")} className="approve">Approve</button>
                            <button onClick={() => handleDecision("Rejected")} className="reject">Reject</button>
                        </div>
                        <button onClick={() => setSelectedIncident(null)} className="close">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncidentReports;
