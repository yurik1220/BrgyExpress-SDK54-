import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/fetch";
import '../styles/Analytics.css';
// Map dependencies (install if not yet installed):
// npm install react-leaflet leaflet
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
// Heatmap plugin (install: npm install leaflet.heat)
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';

const Analytics = () => {
    const [overviewData, setOverviewData] = useState(null);
    const [detailedData, setDetailedData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('30'); // days
    const [activeTab, setActiveTab] = useState('workload');
    // Geo visualization state
    const [barangayGeoJson, setBarangayGeoJson] = useState(null);
    const [barangayBounds, setBarangayBounds] = useState(null);
    const [barangayCenter, setBarangayCenter] = useState([14.5995, 120.9842]);
    const [maxIncidentCount, setMaxIncidentCount] = useState(1);
    const [showMapModal, setShowMapModal] = useState(false);
    const [requestsData, setRequestsData] = useState([]);
    
    // Filter states
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        type: '',
        status: '',
        location: ''
    });

    // Fetch overview analytics
    const fetchOverviewAnalytics = useCallback(async () => {
        try {
            // Fetch high-level analytics for the selected time window
            const response = await api.get(`/api/analytics/overview?days=${timeRange}`);
            console.log('Overview Analytics Response:', response.data);
            setOverviewData(response.data);
        } catch (err) {
            console.error('Overview Analytics Error:', err);
            setError("Failed to fetch overview analytics");
        }
    }, [timeRange]);

    // Fetch detailed analytics
    const fetchDetailedAnalytics = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.type) params.append('type', filters.type);
            if (filters.status) params.append('status', filters.status);
            if (filters.location) params.append('location', filters.location);

            // Fetch filtered analytics using shared API instance
            const response = await api.get(`/api/analytics/detailed?${params.toString()}`);
            console.log('Detailed Analytics Response:', response.data);
            setDetailedData(response.data);
        } catch (err) {
            console.error('Detailed Analytics Error:', err);
            setError("Failed to fetch detailed analytics");
        }
    }, [filters]);

    // Fetch requests data for charts
    const fetchRequestsData = useCallback(async () => {
        try {
            const response = await api.get(`/api/requests?days=${timeRange}`);
            setRequestsData(response.data || []);
        } catch (err) {
            console.error('Requests Data Error:', err);
            setError("Failed to fetch requests data");
        }
    }, [timeRange]);

    // Export data
    const exportData = async (format) => {
        try {
            const params = new URLSearchParams();
            params.append('format', format);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.type) params.append('type', filters.type);
            if (filters.status) params.append('status', filters.status);
            if (filters.location) params.append('location', filters.location);

            const response = await api.get(`/api/analytics/export?${params.toString()}`, {
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `analytics-${new Date().toISOString().split('T')[0]}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export Error:', err);
            alert('Failed to export data');
        }
    };

    // Generate PDF Report
    const generatePDFReport = async () => {
        try {
            // Create a new window for PDF generation
            const printWindow = window.open('', '_blank');
            
            // Get current date and time
            const now = new Date();
            const reportDate = now.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            // Calculate key metrics for executive summary
            const totalRequests = overviewData?.analytics?.totalRequests || 0;
            const approvedRequests = overviewData?.analytics?.statusDistribution?.approved || 0;
            const pendingRequests = overviewData?.analytics?.statusDistribution?.pending || 0;
            const approvalRate = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0;
            
            // Get top request type
            const requestTypes = overviewData?.analytics?.requestTypes || {};
            const topRequestType = Object.entries(requestTypes).reduce((a, b) => 
                requestTypes[a[0]] > requestTypes[b[0]] ? a : b, ['Unknown', 0]
            );
            const topRequestPercentage = totalRequests > 0 ? 
                Math.round((topRequestType[1] / totalRequests) * 100) : 0;

            // Calculate pending request breakdown
            const pendingBreakdown = buildPendingBuckets(requestsData);
            const totalPending = pendingBreakdown.a + pendingBreakdown.b + pendingBreakdown.c;
            const overduePercentage = totalPending > 0 ? 
                Math.round((pendingBreakdown.c / totalPending) * 100) : 0;

            // Calculate processing time metrics
            const processingStats = getProcessingTimes(requestsData);
            const avgProcessingDays = (processingStats.avg / 24).toFixed(1);
            const medianProcessingDays = (processingStats.median / 24).toFixed(1);

            // Calculate month-over-month metrics for PDF
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            
            const currentMonthRequests = (requestsData || []).filter(r => {
                const created = new Date(r.created_at);
                return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
            }).length;
            
            const lastMonthRequests = (requestsData || []).filter(r => {
                const created = new Date(r.created_at);
                return created.getMonth() === lastMonth && created.getFullYear() === lastMonthYear;
            }).length;
            
            const trendPct = lastMonthRequests === 0 ? (currentMonthRequests > 0 ? 100 : 0) : 
                Math.round(((currentMonthRequests - lastMonthRequests) / lastMonthRequests) * 100);

            // Generate PDF content
            const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Barangay Analytics Report</title>
    <style>
        @page {
            size: A4;
            margin: 0.5in;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
        }
        
        .cover-page {
            text-align: center;
            page-break-after: always;
            padding: 2in 0;
        }
        
        .cover-title {
            font-size: 2.5em;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 0.5em;
        }
        
        .cover-subtitle {
            font-size: 1.2em;
            color: #6b7280;
            margin-bottom: 2em;
        }
        
        .cover-date {
            font-size: 1em;
            color: #9ca3af;
        }
        
        .section {
            page-break-inside: avoid;
            margin-bottom: 2em;
        }
        
        .section-title {
            font-size: 1.8em;
            font-weight: bold;
            color: #1f2937;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 0.3em;
            margin-bottom: 1em;
        }
        
        .subsection-title {
            font-size: 1.3em;
            font-weight: 600;
            color: #374151;
            margin: 1.5em 0 0.8em 0;
        }
        
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1em;
            margin-bottom: 1.5em;
        }
        
        .kpi-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1.2em;
            text-align: center;
        }
        
        .kpi-value {
            font-size: 2.2em;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 0.3em;
        }
        
        .kpi-label {
            font-size: 0.9em;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .kpi-change {
            font-size: 0.8em;
            margin-top: 0.5em;
            padding: 0.3em 0.6em;
            border-radius: 4px;
            font-weight: 600;
        }
        
        .kpi-change.positive {
            background: #dcfce7;
            color: #166534;
        }
        
        .kpi-change.negative {
            background: #fef2f2;
            color: #dc2626;
        }
        
        .chart-container {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1.5em;
            margin: 1em 0;
        }
        
        .chart-title {
            font-size: 1.2em;
            font-weight: 600;
            color: #374151;
            margin-bottom: 1em;
        }
        
        .annotation {
            background: #f0f9ff;
            border-left: 4px solid #3b82f6;
            padding: 1em;
            margin: 1em 0;
            font-style: italic;
            color: #1e40af;
        }
        
        .executive-summary {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1.5em;
            margin: 1.5em 0;
        }
        
        .executive-summary h3 {
            color: #1f2937;
            margin-top: 0;
            margin-bottom: 1em;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
        }
        
        .data-table th,
        .data-table td {
            border: 1px solid #e5e7eb;
            padding: 0.8em;
            text-align: left;
        }
        
        .data-table th {
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
        }
        
        .data-table tr:nth-child(even) {
            background: #f9fafb;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .footer {
            position: fixed;
            bottom: 0.5in;
            right: 0.5in;
            font-size: 0.8em;
            color: #6b7280;
        }
        
        @media print {
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <!-- Cover Page -->
    <div class="cover-page">
        <div class="cover-title">Barangay Analytics Report</div>
        <div class="cover-subtitle">Comprehensive Data Analysis & Insights</div>
        <div class="cover-date">Generated on ${reportDate}</div>
    </div>

    <!-- Executive Summary -->
    <div class="section">
        <h2 class="section-title">Executive Summary</h2>
        <div class="executive-summary">
            <h3>Report Overview</h3>
            <p>This comprehensive analytics report provides detailed insights into barangay operations, service delivery efficiency, and community engagement patterns. The analysis covers a ${timeRange}-day period and includes workload distribution, processing efficiency, and operational trends that directly impact service quality and resident satisfaction.</p>
            
            <h3>Key Findings</h3>
            <p>During the reporting period, the barangay processed <strong>${totalRequests} total requests</strong> with an overall approval rate of <strong>${approvalRate}%</strong>. The most common request type was <strong>${topRequestType[0]}</strong>, representing <strong>${topRequestPercentage}%</strong> of all requests. Currently, there are <strong>${totalPending} pending requests</strong>, with <strong>${overduePercentage}%</strong> being overdue (older than 5 days). The average processing time is <strong>${avgProcessingDays} days</strong>, with a median of <strong>${medianProcessingDays} days</strong>.</p>
        </div>
    </div>

    <!-- Workload Overview -->
    <div class="section">
        <h2 class="section-title">1. Workload Overview</h2>
        
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-value">${totalRequests}</div>
                <div class="kpi-label">Total Requests</div>
                <div class="kpi-change positive">+${Math.abs(trendPct)}% vs last month</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${topRequestPercentage}%</div>
                <div class="kpi-label">Top Request Type</div>
                <div class="kpi-label">${topRequestType[0]}</div>
            </div>
        </div>

        <div class="subsection-title">Request Distribution by Type</div>
        <div class="chart-container">
            <div class="chart-title">Request Type Breakdown</div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Request Type</th>
                        <th>Count</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(requestTypes).map(([type, count]) => {
                        const percentage = totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0;
                        return `
                            <tr>
                                <td>${type}</td>
                                <td>${count}</td>
                                <td>${percentage}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="annotation">
            <strong>Analysis:</strong> Most requests are for <strong>${topRequestType[0]}</strong>, making up <strong>${topRequestPercentage}%</strong> of total requests. This indicates the primary service demand in the barangay and helps prioritize resource allocation.
        </div>
    </div>

    <!-- Efficiency Metrics -->
    <div class="section page-break">
        <h2 class="section-title">2. Efficiency Metrics</h2>
        
        <div class="subsection-title">Pending Requests Analysis</div>
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-value">${totalPending}</div>
                <div class="kpi-label">Total Pending</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${pendingBreakdown.a}</div>
                <div class="kpi-label">0-2 Days</div>
                <div class="kpi-label">${totalPending > 0 ? Math.round((pendingBreakdown.a / totalPending) * 100) : 0}%</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${pendingBreakdown.b}</div>
                <div class="kpi-label">3-5 Days</div>
                <div class="kpi-label">${totalPending > 0 ? Math.round((pendingBreakdown.b / totalPending) * 100) : 0}%</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${pendingBreakdown.c}</div>
                <div class="kpi-label">Overdue (>5 Days)</div>
                <div class="kpi-label">${totalPending > 0 ? Math.round((pendingBreakdown.c / totalPending) * 100) : 0}%</div>
            </div>
        </div>

        <div class="subsection-title">Processing Time Analysis</div>
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-value">${avgProcessingDays}d</div>
                <div class="kpi-label">Average Processing</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${medianProcessingDays}d</div>
                <div class="kpi-label">Median Processing</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${Math.round((processingStats.max / 24) * 10) / 10}d</div>
                <div class="kpi-label">Longest Processing</div>
            </div>
        </div>

        <div class="subsection-title">Approval Rate Analysis</div>
        <div class="chart-container">
            <div class="chart-title">Request Status Distribution</div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Status</th>
                        <th>Count</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Approved</td>
                        <td>${approvedRequests}</td>
                        <td>${totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0}%</td>
                    </tr>
                    <tr>
                        <td>Rejected</td>
                        <td>${overviewData?.analytics?.statusDistribution?.rejected || 0}</td>
                        <td>${totalRequests > 0 ? Math.round(((overviewData?.analytics?.statusDistribution?.rejected || 0) / totalRequests) * 100) : 0}%</td>
                    </tr>
                    <tr>
                        <td>Pending</td>
                        <td>${pendingRequests}</td>
                        <td>${totalRequests > 0 ? Math.round((pendingRequests / totalRequests) * 100) : 0}%</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="annotation">
            <strong>Analysis:</strong> ${overduePercentage > 20 ? 
                `There are ${overduePercentage}% overdue requests, indicating potential bottlenecks in processing. Immediate attention is needed to reduce processing times and improve service delivery.` :
                `The processing efficiency is good with only ${overduePercentage}% overdue requests. Continue monitoring to maintain current service levels.`
            }
        </div>
    </div>

    <!-- Operational Insights -->
    <div class="section page-break">
        <h2 class="section-title">3. Operational Insights</h2>
        
        <div class="subsection-title">Daily Trends Analysis</div>
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-value">${currentMonthRequests}</div>
                <div class="kpi-label">This Month</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${lastMonthRequests}</div>
                <div class="kpi-label">Last Month</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${trendPct >= 0 ? '+' : ''}${trendPct}%</div>
                <div class="kpi-label">Month-over-Month</div>
                <div class="kpi-change ${trendPct >= 0 ? 'positive' : 'negative'}">
                    ${trendPct >= 0 ? 'Increase' : 'Decrease'}
                </div>
            </div>
        </div>

        <div class="chart-container">
            <div class="chart-title">Request Volume Trends by Type</div>
            <p><em>Note: Detailed daily trends chart would be included here showing request patterns over the ${timeRange}-day period, with annotations for peak days and unusual patterns.</em></p>
        </div>

        <div class="subsection-title">Geographic Analysis</div>
        <div class="chart-container">
            <div class="chart-title">Incident Heatmap</div>
            <p><em>Note: Geographic heatmap would be included here showing incident density across the barangay, highlighting areas with higher incident reports for targeted intervention.</em></p>
        </div>
        
        <div class="annotation">
            <strong>Analysis:</strong> ${trendPct >= 0 ? 
                `Request volume has increased by ${trendPct}% compared to last month, indicating growing community engagement and service demand.` :
                `Request volume has decreased by ${Math.abs(trendPct)}% compared to last month, which may indicate seasonal patterns or improved service efficiency.`
            } The geographic distribution of incidents helps identify areas requiring additional attention and resources.
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        Page <span class="page-number"></span>
    </div>

    <script>
        // Add page numbers
        document.addEventListener('DOMContentLoaded', function() {
            const pages = document.querySelectorAll('.page-number');
            pages.forEach((page, index) => {
                page.textContent = index + 1;
            });
        });
    </script>
</body>
</html>
            `;

            printWindow.document.write(pdfContent);
            printWindow.document.close();
            
            // Wait for content to load, then trigger print
            setTimeout(() => {
                printWindow.print();
            }, 1000);
            
        } catch (err) {
            console.error('PDF Generation Error:', err);
            alert('Failed to generate PDF report');
        }
    };

    // Calculate month-over-month change
    const calculateMoMChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    };

    useEffect(() => {
        fetchOverviewAnalytics();
        fetchRequestsData();
    }, [timeRange, fetchOverviewAnalytics, fetchRequestsData]);

    useEffect(() => {
        if (activeTab === 'efficiency' || activeTab === 'operational') {
            fetchDetailedAnalytics();
        }
    }, [activeTab, filters, fetchDetailedAnalytics]);

    useEffect(() => {
        setLoading(false);
    }, [overviewData, detailedData]);

    // --- Barangay Incident Heatmap sample data and helpers ---
    useEffect(() => {
        // Try to load live incident points for heat visualization
        (async () => {
            try {
                const pts = await api.get(`/api/incidents/points?days=${timeRange}`);
                setIncidentPoints(pts.data?.points || []);
            } catch (e) {
                // ignore; map still renders
            }
        })();

        // NOTE: Replace this with live barangay polygons endpoint when available
        const sample = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: { name: 'Sample Barangay A', incident_count: 4 },
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            [120.98823364088946, 14.716209860326728],
                            [120.98955303463111, 14.716635230661353],
                            [120.99113523444566, 14.715260555247426],
                            [120.98941894990219, 14.714197121155507],
                            [120.9882497310569, 14.716209860326728]
                        ]
                    }
                }
            ]
        };
        setBarangayGeoJson(sample);
        setMaxIncidentCount(4);

        // Compute map bounds from GeoJSON coordinates (supports LineString/Polygon)
        const toLatLngs = (gj) => {
            try {
                const arr = [];
                (gj.features || []).forEach(f => {
                    const g = f.geometry || {};
                    if (g.type === 'LineString') {
                        (g.coordinates || []).forEach(([lng, lat]) => arr.push([lat, lng]));
                    } else if (g.type === 'Polygon') {
                        (g.coordinates || []).flat().forEach(([lng, lat]) => arr.push([lat, lng]));
                    } else if (g.type === 'MultiPolygon') {
                        (g.coordinates || []).flat(2).forEach(([lng, lat]) => arr.push([lat, lng]));
                    }
                });
                return arr;
            } catch { return []; }
        };
        const pts = toLatLngs(sample);
        if (pts.length) {
            const lats = pts.map(p => p[0]);
            const lngs = pts.map(p => p[1]);
            const minLat = Math.min(...lats), maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
            // Smaller padding to zoom in closer while preserving full polygon
            const padLat = Math.max(0.00001, (maxLat - minLat) * 0.01);
            const padLng = Math.max(0.00001, (maxLng - minLng) * 0.01);
            const bounds = [[minLat - padLat, minLng - padLng], [maxLat + padLat, maxLng + padLng]];
            setBarangayBounds(bounds);
            // centroid (simple average sufficient for small area)
            const avgLat = (minLat + maxLat) / 2;
            const avgLng = (minLng + maxLng) / 2;
            setBarangayCenter([avgLat, avgLng]);
        }
    }, [timeRange]);

    const getColorForCount = (count) => {
        // Color scale from low (light yellow) to high (red)
        const ratio = Math.min(1, Math.max(0, count / Math.max(1, maxIncidentCount)));
        // interpolate between #fde68a (low) -> #fb923c (mid) -> #ef4444 (high)
        const stops = [
            { r: 253, g: 230, b: 138 }, // #fde68a
            { r: 251, g: 146, b: 60 },  // #fb923c
            { r: 239, g: 68,  b: 68 }   // #ef4444
        ];
        const t = ratio * 2;
        const i = Math.floor(t);
        const frac = t - i;
        const a = stops[Math.min(i, stops.length - 1)];
        const b = stops[Math.min(i + 1, stops.length - 1)];
        const mix = (x, y) => Math.round(x + (y - x) * frac);
        return `rgb(${mix(a.r, b.r)}, ${mix(a.g, b.g)}, ${mix(a.b, b.b)})`;
    };

    const geoJsonStyle = (feature) => {
        const c = feature?.properties?.incident_count || 0;
        return {
            color: '#fff',
            weight: 1,
            fillColor: getColorForCount(c),
            fillOpacity: 0.7,
        };
    };

    // ---- Simple helpers for charts (inline SVG) ----
    const renderApprovalProgress = (ratePct) => (
        <div style={{ width: '100%', background: '#e5e7eb', borderRadius: 8, height: 10 }}>
            <div style={{ width: `${Math.max(0, Math.min(100, ratePct))}%`, height: '100%', background: '#22c55e', borderRadius: 8 }} />
        </div>
    );

    const buildDailyTrendSeries = (dailyTrendsObj, points = 14) => {
        const entries = Object.entries(dailyTrendsObj || {})
            .map(([k, v]) => ({ d: new Date(k).getTime(), c: Number(v) || 0 }))
            .sort((a, b) => a.d - b.d);
        const sliced = entries.slice(Math.max(0, entries.length - points));
        const maxV = Math.max(1, ...sliced.map(x => x.c));
        return { series: sliced, maxV };
    };

    const buildDailyTrendsByType = (rows, days = 30) => {
        const now = Date.now();
        const startDate = now - (days * 24 * 60 * 60 * 1000);
        
        // Group by type and date
        const byType = {};
        const types = ['Document Request', 'Create ID', 'Incident Report'];
        
        types.forEach(type => {
            byType[type] = {};
        });
        
        (rows || []).forEach(row => {
            const created = new Date(row.created_at).getTime();
            if (created >= startDate) {
                const dateKey = new Date(created).toISOString().split('T')[0];
                const type = row.type || 'Document Request';
                if (byType[type]) {
                    byType[type][dateKey] = (byType[type][dateKey] || 0) + 1;
                }
            }
        });
        
        // Convert to series format
        const allDates = new Set();
        Object.values(byType).forEach(typeData => {
            Object.keys(typeData).forEach(date => allDates.add(date));
        });
        
        const sortedDates = Array.from(allDates).sort();
        const series = {};
        
        types.forEach(type => {
            series[type] = sortedDates.map(date => ({
                d: new Date(date).getTime(),
                c: byType[type][date] || 0
            }));
        });
        
        return { series, maxV: Math.max(1, ...Object.values(byType).flatMap(Object.values)) };
    };

    const renderMultiLineChart = (seriesData, maxV, w = 1000, h = 350) => {
        if (!seriesData || Object.keys(seriesData).length === 0) return null;
        
        const colors = {
            'Document Request': '#3b82f6',
            'Create ID': '#10b981', 
            'Incident Report': '#f59e0b'
        };
        
        const allPoints = Object.values(seriesData).flat();
        if (allPoints.length === 0) return null;
        
        const minDate = Math.min(...allPoints.map(p => p.d));
        const maxDate = Math.max(...allPoints.map(p => p.d));
        const dateRange = maxDate - minDate;
        
        const getX = (timestamp) => 20 + ((timestamp - minDate) / dateRange) * (w - 40);
        const getY = (value) => h - 50 - ((value / maxV) * (h - 80));
        
        // Generate date labels with better spacing - show more dates
        const allDates = [...new Set(allPoints.map(p => p.d))].sort((a, b) => a - b);
        const labelInterval = Math.max(1, Math.floor(allDates.length / 8)); // Show ~8 labels max
        const dateLabels = allDates.filter((_, i) => i % labelInterval === 0 || i === allDates.length - 1);
        
        return (
            <svg width={w} height={h} style={{ width: '100%', height: h }}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
                    <line
                        key={ratio}
                        x1={20}
                        x2={w - 20}
                        y1={20 + ratio * (h - 80)}
                        y2={20 + ratio * (h - 80)}
                        stroke="#f1f5f9"
                        strokeWidth={1}
                    />
                ))}
                
                {/* Data lines */}
                {Object.entries(seriesData).map(([type, points]) => {
                    if (points.length === 0) return null;
                    
                    const pathData = points
                        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.d)} ${getY(p.c)}`)
                        .join(' ');
                    
                    return (
                        <g key={type}>
                            <path
                                d={pathData}
                                fill="none"
                                stroke={colors[type] || '#6b7280'}
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {points.map((p, i) => (
                                <circle
                                    key={i}
                                    cx={getX(p.d)}
                                    cy={getY(p.c)}
                                    r={3}
                                    fill={colors[type] || '#6b7280'}
                                    stroke="#fff"
                                    strokeWidth={1}
                                />
                            ))}
                        </g>
                    );
                })}
                
                {/* Date labels */}
                {dateLabels.map((date, i) => {
                    const dateObj = new Date(date);
                    const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                        <text
                            key={i}
                            x={getX(date)}
                            y={h - 20}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#6b7280"
                            transform={`rotate(-45 ${getX(date)} ${h - 20})`}
                        >
                            {label}
                        </text>
                    );
                })}
                
                {/* Y-axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const value = Math.round(ratio * maxV);
                    const y = 20 + ratio * (h - 80);
                    return (
                        <text
                            key={i}
                            x={15}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="10"
                            fill="#6b7280"
                        >
                            {value}
                        </text>
                    );
                })}
                
                {/* Axis labels */}
                <text
                    x={w / 2}
                    y={h - 10}
                    textAnchor="middle"
                    fontSize="13"
                    fill="#374151"
                    fontWeight="600"
                >
                    Dates
                </text>
            </svg>
        );
    };

    const renderLineChart = (series, maxV, w = 280, h = 90) => {
        if (!series.length) return null;
        const xs = series.map((_, i) => (i / Math.max(1, series.length - 1)) * (w - 20) + 10);
        const ys = series.map(p => h - 10 - (p.c / maxV) * (h - 20));
        const points = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
        return (
            <svg width={w} height={h} style={{ width: '100%', height: h }}>
                <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" />
                {xs.map((x, i) => (
                    <circle key={i} cx={x} cy={ys[i]} r={2} fill="#6366f1" />
                ))}
            </svg>
        );
    };

    // Processing time stats (hours)
    const getProcessingTimes = (rows) => {
        const isCompleted = (st) => ['approved', 'rejected', 'completed', 'closed'].includes(String(st || '').toLowerCase());
        const times = (rows || [])
            .filter(r => isCompleted(r.status))
            .map(r => {
                const created = new Date(r.created_at).getTime();
                const endTs = new Date(r.resolved_at || r.updated_at || r.created_at).getTime();
                return Math.max(0, (endTs - created) / (1000 * 60 * 60));
            })
            .filter(v => isFinite(v));
        if (!times.length) return { avg: 0, median: 0, min: 0, max: 0, q1: 0, q3: 0 };
        const sorted = [...times].sort((a, b) => a - b);
        const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        return { avg, median, min: sorted[0], max: sorted[sorted.length - 1], q1, q3 };
    };

    const renderBoxPlot = (min, q1, median, q3, max, w = 320, h = 80) => {
        if (max <= 0) return null;
        const scale = (v) => 10 + (w - 20) * (v / max);
        const y = h / 2;
        return (
            <svg width={w} height={h} style={{ width: '100%', height: h }}>
                <line x1={scale(min)} x2={scale(max)} y1={y} y2={y} stroke="#cbd5e1" strokeWidth="3" />
                <rect x={scale(q1)} y={y - 14} width={Math.max(2, scale(q3) - scale(q1))} height={28} fill="#e0e7ff" stroke="#6366f1" />
                <line x1={scale(median)} x2={scale(median)} y1={y - 16} y2={y + 16} stroke="#6366f1" strokeWidth="2" />
                <line x1={scale(min)} x2={scale(min)} y1={y - 10} y2={y + 10} stroke="#94a3b8" />
                <line x1={scale(max)} x2={scale(max)} y1={y - 10} y2={y + 10} stroke="#94a3b8" />
            </svg>
        );
    };

    const renderHorizontalBars = (entries, total) => {
        const maxV = Math.max(1, ...entries.map(e => e[1]));
        return (
            <div style={{ display: 'grid', gap: 8 }}>
                {entries.map(([label, value]) => (
                    <div key={label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 50px', alignItems: 'center', gap: 8 }}>
                        <div style={{ color: '#374151', fontSize: 12 }}>{label}</div>
                        <div style={{ background: '#f1f5f9', height: 10, borderRadius: 6 }}>
                            <div style={{ width: `${(value / maxV) * 100}%`, height: '100%', background: '#60a5fa', borderRadius: 6 }} />
                        </div>
                        <div style={{ color: '#6b7280', fontSize: 12, textAlign: 'right' }}>{value}</div>
                    </div>
                ))}
            </div>
        );
    };

    const renderDonut = (segments, size = 220) => {
        const total = Math.max(1, segments.reduce((a, s) => a + s.value, 0));
        let accum = 0;
        const stops = segments.map(s => {
            const start = (accum / total) * 360; accum += s.value; const end = (accum / total) * 360;
            return `${s.color} ${start}deg ${end}deg`;
        }).join(', ');
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: size, height: size, borderRadius: '50%', background: `conic-gradient(${stops})`, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 20, background: '#fff', borderRadius: '50%' }} />
                </div>
                <div>
                    {segments.map(s => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#374151' }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: 'inline-block' }} />
                            <span>{s.label}: {s.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const buildPendingBuckets = (rows) => {
        const now = Date.now();
        let a = 0, b = 0, c = 0;
        (rows || []).filter(r => r.status === 'pending').forEach(r => {
            const created = new Date(r.created_at).getTime();
            const days = Math.max(0, (now - created) / (1000 * 60 * 60 * 24));
            if (days <= 2) a++; else if (days <= 5) b++; else c++;
        });
        return { a, b, c };
    };

    const renderStacked = ({ a, b, c }) => {
        const total = Math.max(1, a + b + c);
        return (
            <div style={{ width: '100%', height: 14, background: '#e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ width: `${(a/total)*100}%`, height: '100%', background: '#93c5fd', display: 'inline-block' }} />
                <div style={{ width: `${(b/total)*100}%`, height: '100%', background: '#60a5fa', display: 'inline-block' }} />
                <div style={{ width: `${(c/total)*100}%`, height: '100%', background: '#2563eb', display: 'inline-block' }} />
            </div>
        );
    };

    const buildMovingAverage = (series, windowSize = 7) => {
        const out = [];
        for (let i = 0; i < series.length; i++) {
            const from = Math.max(0, i - windowSize + 1);
            const slice = series.slice(from, i + 1).map(s => s.c);
            const avg = slice.reduce((a,b)=>a+b,0) / slice.length;
            out.push({ d: series[i].d, c: avg });
        }
        return out;
    };

    // ---- Pending Requests Module (self-contained, reusable) ----
    const PendingRequestsModule = ({ rows }) => {
        const now = Date.now();
        const pending = (rows || []).filter(r => r.status === 'pending');
        const total = pending.length;
        // Age buckets
        let recent = 0, mid = 0, over = 0;
        let totalHours = 0;
        pending.forEach(r => {
            const created = new Date(r.created_at).getTime();
            const hours = Math.max(0, (now - created) / (1000 * 60 * 60));
            totalHours += hours;
            const days = hours / 24;
            if (days <= 2) recent++; else if (days <= 5) mid++; else over++;
        });
        const pct = (n) => total ? Math.round((n / total) * 100) : 0;
        const avgHours = total ? totalHours / total : 0;
        // Trend: compare new pending created in last 7d vs 7–14d and still pending
        const last7 = pending.filter(r => (now - new Date(r.created_at).getTime()) <= 7*24*3600*1000).length;
        const prev7 = pending.filter(r => {
            const age = now - new Date(r.created_at).getTime();
            return age > 7*24*3600*1000 && age <= 14*24*3600*1000;
        }).length;
        const trendPct = prev7 === 0 ? (last7 > 0 ? 100 : 0) : Math.round(((last7 - prev7) / prev7) * 100);

        const buckets = [
            { label: '0–2d', value: recent, color: '#93c5fd' },
            { label: '3–5d', value: mid, color: '#60a5fa' },
            { label: '>5d', value: over, color: '#ef4444' },
        ];
        const maxV = Math.max(1, total);
        const annotationPct = total ? Math.round(((mid + over) / total) * 100) : 0;

        return (
            <div className="chart-card">
                <h3>Pending Requests</h3>
                <div className="chart-content">
                    {/* KPI */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#111827' }}>{total}</div>
                            <div style={{ color: '#6b7280', fontSize: 12 }}>Total pending</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: trendPct >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                                {trendPct >= 0 ? '▲' : '▼'} {Math.abs(trendPct)}% vs prev. 7d
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Avg pending: {avgHours.toFixed(1)}h</div>
                        </div>
                    </div>

                    {/* Stacked bar with inline labels */}
                    <div style={{ position: 'relative', width: '100%', height: 18, background: '#e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 6 }}>
                        {buckets.reduce((acc, b, idx) => {
                            const widthPct = total ? (b.value / total) * 100 : 0;
                            const leftPct = acc.left;
                            acc.left += widthPct;
                            acc.nodes.push(
                                <div key={b.label} style={{ position: 'absolute', left: `${leftPct}%`, top: 0, height: '100%', width: `${widthPct}%`, background: b.color }} />
                            );
                            // Inline label if segment wide enough
                            if (widthPct > 10) {
                                acc.nodes.push(
                                    <div key={b.label + '-lbl'} style={{ position: 'absolute', left: `${leftPct + widthPct/2}%`, top: -18, transform: 'translateX(-50%)', fontSize: 12, color: '#374151', fontWeight: 700 }}>
                                        {b.value} ({pct(b.value)}%)
                                    </div>
                                );
                            }
                            return acc;
                        }, { left: 0, nodes: [] }).nodes}
                    </div>
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
                        {buckets.map(b => (
                            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
                                <span style={{ width: 12, height: 12, background: b.color, borderRadius: 3, display: 'inline-block' }} />
                                <span>{b.label}: {b.value} ({pct(b.value)}%)</span>
                            </div>
                        ))}
                    </div>
                    {/* Annotation */}
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{annotationPct}% of pending requests are older than 3 days</div>
                </div>
            </div>
        );
    };

    // ---- Daily Trends Module (self-contained, reusable) ----
    const DailyTrendsModule = ({ rows, days = parseInt(timeRange) || 30 }) => {
        const now = Date.now();
        const currentMonth = new Date(now).getMonth();
        const currentYear = new Date(now).getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        
        // Calculate current month vs last month
        const currentMonthRequests = (rows || []).filter(r => {
            const created = new Date(r.created_at);
            return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
        }).length;
        
        const lastMonthRequests = (rows || []).filter(r => {
            const created = new Date(r.created_at);
            return created.getMonth() === lastMonth && created.getFullYear() === lastMonthYear;
        }).length;
        
        const trendPct = lastMonthRequests === 0 ? (currentMonthRequests > 0 ? 100 : 0) : 
            Math.round(((currentMonthRequests - lastMonthRequests) / lastMonthRequests) * 100);
        
        // Build trend data by type
        const { series: trendSeries, maxV } = buildDailyTrendsByType(rows, days);
        
        // Calculate 7-day moving average for overall trend
        const allRequests = (rows || []).filter(r => {
            const created = new Date(r.created_at).getTime();
            return (now - created) <= (days * 24 * 60 * 60 * 1000);
        });
        
        const dailyTotals = {};
        allRequests.forEach(r => {
            const dateKey = new Date(r.created_at).toISOString().split('T')[0];
            dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + 1;
        });
        
        const dailySeries = Object.entries(dailyTotals)
            .map(([date, count]) => ({ d: new Date(date).getTime(), c: count }))
            .sort((a, b) => a.d - b.d);
        
        const movingAvg = buildMovingAverage(dailySeries, 7);
        
        // Find peak day for annotation
        const peakDay = dailySeries.reduce((max, day) => day.c > max.c ? day : max, { c: 0 });
        const peakDate = new Date(peakDay.d);
        const peakAnnotation = peakDay.c > 0 ? 
            `Request volume peaked on ${peakDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} with ${peakDay.c} requests` : 
            'No significant peaks detected';
        
        // SLA compliance trend (simplified)
        const completedRequests = allRequests.filter(r => 
            ['approved', 'rejected', 'completed', 'closed'].includes(r.status?.toLowerCase())
        );
        
        const slaCompliant = completedRequests.filter(r => {
            const created = new Date(r.created_at).getTime();
            const resolved = new Date(r.resolved_at || r.updated_at || r.created_at).getTime();
            const hours = (resolved - created) / (1000 * 60 * 60);
            return hours <= 72; // 3 days
        }).length;
        
        const slaPct = completedRequests.length > 0 ? 
            Math.round((slaCompliant / completedRequests.length) * 100) : 0;
        
        return (
            <div className="chart-card">
                <h3>Daily Trends</h3>
                <div className="chart-content">
                    {/* KPI Card */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: 16,
                        padding: '12px 16px',
                        background: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0'
                    }}>
                        <div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>This Month vs Last Month</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>
                                {currentMonthRequests} vs {lastMonthRequests}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ 
                                fontSize: 14, 
                                color: trendPct >= 0 ? '#16a34a' : '#dc2626', 
                                fontWeight: 700,
                                marginBottom: 2
                            }}>
                                {trendPct >= 0 ? '↑' : '↓'} {Math.abs(trendPct)}%
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                                {trendPct >= 0 ? 'increase' : 'decrease'}
                            </div>
                        </div>
                    </div>
                    
                    {/* Multi-line Chart */}
                    <div style={{ marginBottom: 16, width: '100%', display: 'flex', alignItems: 'center' }}>
                        <div style={{ 
                            writingMode: 'vertical-rl', 
                            textOrientation: 'mixed',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#374151',
                            marginRight: '8px',
                            height: '350px',
                            display: 'flex',
                            alignItems: 'center',
                            paddingBottom: '20px'
                        }}>
                            Number of Requests
                        </div>
                        <div style={{ flex: 1 }}>
                            {renderMultiLineChart(trendSeries, maxV, 1050, 350)}
                        </div>
                    </div>
                    
                    {/* Legend */}
                    <div style={{ 
                        display: 'flex', 
                        gap: 20, 
                        marginBottom: 12,
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        {Object.entries(trendSeries).map(([type, points]) => {
                            const total = points.reduce((sum, p) => sum + p.c, 0);
                            const colors = {
                                'Document Request': '#3b82f6',
                                'Create ID': '#10b981', 
                                'Incident Report': '#f59e0b'
                            };
                            return (
                                <div key={type} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 6,
                                    fontSize: 12,
                                    color: '#374151'
                                }}>
                                    <span style={{ 
                                        width: 12, 
                                        height: 12, 
                                        background: colors[type] || '#6b7280', 
                                        borderRadius: 2,
                                        display: 'inline-block'
                                    }} />
                                    <span>{type}: {total}</span>
                                </div>
                            );
                        })}
                    </div>
                    
                    
                    {/* Annotation */}
                    <div style={{ 
                        fontSize: 12, 
                        color: '#6b7280', 
                        fontStyle: 'italic',
                        textAlign: 'center'
                    }}>
                        {peakAnnotation}
                    </div>
                </div>
            </div>
        );
    };

    // ---- Average Processing Time Module (self-contained, reusable) ----
    const AverageProcessingTimeModule = ({ rows, slaHours = 72 }) => {
        const isCompleted = (st) => ['approved', 'rejected', 'completed', 'closed'].includes(String(st || '').toLowerCase());
        const completed = (rows || []).filter(r => isCompleted(r.status));
        const now = Date.now();
        const durations = completed.map(r => {
            const created = new Date(r.created_at).getTime();
            const endTs = new Date(r.resolved_at || r.updated_at || r.created_at).getTime();
            return Math.max(0, (endTs - created) / (1000 * 60 * 60));
        }).filter(v => isFinite(v));
        const stats = getProcessingTimes(completed);
        // 80th percentile
        const sorted = durations.slice().sort((a,b)=>a-b);
        const p80 = sorted.length ? sorted[Math.floor(sorted.length * 0.8)] : 0;
        const slaPct = durations.length ? Math.round((durations.filter(h => h <= slaHours).length / durations.length) * 100) : 0;
        // Trend: avg last 7 days vs previous 7 days for completions
        const last7Dur = completed.filter(r => {
            const endTs = new Date(r.resolved_at || r.updated_at || r.created_at).getTime();
            return (now - endTs) <= 7*24*3600*1000;
        }).map(r => {
            const created = new Date(r.created_at).getTime();
            const endTs = new Date(r.resolved_at || r.updated_at || r.created_at).getTime();
            return Math.max(0, (endTs - created) / (1000 * 60 * 60));
        });
        const prev7Dur = completed.filter(r => {
            const endTs = new Date(r.resolved_at || r.updated_at || r.created_at).getTime();
            const age = now - endTs;
            return age > 7*24*3600*1000 && age <= 14*24*3600*1000;
        }).map(r => {
            const created = new Date(r.created_at).getTime();
            const endTs = new Date(r.resolved_at || r.updated_at || r.created_at).getTime();
            return Math.max(0, (endTs - created) / (1000 * 60 * 60));
        });
        const avgArr = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
        const lastAvg = avgArr(last7Dur);
        const prevAvg = avgArr(prev7Dur);
        const trendPct = prevAvg === 0 ? (lastAvg > 0 ? -100 : 0) : Math.round(((prevAvg - lastAvg) / prevAvg) * 100); // positive = faster

        const types = ['Document Request', 'Create ID', 'Incident Report'];
        const byType = types.map(t => {
            const tRows = completed.filter(r => r.type === t);
            const tDur = tRows.map(r => {
                const c = new Date(r.created_at).getTime();
                const u = new Date(r.resolved_at || r.updated_at || r.created_at).getTime();
                return Math.max(0, (u - c) / (1000 * 60 * 60));
            });
            const tSla = tDur.length ? Math.round((tDur.filter(h => h <= slaHours).length / tDur.length) * 100) : 0;
            const tAvg = tDur.length ? (tDur.reduce((a,b)=>a+b,0)/tDur.length) : 0;
            return { label: t, avg: tAvg/24, sla: tSla };
        });

        const toDays = (h) => (h/24).toFixed(1);
        const toHuman = (h) => {
            const d = h/24;
            if (d >= 1) return `${d.toFixed(1)} days`;
            return `${Math.round(h)} hours`;
        };
        const kpiColor = stats.avg <= slaHours ? '#16a34a' : '#dc2626';

        return (
            <div className="chart-card">
                <h3>Average Processing Time</h3>
                <div className="chart-content">
                    {/* Simple KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Average days to complete</div>
                            <div style={{ fontSize: 32, fontWeight: 800, color: kpiColor }}>{toDays(stats.avg)}d</div>
                            <div style={{ fontSize: 12, color: trendPct >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                                {trendPct >= 0 ? '▲ faster' : '▼ slower'} by {Math.abs(trendPct)}% vs last 7 days
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>Typical (median)</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{toDays(stats.median)}d</div>
                        </div>
                    </div>

                    {/* On‑time SLA progress bar */}
                    <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                            <span>On‑time (≤3 days)</span>
                            <span>{slaPct}%</span>
                        </div>
                        <div style={{ width: '100%', background: '#e5e7eb', borderRadius: 8, height: 10 }}>
                            <div style={{ width: `${slaPct}%`, height: '100%', background: slaPct >= 80 ? '#16a34a' : slaPct >= 50 ? '#f59e0b' : '#dc2626', borderRadius: 8 }} />
                        </div>
                    </div>

                    {/* Simple annotation */}
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>80% of requests finished within {toDays(p80)} days</div>
                </div>
            </div>
        );
    };

    const [incidentPoints, setIncidentPoints] = useState([]);

    // React Leaflet heat layer wrapper
    const HeatLayer = ({ points }) => {
        const map = useMap();
        React.useEffect(() => {
            if (!points || !points.length || !L || !L.heatLayer) return;
            const heat = L.heatLayer(points.map(p => [p[0], p[1], 0.8]), {
                radius: 20,
                blur: 15,
                maxZoom: 17,
                minOpacity: 0.3
            });
            heat.addTo(map);
            return () => { try { heat.remove(); } catch {} };
        }, [map, points]);
        return null;
    };

    if (loading) return (
        <div className="analytics-container">
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading analytics data...</p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="analytics-container">
            <div className="error-container">
                <i className="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Analytics</h3>
                <p>{error}</p>
            </div>
        </div>
    );

    return (
        <div className="analytics-container">
            {/* Header Section */}
            <div className="analytics-header">
                <div className="header-content">
                    <h1>Analytics Dashboard</h1>
                    <p>Comprehensive insights and data visualization for BrgyExpress</p>
                </div>
                <div className="header-controls">
                    <div className="time-range-selector">
                        <label htmlFor="timeRange">Time Range:</label>
                        <select 
                            id="timeRange" 
                            value={timeRange} 
                            onChange={(e) => setTimeRange(e.target.value)}
                        >
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="365">Last year</option>
                        </select>
                    </div>
                    <div className="export-buttons">
                        <button onClick={generatePDFReport} className="export-btn pdf">
                            <i className="fas fa-file-pdf"></i>
                            Generate PDF Report
                        </button>
                    </div>
                </div>
            </div>


            {/* Tab Navigation */}
            <div className="analytics-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'workload' ? 'active' : ''}`}
                    onClick={() => setActiveTab('workload')}
                >
                    <i className="fas fa-chart-bar"></i>
                    Workload Overview
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'efficiency' ? 'active' : ''}`}
                    onClick={() => setActiveTab('efficiency')}
                >
                    <i className="fas fa-chart-pie"></i>
                    Efficiency Metrics
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'operational' ? 'active' : ''}`}
                    onClick={() => setActiveTab('operational')}
                >
                    <i className="fas fa-chart-line"></i>
                    Operational Insights
                </button>
            </div>

            {activeTab === 'workload' && overviewData && (
                <div className="overview-section">
                    <div className="charts-grid">
                        <div className="chart-card">
                            <h3>Total Requests</h3>
                            <div className="chart-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 36, fontWeight: 800, color: '#111827' }}>{overviewData.analytics.totalRequests}</div>
                                    <div style={{ color: '#6b7280', fontSize: 12 }}>In selected time range</div>
                                </div>
                            </div>
                        </div>
                        <div className="chart-card">
                            <h3>Request Distribution</h3>
                            <div className="chart-content">
                                {renderHorizontalBars([
                                    ['Document', overviewData.analytics.requestTypes['Document Request'] || 0],
                                    ['Create ID', overviewData.analytics.requestTypes['Create ID'] || 0],
                                    ['Incident', overviewData.analytics.requestTypes['Incident Report'] || 0],
                                ], overviewData.analytics.totalRequests)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'efficiency' && overviewData && (
                <div className="overview-section">
                    <div className="charts-grid">
                        <div className="chart-card">
                            <h3>Approval Rate</h3>
                            <div className="chart-content">
                                {renderDonut([
                                    { label: 'Approved', value: overviewData.analytics.statusDistribution.approved || 0, color: '#22c55e' },
                                    { label: 'Rejected', value: overviewData.analytics.statusDistribution.rejected || 0, color: '#ef4444' },
                                    { label: 'Pending', value: overviewData.analytics.statusDistribution.pending || 0, color: '#f59e0b' },
                                ], 180)}
                            </div>
                        </div>
                        <AverageProcessingTimeModule rows={requestsData} slaHours={72} />
                        <PendingRequestsModule rows={requestsData} />
                    </div>
                </div>
            )}

            {activeTab === 'operational' && overviewData && (
                <div className="overview-section">
                    <div className="charts-grid">
                        <DailyTrendsModule rows={requestsData} days={parseInt(timeRange) || 30} />
                    </div>
                    
                    {/* Barangay Incident Heatmap - Full width below */}
                    <div style={{ marginTop: 16 }}>
                        <div className="chart-card">
                            <h3>Barangay Incident Heatmap</h3>
                            <div className="chart-content" style={{ position: 'relative' }}>
                                <div style={{ width: '100%', height: 400, cursor: 'pointer' }} onClick={() => setShowMapModal(true)}>
                                    {barangayGeoJson && (
                                        <MapContainer
                                            center={barangayCenter}
                                            zoom={17}
                                            style={{ width: '100%', height: '100%' }}
                                            bounds={barangayBounds || undefined}
                                            boundsOptions={{ padding: [0, 0] }}
                                            maxBounds={barangayBounds || undefined}
                                            maxBoundsViscosity={1.0}
                                            dragging={false}
                                            zoomControl={false}
                                            scrollWheelZoom={false}
                                            doubleClickZoom={false}
                                            boxZoom={false}
                                            keyboard={false}
                                            touchZoom={false}
                                        >
                                            <TileLayer
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            <GeoJSON data={barangayGeoJson} style={geoJsonStyle} />
                                            <HeatLayer points={incidentPoints} />
                                        </MapContainer>
                                    )}
                                </div>
                                {/* Legend */}
                                <div style={{ position: 'absolute', right: 12, bottom: 12, background: 'white', padding: 10, borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Incident Density</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 120, height: 10, background: 'linear-gradient(to right, #fde68a, #fb923c, #ef4444)', borderRadius: 6 }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: 120, fontSize: 11, color: '#6b7280' }}>
                                            <span>Low</span>
                                            <span>High</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Hint */}
                                <div style={{ position: 'absolute', left: 12, bottom: 12, background: 'rgba(255,255,255,0.9)', padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12, color: '#374151' }}>
                                    Click to expand
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

// Helper function to get icon for request type
const getTypeIcon = (type) => {
    switch (type) {
        case 'Document Request': return 'fa-file-alt';
        case 'Create ID': return 'fa-id-card';
        case 'Incident Report': return 'fa-exclamation-triangle';
        default: return 'fa-file';
    }
};

export default Analytics; 