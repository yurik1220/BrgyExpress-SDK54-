import React, { useEffect, useState } from "react";
import axios from "axios";
import '../styles/Dashboard.css';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/requests");
                console.log('API Response:', response.data);
                setRequests(response.data);
            } catch (err) {
                console.error('API Error:', err);
                setError("Failed to fetch requests");
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, []);

    // Calculate stats
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const total = requests.length;

    // Incident report stats
    const incidentReports = requests.filter(r => r.type === 'Incident Report');
    console.log('Incident Reports:', incidentReports);
    const incidentTotal = incidentReports.length;
    const incidentPending = incidentReports.filter(r => r.status === 'pending').length;
    const incidentActive = incidentReports.filter(r => r.status === 'active').length;
    const incidentClosed = incidentReports.filter(r => r.status === 'closed').length;

    console.log('Incident Stats:', {
        total: incidentTotal,
        pending: incidentPending,
        active: incidentActive,
        closed: incidentClosed
    });

    // Recent activity (last 5 requests, sorted by created_at desc)
    const recentActivity = [...requests]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

    // Prepare data for charts
    // 1. Request Trends (last 7 days)
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toLocaleDateString();
    });
    const trendsData = days.map(day =>
        requests.filter(r => new Date(r.created_at).toLocaleDateString() === day).length
    );
    const lineData = {
        labels: days,
        datasets: [
            {
                label: 'Requests',
                data: trendsData,
                fill: false,
                borderColor: '#3b82f6',
                backgroundColor: '#3b82f6',
                tension: 0.3,
            },
        ],
    };
    // 2. Request Distribution (by status)
    const pieData = {
        labels: ['Pending', 'Approved', 'Rejected'],
        datasets: [
            {
                data: [pending, approved, rejected],
                backgroundColor: [
                    '#facc15', // yellow
                    '#22c55e', // green
                    '#ef4444', // red
                ],
                borderWidth: 1,
            },
        ],
    };

    // Prepare data for incident trends chart
    const incidentTrendsData = days.map(day => {
        const dayData = {
            pending: incidentReports.filter(r => 
                new Date(r.created_at).toLocaleDateString() === day && 
                r.status === 'pending'
            ).length,
            active: incidentReports.filter(r => 
                new Date(r.created_at).toLocaleDateString() === day && 
                r.status === 'active'
            ).length,
            closed: incidentReports.filter(r => 
                new Date(r.created_at).toLocaleDateString() === day && 
                r.status === 'closed'
            ).length
        };
        console.log(`Data for ${day}:`, dayData);
        return dayData;
    });

    console.log('Incident Trends Data:', incidentTrendsData);

    const incidentLineData = {
        labels: days,
        datasets: [
            {
                label: 'Pending',
                data: incidentTrendsData.map(d => d.pending),
                borderColor: '#facc15',
                backgroundColor: '#facc15',
                tension: 0.3,
            },
            {
                label: 'Active',
                data: incidentTrendsData.map(d => d.active),
                borderColor: '#3b82f6',
                backgroundColor: '#3b82f6',
                tension: 0.3,
            },
            {
                label: 'Closed',
                data: incidentTrendsData.map(d => d.closed),
                borderColor: '#22c55e',
                backgroundColor: '#22c55e',
                tension: 0.3,
            }
        ]
    };

    if (loading) return <div className="loading-message">Loading dashboard...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="dashboard-container">
            <div className="content-header">
                <h1>Dashboard</h1>
            </div>
            <div className="dashboard-stats">
                <div className="stat-card">
                    <div className="stat-icon pending">
                        <i className="fas fa-clock"></i>
                    </div>
                    <div className="stat-info">
                        <h3>Pending Requests</h3>
                        <p className="stat-number">{pending}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon approved">
                        <i className="fas fa-check-circle"></i>
                    </div>
                    <div className="stat-info">
                        <h3>Approved</h3>
                        <p className="stat-number">{approved}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon rejected">
                        <i className="fas fa-times-circle"></i>
                    </div>
                    <div className="stat-info">
                        <h3>Rejected</h3>
                        <p className="stat-number">{rejected}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon total">
                        <i className="fas fa-file-alt"></i>
                    </div>
                    <div className="stat-info">
                        <h3>Total Requests</h3>
                        <p className="stat-number">{total}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon incident">
                        <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <div className="stat-info">
                        <h3>Incident Reports</h3>
                        <p className="stat-number">{incidentTotal}</p>
                    </div>
                </div>
            </div>
            <div className="dashboard-charts">
                <div className="chart-container">
                    <h2>Request Trends</h2>
                    <Line data={lineData} options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                        },
                        scales: {
                            y: { beginAtZero: true, ticks: { stepSize: 1 } },
                        },
                    }} height={240} />
                </div>
                <div className="chart-container">
                    <h2>Request Distribution</h2>
                    <Pie data={pieData} options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom' },
                        },
                    }} height={240} />
                </div>
                <div className="chart-container incident-chart">
                    <h2>Incident Report Trends</h2>
                    <div className="incident-summary">
                        <div className="incident-stat">
                            <span className="stat-label">Pending:</span>
                            <span className="stat-value pending">{incidentPending}</span>
                        </div>
                        <div className="incident-stat">
                            <span className="stat-label">Active:</span>
                            <span className="stat-value active">{incidentActive}</span>
                        </div>
                        <div className="incident-stat">
                            <span className="stat-label">Closed:</span>
                            <span className="stat-value closed">{incidentClosed}</span>
                        </div>
                    </div>
                    <Line data={incidentLineData} options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { 
                                position: 'bottom',
                                labels: {
                                    usePointStyle: true,
                                    padding: 20
                                }
                            },
                        },
                        scales: {
                            y: { 
                                beginAtZero: true, 
                                ticks: { stepSize: 1 },
                                title: {
                                    display: true,
                                    text: 'Number of Incidents'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Date'
                                }
                            }
                        },
                        interaction: {
                            intersect: false,
                            mode: 'index'
                        }
                    }} height={240} />
                </div>
            </div>
            <h2>Recent Activity</h2>
            <div className="activity-list">
                {recentActivity.length === 0 ? (
                    <div className="empty-state">No recent activity.</div>
                ) : (
                    recentActivity.map((req) => (
                        <div className="activity-item" key={req.id}>
                            <div className={`activity-icon ${req.status}`}>
                                {req.status === 'approved' && <i className="fas fa-check"></i>}
                                {req.status === 'pending' && <i className="fas fa-clock"></i>}
                                {req.status === 'rejected' && <i className="fas fa-times"></i>}
                                {req.status !== 'approved' && req.status !== 'pending' && req.status !== 'rejected' && <i className="fas fa-file-alt"></i>}
                            </div>
                            <div className="activity-details">
                                <p className="activity-title">
                                    {req.type} {req.status ? `(${req.status.charAt(0).toUpperCase() + req.status.slice(1)})` : ''}
                                </p>
                                <p className="activity-time">{new Date(req.created_at).toLocaleString()}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Dashboard;