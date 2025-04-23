import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/Requests.css"; // Same shared styling for consistency

const CreateIDRequests = () => {
    const [idRequests, setIdRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchIDRequests = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/requests");
                const filteredRequests = response.data.filter(
                    (request) => request.type === "ID Request"
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

    if (loading) return <p className="loading">Loading ID requests...</p>;
    if (error) return <p className="error">{error}</p>;

    return (
        <div className="requests-container">
            <h2 className="section-title">🆔 ID Requests</h2>
            {idRequests.length > 0 ? (
                <div className="card-grid">
                    {idRequests.map((request, index) => (
                        <div key={index} className="request-card">
                            <p><strong>🔖 Type:</strong> {request.type}</p>
                            <p><strong>📄 Full Name:</strong> {request.fullName}</p>
                            <p><strong>🏠 Address:</strong> {request.address}</p>
                            <p><strong>📞 Contact:</strong> {request.contact}</p>
                            {request.media ? (
                                <div>
                                    <strong>📷 ID Photo:</strong><br />
                                    <img src={request.media} alt="ID request" width="100" />
                                </div>
                            ) : (
                                <p><em>No media provided.</em></p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="no-data">No ID requests to display.</p>
            )}
        </div>
    );
};

export default CreateIDRequests;
