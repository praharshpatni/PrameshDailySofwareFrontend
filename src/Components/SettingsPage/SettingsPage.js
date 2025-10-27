import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import DropdownSettings from '../DropdownSettings';
import './SettingsPage.css';
import { Server_url } from '../../Urls/AllData';
import { RiShutDownLine } from 'react-icons/ri';
import {
    FaArrowLeft,
    FaTags,
    FaUserCog,
    FaUpload,
    FaUserCircle,
    FaEdit
} from 'react-icons/fa';
import useFilteredRowsByRM from '../../hooks/useFilteredRowsByRM';
import { useNavigate } from 'react-router-dom';
import CommissionCounter from './CommissionCounter';
import EditPassword from "./EditPassword"
import ImportExcel from "./ImportExcel "
import PrameshLogo from './../../Assets/Pramesh Logo.png';

const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState('userprofile');
    const navigate = useNavigate();
    const currentUser = useSelector(state => state.user.currentUser);
    const { isUnrestricted } = useFilteredRowsByRM([]);
    const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);

    const allowedCommissionEmails = (process.env.REACT_APP_ALLOWED_COMMISSION_EMAILS || '')
        .split(',')
        .map(email => email.trim().toLowerCase());

    // Update sessionStorage when autoSave changes
    useEffect(() => {
        sessionStorage.setItem('autoSave', isAutoSaveEnabled);
    }, [isAutoSaveEnabled]);

    const getLinePosition = () => {
        switch (activeTab) {
            case 'userprofile':
                return 5;
            case 'dropdowns':
                return 67;
            case 'import_excel':
                return 130;
            case 'comission_counting':
                return 190;
            case 'edit_password':
                return 248;
            case 'filtermod':
                return 290;
            default:
                return 0;
        }
    };
    useEffect(() => {
        const fetchAutoSaveStatus = async () => {
            try {
                const res = await fetch(`${Server_url}/user/autosave-status/${currentUser?.email}`);
                const data = await res.json();
                if (res.ok && typeof data?.is_autosave_on !== 'undefined') {
                    setIsAutoSaveEnabled(data.is_autosave_on === 1);
                }
            } catch (err) {
                console.error('Failed to fetch autosave status:', err);
            }
        };

        if (currentUser?.email) {
            fetchAutoSaveStatus();
        }
    }, [currentUser?.email]);


    const updateAutoSaveStatus = async (newStatus) => {
        setIsAutoSaveEnabled(newStatus);
        sessionStorage.setItem('autoSave', newStatus);

        try {
            const res = await fetch(`${Server_url}/user/update-autosave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: currentUser?.email,
                    is_autosave_on: newStatus
                }),
            });

            if (!res.ok) {
                console.error('Failed to update autosave status:', await res.text());
            }
        } catch (err) {
            console.error('Error updating autosave status:', err);
        }
    };


    const handleLogout = async () => {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        if (user.email) {
            try {
                const res = await fetch(`${Server_url}/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: user.email }),
                });
                if (!res.ok) {
                    console.error('Logout failed:', await res.text());
                } else {
                    console.log('Logged out successfully');
                }
            } catch (err) {
                console.error('Logout request failed:', err);
            }
        }
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        window.location.href = '/';
    };

    const renderContent = () => {
        if (!isUnrestricted && ['dropdowns', 'import_excel', 'comission_counting'].includes(activeTab)) {
            return <div className="unauthorized-message">⛔ You are not authorized to access this section.</div>;
        }

        switch (activeTab) {
            case 'userprofile':
                return (
                    <div className="user-profile-wrapper">
                        <div className="user-profile-modern-card">
                            <div className="user-profile-left">
                                <div className="user-initials-circle">
                                    <span>{currentUser?.name?.[0]?.toUpperCase() || 'U'}</span>
                                    <div className="gradient_effect"></div>
                                </div>
                            </div>
                            <div className="user-profile-right">
                                <div className="top_part">
                                    <div className="user_email_name">
                                        <h2 className="user-name">{currentUser?.name || 'Unknown User'}</h2>
                                        <p className="user-email">{currentUser?.email || 'No email available'}</p>
                                    </div>
                                    {/* <div className="autosave-toggle">
                                       
                                        <input
                                            type="checkbox"
                                            id="autoSaveSwitch"
                                            checked={isAutoSaveEnabled}
                                            onChange={() => setIsAutoSaveEnabled(prev => !prev)}
                                        />
                                    </div> */}
                                    <div className="autosave-toggle-wrapper">
                                        <label htmlFor="autoSaveSwitch" style={{ marginRight: '10px' }}>
                                            AutoSave
                                        </label>
                                        <label className="autosave-toggle">
                                            <input
                                                type="checkbox"
                                                checked={isAutoSaveEnabled}
                                                onChange={(e) => updateAutoSaveStatus(e.target.checked)}
                                            />
                                            <span className="toggle-slider">
                                                <span className="toggle-text toggle-on">On</span>
                                                <span className="toggle-text toggle-off">Off</span>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                                <button className="user-logout-button" onClick={handleLogout}>
                                    <RiShutDownLine size={22} style={{ color: '#ffff' }} /> Logout
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'dropdowns':
                return <DropdownSettings />;
            case 'import_excel':
                return <ImportExcel />;
            case 'comission_counting':
                return <CommissionCounter />;
            case 'edit_password':
                return <EditPassword />;
            default:
                return null;
        }
    };

    return (
        <div className="settings-page">
            <div className="settings-header">
                <div className="back-button">
                    <FaArrowLeft
                        onClick={() => navigate('/', { replace: true })}
                        style={{ height: '20px', width: '20px', cursor: 'pointer', color: 'white' }}
                    />
                    <h2 className="settings-title">Settings</h2>
                </div>
                <img src={PrameshLogo} alt="Pramesh Logo" />
            </div>

            <div className="side_by_side_data">
                <div className="settings-tabs">
                    <div className="active_line" style={{ top: `${getLinePosition()}px` }} />
                    <button
                        className={`tab-button ${activeTab === 'userprofile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('userprofile')}
                    >
                        <FaUserCircle style={{ marginRight: '7px' }} /> User Profile
                    </button>
                    {isUnrestricted && (
                        <button
                            className={`tab-button ${activeTab === 'dropdowns' ? 'active' : ''}`}
                            onClick={() => setActiveTab('dropdowns')}
                        >
                            <FaTags style={{ marginRight: '7px' }} /> Edit Dropdown Tags
                        </button>
                    )}
                    {isUnrestricted && (
                        <button
                            className={`tab-button ${activeTab === 'import_excel' ? 'active' : ''}`}
                            onClick={() => setActiveTab('import_excel')}
                        >
                            <FaUpload style={{ marginRight: '7px' }} /> Import Excel Files
                        </button>
                    )}
                    {isUnrestricted && allowedCommissionEmails.includes(currentUser?.email) && (
                        <button
                            className={`tab-button ${activeTab === 'comission_counting' ? 'active' : ''}`}
                            onClick={() => setActiveTab('comission_counting')}
                        >
                            <FaUserCog style={{ marginRight: '7px' }} /> Commission Calculator
                        </button>
                    )}
                    {isUnrestricted && allowedCommissionEmails.includes(currentUser?.email) && (
                        <button
                            className={`tab-button ${activeTab === 'edit_password' ? 'active' : ''}`}
                            onClick={() => setActiveTab('edit_password')}
                        >
                            <FaEdit style={{ marginRight: '7px' }} /> Edit ID Password
                        </button>
                    )}
                </div>

                <div className="settings-content">{renderContent()}</div>
            </div>
        </div>
    );
};

export default SettingsPage;