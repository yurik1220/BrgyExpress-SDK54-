import React from "react";
import Sidebar from '../components/Sidebar';
import MainContent from '../components/MainContent';
import '../styles/Dashboard.css';

const Dashboard = () => {
    return (
        <div className="dashboard-container">
            <Sidebar />
            <MainContent />
        </div>
    );
};

export default Dashboard;