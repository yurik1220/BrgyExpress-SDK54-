import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/Requests.css"; // Reuse the same CSS file for consistency

const IncidentReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchIncidentReports = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/requests");
                const filteredReports = response.data.filter(
                    (request) => request.type === "Incident Report"
                );
                setReports(filteredReports);
            } catch (error) {
                setError("Error fetching incident reports");
            } finally {
                setLoading(false);
            }
        };

        fetchIncidentReports();
    }, []);

    if (loading) return <p className="loading">Loading incident reports...</p>;
    if (error) return <p className="error">{error}</p>;

    return (
        <div className="requests-container">
            <h2 className="section-title">🚨 Incident Reports</h2>
            {reports.length > 0 ? (
                <div className="card-grid">
                    {reports.map((report, index) => (
                        <div key={index} className="request-card">
                            <p><strong>📌 Type:</strong> {report.type}</p>
                            <p><strong>📝 Description:</strong> {report.description}</p>
                            <p><strong>👤 Reported by:</strong> {report.user}</p>
                            {report.media ? (
                                <div>
                                    <strong>📷 Media:</strong><br />
                                    <img src={report.media} alt="incident" width="100" />
                                </div>
                            ) : (
                                <p><em>No media provided.</em></p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="no-data">No incident reports to display.</p>
            )}
        </div>
    );
};

export default IncidentReports;
