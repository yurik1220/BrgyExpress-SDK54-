import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/DocumentRequests.css";

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

                // Separate incidents by status
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
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.id) {
                // Update the appropriate state based on the status change
                if (apiStatus === 'in_progress') {
                    // Move from pending to active
                    setPendingIncidents(prev => prev.filter(i => i.id !== selectedIncident.id));
                    setActiveIncidents(prev => [...prev, response.data]);
                } else if (apiStatus === 'closed') {
                    // Move from active to closed
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

    // Generate map URL when incident is selected
    useEffect(() => {
        if (selectedIncident?.location) {
            const [longitude, latitude] = selectedIncident.location.split(",").map(Number);
            setMapUrl(`https://www.google.com/maps?q=${latitude},${longitude}`);
        }
    }, [selectedIncident]);

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

            {activeTab === "pending" && (
                <>
                    {pendingIncidents.length > 0 ? (
                        <ul className="request-list">
                            {pendingIncidents.map((incident) => (
                                <li
                                    key={incident.id}
                                    className="request-item pending"
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

            {activeTab === "active" && (
                <>
                    {activeIncidents.length > 0 ? (
                        <ul className="request-list">
                            {activeIncidents.map((incident) => (
                                <li
                                    key={incident.id}
                                    className="request-item in-progress"
                                    onClick={() => setSelectedIncident(incident)}
                                >
                                    <p>
                                        <strong>{incident.title}</strong> reported by Clerk ID: {incident.clerk_id}
                                        <br />
                                        <small>
                                            {new Date(incident.created_at).toLocaleString()} - In Progress
                                        </small>
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No active incidents.</p>
                    )}
                </>
            )}

            {activeTab === "closed" && (
                <>
                    {closedIncidents.length > 0 ? (
                        <ul className="request-list">
                            {closedIncidents.map((incident) => (
                                <li
                                    key={incident.id}
                                    className="request-item closed"
                                    onClick={() => setSelectedIncident(incident)}
                                >
                                    <p>
                                        <strong>{incident.title}</strong> (Clerk ID: {incident.clerk_id})
                                        <br />
                                        <small>
                                            Reported: {new Date(incident.created_at).toLocaleString()} |
                                            Closed: {new Date(incident.resolved_at).toLocaleString()}
                                        </small>
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No closed incidents.</p>
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
    );
};

export default IncidentReports;