import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle, FaClock } from 'react-icons/fa';
// Note: You'll need to upload a "pending approval" illustration to Cloudinary
// or use a placeholder URL like below. Replace with your actual image URL.
import { useLocation } from 'react-router-dom';
import "./LoginPage.css"
import Pending from "./../../Assets/pendingImagebgremoved.png"

export default function PendingPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const username = location.state?.username || 'your account';  // From navigation state

    return (
        <div className="not-approved-container">
            {/* Floating warnings at random positions */}
            <div className="floating-warning top-left">
                <FaClock className="warning-icon" />
                <span>Pending Review</span>
            </div>

            <div className="floating-warning bottom-right blinking">
                <FaClock className="warning-icon" />
                <span>Awaiting Approval</span>
            </div>

            <div className="error-card">
                <img
                    src="https://res.cloudinary.com/dasparepg/image/upload/v1752559684/Pramesh_Logo_r7pens.png"
                    alt="Pramesh Logo"
                    className="error-logo"
                />
                <img
                    src={Pending}
                    alt="Account Pending"
                    className="error-image"
                />

                <h2 className="error-title">
                    <FaExclamationTriangle style={{ marginRight: 8, color: 'orange' }} />
                    Account Awaiting Approval
                </h2>

                <p>
                    Sorry, {username} has not been approved yet. Please wait until an admin reviews and approves your account. You'll be notified via email once it's ready!
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