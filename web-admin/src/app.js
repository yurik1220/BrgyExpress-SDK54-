import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/dashboard";

function App() {
    return (
        <Router>
            <Routes>
                {/* All routes under / will be handled inside Dashboard */}
                <Route path="/*" element={<Dashboard />} />
            </Routes>
        </Router>
    );
}

export default App;
