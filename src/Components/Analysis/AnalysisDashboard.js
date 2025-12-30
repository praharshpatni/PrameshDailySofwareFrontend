import React from 'react';
import './AnalysisDashboard.css';
import ChartGenerator from './ChartGenerator';
import { BiBarChartAlt2 } from 'react-icons/bi';
import { AiOutlineConsoleSql } from 'react-icons/ai';
import { useSelector, useDispatch } from 'react-redux';
import SQLTerminal from './SQLTerminal.js';
import { setActiveSubmodule } from './../../Redux/uiSlice';

export default function AnalysisDashboard() {
    const dispatch = useDispatch();
    const activeSubmodule = useSelector(state => state.ui.activeSubmodule);
    const user = JSON.parse(sessionStorage.getItem('user'));
    const userEmail = user?.email || '';
    const allowedEmails = process.env.REACT_APP_ALLOWED_COMMISSION_EMAILS
        ? process.env.REACT_APP_ALLOWED_COMMISSION_EMAILS.split(',').map(email => email.trim())
        : [];
    const isAllowedUser = allowedEmails.includes(userEmail);

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
                {isAllowedUser && (
                    <button
                        className={activeTab === 'sql' ? 'active' : ''}
                        onClick={() => dispatch(setActiveSubmodule('SQL Terminal'))}
                    >
                        <AiOutlineConsoleSql /> SQL Terminal
                    </button>
                )}
            </div>

            {activeTab === 'charts' && (
                <div className="chart-generator">
                    <ChartGenerator />
                </div>
            )}
            {activeTab === "sql" && (
                <div className='sql_terminal'>
                    <SQLTerminal />
                </div>
            )}
        </div>
    );
}