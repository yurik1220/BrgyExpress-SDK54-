import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import './styles/Dashboard.css';

function App() {
    return (
        <Router>
            <div className="app-container">
                <Sidebar />
                <MainContent />
            </div>
        </Router>
    );
}

export default App;
