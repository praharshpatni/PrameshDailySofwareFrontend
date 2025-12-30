import React from 'react';
import { useNavigate } from 'react-router-dom';
// import Access_denied from "./../../Assets/Access Denied.jpg";
// import Pramesh_logo from './../../Assets/Pramesh Logo.png';
import { FaExclamationTriangle } from 'react-icons/fa';
// create this file if it doesn't exist

export default function LoginErrorPage() {
    const navigate = useNavigate();

    return (
        <div className="login-error-container">
            {/* Floating warning at random position */}
            <div className="floating-warning top-left">
                <FaExclamationTriangle className="warning-icon" />
                <span>Unauthorized Access</span>
            </div>

            <div className="floating-warning bottom-right blinking">
                <FaExclamationTriangle className="warning-icon" />
                <span>Access Denied</span>
            </div>

            <div className="error-card">
                <img src="https://res.cloudinary.com/dasparepg/image/upload/v1752559684/Pramesh_Logo_r7pens.png" alt="Pramesh Logo" className="error-logo" />
                <img src="https://res.cloudinary.com/dasparepg/image/upload/v1752559684/Access_Denied_qpbnoc.jpg" alt="Login Error" className="error-image" />

                <h2 className="error-title">
                    <FaExclamationTriangle style={{ marginRight: 8, color: 'red' }} />
                    Login Attempt Blocked
                </h2>

                <div className="error-actions">
                    <button className="error-button back-button" onClick={() => navigate('/')}>
                        Back to Login
                    </button>
                    <button className="error-button contact-button" onClick={() => window.location.href = 'mailto:praharsh@pramesh.com'}>
                        Contact Admin
                    </button>
                </div>
            </div>
        </div>
    );
}
