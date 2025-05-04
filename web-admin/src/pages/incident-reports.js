import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/IncidentReports.css";

const IncidentReports = () => {
    const [pendingIncidents, setPendingIncidents] = useState([]);
    const [activeIncidents, setActiveIncidents] = useState([]);
    const [closedIncidents, setClosedIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [activeTab, setActiveTab] = useState("pending");
    const [mapUrl, setMapUrl] = useState("");

    useEffect(() => {
        const fetchIncidentReports = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/requests");
                const allIncidents = response.data.filter(req => req.type === "Incident Report");
                setPendingIncidents(allIncidents.filter(i => !i.status || i.status === 'pending'));
                setActiveIncidents(allIncidents.filter(i => i.status === 'in_progress'));
                setClosedIncidents(allIncidents.filter(i => i.status === 'closed'));
            } catch (error) {
                setError("Error fetching incident reports");
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchIncidentReports();
    }, []);

    const handleStatusChange = async (newStatus) => {
        if (!selectedIncident) return;

        try {
            const apiStatus = newStatus.toLowerCase().replace(' ', '_');

            const response = await axios.patch(
                `http://localhost:5000/api/incidents/${selectedIncident.id}`,
                {
                    status: apiStatus,
                    resolved_at: apiStatus === 'closed' ? new Date().toISOString() : null
                },
                { headers: { 'Content-Type': 'application/json' } }
            );

            if (response.data && response.data.id) {
                if (apiStatus === 'in_progress') {
                    setPendingIncidents(prev => prev.filter(i => i.id !== selectedIncident.id));
                    setActiveIncidents(prev => [...prev, response.data]);
                } else if (apiStatus === 'closed') {
                    setActiveIncidents(prev => prev.filter(i => i.id !== selectedIncident.id));
                    setClosedIncidents(prev => [response.data, ...prev]);
                }
                setSelectedIncident(null);
            }
        } catch (error) {
            console.error("Update error:", error);
            alert("Failed to update incident status");
        }
    };

    useEffect(() => {
        if (selectedIncident?.location) {
            const [longitude, latitude] = selectedIncident.location.split(",").map(Number);
            setMapUrl(`https://www.google.com/maps?q=${latitude},${longitude}`);
        }
    }, [selectedIncident]);

    if (loading) return <div className="scrollable-content">Loading incident reports...</div>;
    if (error) return <div className="scrollable-content">{error}</div>;

    return (
        <>
            <div className="content-header">
                <h2>🚨 Incident Reports</h2>
            </div>

            <div className="tabs-wrapper">
                <div className="tabs">
                    <button
                        className={activeTab === "pending" ? "active-tab" : ""}
                        onClick={() => setActiveTab("pending")}
                    >
                        Pending Reports
                    </button>
                    <button
                        className={activeTab === "active" ? "active-tab" : ""}
                        onClick={() => setActiveTab("active")}
                    >
                        Active Incidents
                    </button>
                    <button
                        className={activeTab === "closed" ? "active-tab" : ""}
                        onClick={() => setActiveTab("closed")}
                    >
                        Closed Incidents
                    </button>
                </div>
            </div>

            <div className="scrollable-content">
                {activeTab === "pending" && (
                    <div className="request-list-container">
                        {pendingIncidents.length > 0 ? (
                            <ul className="request-list">
                                {pendingIncidents.map((incident) => (
                                    <li key={incident.id} className="request-card pending"
                                        onClick={() => setSelectedIncident(incident)}>
                                        <p><strong>{incident.title}</strong> reported by Clerk ID: {incident.clerk_id}</p>
                                        <small>{new Date(incident.created_at).toLocaleString()}</small>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="no-requests-message">No pending incident reports.</p>
                        )}
                    </div>
                )}

                {activeTab === "active" && (
                    <div className="request-list-container">
                        {activeIncidents.length > 0 ? (
                            <ul className="request-list">
                                {activeIncidents.map((incident) => (
                                    <li key={incident.id} className="request-card in-progress"
                                        onClick={() => setSelectedIncident(incident)}>
                                        <p><strong>{incident.title}</strong> reported by Clerk ID: {incident.clerk_id}</p>
                                        <small>{new Date(incident.created_at).toLocaleString()} - In Progress</small>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="no-requests-message">No active incidents.</p>
                        )}
                    </div>
                )}

                {activeTab === "closed" && (
                    <div className="request-list-container">
                        {closedIncidents.length > 0 ? (
                            <ul className="request-list">
                                {closedIncidents.map((incident) => (
                                    <li key={incident.id} className="request-card closed"
                                        onClick={() => setSelectedIncident(incident)}>
                                        <p><strong>{incident.title}</strong> (Clerk ID: {incident.clerk_id})</p>
                                        <small>
                                            Reported: {new Date(incident.created_at).toLocaleString()} |
                                            Closed: {new Date(incident.resolved_at).toLocaleString()}
                                        </small>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="no-requests-message">No closed incidents.</p>
                        )}
                    </div>
                )}

                {selectedIncident && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <h3>Incident Details</h3>
                            <p><strong>Title:</strong> {selectedIncident.title}</p>
                            <p><strong>Description:</strong> {selectedIncident.description}</p>
                            <p><strong>Reported by Clerk ID:</strong> {selectedIncident.clerk_id}</p>
                            <p><strong>Date Reported:</strong> {new Date(selectedIncident.created_at).toLocaleString()}</p>
                            <p><strong>Status:</strong> {selectedIncident.status ? selectedIncident.status.replace('_', ' ') : 'pending'}</p>

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
                                    <button onClick={() => handleStatusChange("In Progress")} className="approve">
                                        Accept Report
                                    </button>
                                </div>
                            )}

                            {selectedIncident.status === 'in_progress' && (
                                <div className="modal-buttons">
                                    <button onClick={() => handleStatusChange("Closed")} className="reject">
                                        Close Incident
                                    </button>
                                </div>
                            )}

                            <button onClick={() => setSelectedIncident(null)} className="close">
                                Close Details
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default IncidentReports;