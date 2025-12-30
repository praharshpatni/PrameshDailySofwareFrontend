// Frontend: ApproveUser.jsx (Fixed Immediate UI Update on Approve)
import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import { Server_url, socket_url } from './../../Urls/AllData'; // Adjust path as needed
import './ApproveUser.css';
import { useDropdowns } from '../../Contexts/DropdownContext'; // Ensure path is correct
import ApprovedUser from "./SettingsPageAsset/ApprovedUser.jpg"
import RejectedUser from "./SettingsPageAsset/RejectedUser.jpg"
import AcceptedUser from "./SettingsPageAsset/AcceptedUser.jpg"

const socket = io(socket_url); // Connect to server (adjust if different port)
export default function ApproveUser() {
    const [allRms, setAllRms] = useState({ pending: [], approved: [], rejected: [] });
    const [activeTab, setActiveTab] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Destructure ONLY what's available from context (no setDropdownFields)
    const { refreshDropdowns } = useDropdowns();
    // Fetch RMs by status (wrapped in useCallback for stability)
    const fetchRmsByStatus = useCallback(async (status) => {
        try {
            const res = await fetch(`${Server_url}/rms?status=${status}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `Failed to fetch ${status} RMs`);
            }
            // Sort by registered_at descending (latest first)
            return data.sort((a, b) => new Date(b.registered_at) - new Date(a.registered_at));
        } catch (err) {
            console.error(`Error fetching ${status} RMs:`, err);
            return [];
        }
    }, []);
    // Fetch all RMs (depends on fetchRmsByStatus)
    const fetchAllRms = useCallback(async () => {
        setLoading(true);
        try {
            const [pending, approved, rejected] = await Promise.all([
                fetchRmsByStatus('pending'),
                fetchRmsByStatus('approved'),
                fetchRmsByStatus('rejected'),
            ]);
            setAllRms({ pending, approved, rejected });
            setError('');
        } catch (err) {
            setError('Failed to load RM data');
        } finally {
            setLoading(false);
        }
    }, [fetchRmsByStatus]);
    // Accept RM (only for pending)
    const handleAccept = async (id) => {
        try {
            const res = await fetch(`${Server_url}/accept_rm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (res.ok) {
                // Refetch dropdowns via context (this updates the shared state)
                await refreshDropdowns();
                // Refetch RMs for immediate UI update
                await fetchAllRms();
            }
            if (!res.ok) {
                throw new Error(data.error || 'Failed to accept RM');
            }
            // Socket will handle further updates if needed
        } catch (err) {
            setError(err.message);
        }
    };
    // Reject RM (only for pending)
    const handleReject = async (id) => {
        try {
            const res = await fetch(`${Server_url}/reject_rm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (res.ok) {
                // Refetch RMs for immediate UI update (no dropdown impact on reject)
                await fetchAllRms();
            }
            if (!res.ok) {
                throw new Error(data.error || 'Failed to reject RM');
            }
            // Socket will handle further updates if needed
        } catch (err) {
            setError(err.message);
        }
    };
    // Socket.io listeners for real-time updates
    useEffect(() => {
        // Listen for new RM (add to pending)
        socket.on('new_rm', (newRmData) => {
            console.log('New RM registered:', newRmData);
            setAllRms(prev => ({
                ...prev,
                pending: [newRmData, ...prev.pending].sort((a, b) => new Date(b.registered_at) - new Date(a.registered_at)) // Add and sort to keep latest first
            }));
        });
        // Initial fetch
        fetchAllRms();
        // Cleanup listeners on unmount
        return () => {
            socket.off('new_rm');
        };
    }, [fetchAllRms]); // Safe dependency: fetchAllRms is stable via useCallback
    const currentRms = allRms[activeTab];
    const isPendingTab = activeTab === 'pending';
    // Format date as DD/MM/YYYY
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };
    if (loading) {
        return <div className="loading">Loading RMs... (Real-time updates enabled)</div>;
    }
    const tabs = ['pending', 'approved', 'rejected'];
    const activeIndex = tabs.indexOf(activeTab);
    // Define exact left positions (0% for first, 33.333333% for second, 66.666666% for third)
    const leftPositions = ['0%', '34%', '67%'];
    const indicatorLeft = leftPositions[activeIndex];
    return (
        <div className="approve-user-container">
            <h2>Manage RM Requests</h2>
            {error && <p className="error">{error}</p>}
            {/* Tabs */}
            <div className="tabs">
                <div
                    className="background_overlay"
                    style={{ left: indicatorLeft }} // Dynamic left position
                ></div>
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)} ({allRms[tab].length})
                    </button>
                ))}
            </div>
            {currentRms.length === 0 ? (
                <div className="accept_reject_request">
                    {activeTab === "pending" ? (
                        <img src={ApprovedUser} alt="" />
                    ) : activeTab === "rejected" ? (
                        <img src={RejectedUser} alt="nothing" />
                    ) : (
                        <img src={AcceptedUser} alt="nothing" />
                    )}
                    <p>No {activeTab} RMs found. (Live updates via Socket.io)</p>
                </div>
            ) : (
                <div className="rm_table_wrapper">
                    <table className="rm-table">
                        <thead>
                            <tr>
                                <th>Index</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Registered On</th>
                                {isPendingTab && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {currentRms.map((rm, index) => (
                                <tr key={rm.id}>
                                    <td>{index + 1}</td>
                                    <td>{rm.user_name}</td>
                                    <td>{rm.user_email}</td>
                                    <td>{formatDate(rm.registered_at)}</td>
                                    {isPendingTab && (
                                        <td>
                                            <button
                                                className="accept-btn"
                                                onClick={() => handleAccept(rm.id)}
                                            >
                                                Accept
                                            </button>
                                            <button
                                                className="reject-btn"
                                                onClick={() => handleReject(rm.id)}
                                            >
                                                Reject
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}