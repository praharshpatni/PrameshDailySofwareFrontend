import React, { useState } from 'react';
import axios from 'axios';
import './AnalysisDashboard.css';
import ChartGenerator from './ChartGenerator';
import { Server_url } from '../../Urls/AllData';
import { FaFileAlt } from 'react-icons/fa';
import { AiOutlineConsoleSql } from 'react-icons/ai';
import { BsJournalText } from 'react-icons/bs';
import { SiMysql } from "react-icons/si";
import { BiBarChartAlt2 } from 'react-icons/bi';

import { useSelector, useDispatch } from 'react-redux';
import { setActiveSubmodule } from './../../Redux/uiSlice';

export default function AnalysisDashboard() {
    const dispatch = useDispatch();
    const activeSubmodule = useSelector(state => state.ui.activeSubmodule);

    const [query, setQuery] = useState('');
    const [result, setResult] = useState([]);
    const [queryLogs, setQueryLogs] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [tableName, setTableName] = useState('');
    const [queryExecuted, setQueryExecuted] = useState(false);
    const user = JSON.parse(sessionStorage.getItem('user'));
    const userEmail = user?.email || '';

    const runQuery = async () => {
        if (!query.trim()) return;
        setQueryExecuted(true);

        if (query.trim() === ':show-logs') {
            try {
                const res = await axios.get(`${Server_url}/api/query-logs`);
                setQueryLogs(res.data.logs || []);
                setResult([]);
                setTableName('');
                setError('');
            } catch (err) {
                setError('Failed to load logs');
                setQueryLogs([]);
            }
            return;
        }

        setLoading(true);
        const match = query.match(/select\s+\*\s+from\s+(\w+)/i);
        const extractedTable = match ? match[1] : '';
        setTableName(extractedTable);

        try {
            const user = JSON.parse(sessionStorage.getItem('user'));

            const res = await axios.post(`${Server_url}/api/run-query`, { query }, {
                headers: {
                    'x-user-email': user?.email || '',
                    'x-user-name': user?.name || ''
                }
            });

            setResult(res.data.rows || []);
            setQueryLogs([]);
            setError('');
        } catch (err) {
            console.error("Query failed:", err.response || err);
            setResult([]);
            setQueryLogs([]);
            setTableName('');
            setError(err.response?.data?.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (value) => {
        if (!value) return '';
        const date = new Date(value);
        return isNaN(date) ? value : date.toLocaleDateString('en-GB');
    };

    const tabMap = {
        'Chart Generator': 'charts',
        'SQL Terminal': 'sql'
    };

    const activeTab = tabMap[activeSubmodule] || 'charts';

    return (
        <div className="analysis-dashboard">
            <div className="dashboard-tabs">
                <button
                    className={activeTab === 'charts' ? 'active' : ''}
                    onClick={() => dispatch(setActiveSubmodule('Chart Generator'))}
                >
                    <BiBarChartAlt2 /> Chart Generator
                </button>
                {userEmail === 'praharshpatni@gmail.com' && (
                    <button
                        className={activeTab === 'sql' ? 'active' : ''}
                        onClick={() => dispatch(setActiveSubmodule('SQL Terminal'))}
                    >
                        <AiOutlineConsoleSql /> SQL Terminal
                    </button>
                )}
            </div>

            {activeTab === 'sql' && userEmail === 'praharshpatni@gmail.com' && (
                <>
                    <textarea
                        className="sql-textarea"
                        placeholder="Write your SQL SELECT query here or type ':show-logs'"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />

                    <button onClick={runQuery} className="generate-btn" disabled={loading}>
                        {loading ? 'Loading...' : 'Run Query'}
                    </button>

                    {error && <p className="error-msg">{error}</p>}

                    {!queryExecuted && (
                        <div className="initial-sql-placeholder">
                            <SiMysql style={{ height: "80px", width: "80px", color: '#00758F' }} />
                            <h3>Welcome to the SQL Terminal</h3>
                            <p>Start by writing a <code>SELECT</code> query above to fetch data from the database.</p>
                            <p>Or type <code>:show-logs</code> to view query logs.</p>
                        </div>
                    )}

                    {queryExecuted && (
                        result.length > 0 ? (
                            <div className="query-results">
                                <h3><FaFileAlt /> Result {tableName && <span className="table-name">from <code>{tableName}</code></span>}</h3>
                                <table>
                                    <thead>
                                        <tr>
                                            {Object.keys(result[0]).map(col => (
                                                <th key={col}>{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.map((row, idx) => (
                                            <tr key={idx}>
                                                {Object.entries(row).map(([col, val], i) => (
                                                    <td key={i}>
                                                        {(col.toLowerCase().includes('date') ||
                                                            col.toLowerCase().includes('proceed') ||
                                                            col.toLowerCase().includes('received'))
                                                            ? formatDate(val)
                                                            : val}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            !loading && !error && query.trim().toLowerCase().startsWith('select') && (
                                <p className="no-data-msg">📭 No data available for this query.</p>
                            )
                        )
                    )}

                    {queryLogs.length > 0 && (
                        <div className="terminal-output">
                            <h3><BsJournalText /> Query Logs</h3>
                            <pre>
                                {queryLogs.map((log, i) => (
                                    <div key={i}>
                                        <code>
                                            [{formatDate(log.request_time)}] {log.user_email} ➜ {log.query_text}
                                        </code>
                                    </div>
                                ))}
                            </pre>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'charts' && (
                <div className="chart-generator">
                    <ChartGenerator />
                </div>
            )}
        </div>
    );
}
