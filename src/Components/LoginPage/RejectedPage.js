import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';  // Denied icon
import { useLocation } from 'react-router-dom';
import "./LoginPage.css"

export default function RejectedPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const username = location.state?.username || 'your account';  // From navigation state

    return (
        <div className="rejected-container">  {/* Or reuse .login-error-container if styles match */}
            {/* Floating warnings at random positions – red theme */}
            <div className="floating-warning top-left">
                <FaTimesCircle className="warning-icon" style={{ color: 'red' }} />
                <span>Access Denied</span>
            </div>

            <div className="floating-warning bottom-right blinking">
                <FaTimesCircle className="warning-icon" style={{ color: 'red' }} />
                <span>Rejected</span>
            </div>

            <div className="error-card">
                <img
                    src="https://res.cloudinary.com/dasparepg/image/upload/v1752559684/Pramesh_Logo_r7pens.png"
                    alt="Pramesh Logo"
                    className="error-logo"
                />
                <img
                    src="https://res.cloudinary.com/dasparepg/image/upload/v1752559684/Access_Denied_qpbnoc.jpg"
                    alt="Account Rejected"
                    className="error-image"
                />

                <h2 className="error-title">
                    <FaExclamationTriangle style={{ marginRight: 8, color: 'red' }} />
                    Account Rejected
                </h2>

                <p className="error-message">
                    Sorry, {username} has been rejected by the admin. For more details or to reapply, please contact support. We're here to help!
                </p>

                <div className="error-actions">
                    <button className="error-button back-button" onClick={() => navigate('/')}>
                        Back to Login
                    </button>
                    <button className="error-button contact-button" onClick={() => window.location.href = 'mailto:admin@pramesh.com'}>
                        Contact Admin
                    </button>
                </div>
            </div>
        </div>
    );
}