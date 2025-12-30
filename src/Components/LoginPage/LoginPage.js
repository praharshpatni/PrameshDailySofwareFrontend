import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti'; // Add this import for the blast effect (install: npm install react-confetti)
import { Server_url } from './../../Urls/AllData';
import "./LoginPage.css";
import Pramesh_logo from "./../../Assets/Pramesh Logo.png";
import { FaUserSecret } from "react-icons/fa";
import { FaMask } from "react-icons/fa6";

export default function LoginPage({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const [showRegister, setShowRegister] = useState(false);

    // Registration states
    const [username, setUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [regError, setRegError] = useState('');
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false); // Changed to boolean for cleaner logic
    const [isLoading, setIsLoading] = useState(false); // New loading state

    // Validation error states
    const [usernameError, setUsernameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmError, setConfirmError] = useState('');

    const handleLogin = async () => {

        if (!email.trim() || !password.trim()) {
            setError("Enter Credentials");
            return;
        }
        try {
            const res = await fetch(`${Server_url}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (!res.ok) {
                if (res.status === 403) {
                    navigate("/login-error");
                    return;
                }
                else if (res.status === 402 && data.message === "pending") {
                    navigate("/pending");
                    return;
                }
                else if (res.status === 402 && data.message === "rejected") {
                    navigate("/rejected");
                    return;
                }
                throw new Error(data.error || 'Login failed');
            }

            sessionStorage.setItem('user', JSON.stringify({
                email: data.email,
                name: data.name
            }));

            onLoginSuccess({ email: data.email, name: data.name });

        } catch (err) {
            setError(err.message);
        }
    };

    const validateUsername = (value) => {
        const trimmedValue = value.trim();
        if (!trimmedValue) {
            setUsernameError('Username is required');
            return false;
        } else if (trimmedValue.length < 3) {
            setUsernameError('Username must be at least 3 characters');
            return false;
        } else {
            setUsernameError('');
            return true;
        }
    };

    const validateEmail = (value) => {
        const trimmedValue = value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!trimmedValue) {
            setEmailError('Email is required');
            return false;
        } else if (!emailRegex.test(trimmedValue)) {
            setEmailError('Please enter a valid email address');
            return false;
        } else {
            setEmailError('');
            return true;
        }
    };

    const validatePassword = (value) => {
        const trimmedValue = value.trim();
        if (!trimmedValue) {
            setPasswordError('Password is required');
            return false;
        } else if (trimmedValue.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return false;
        } else if (!/[A-Z]/.test(trimmedValue)) {
            setPasswordError('Password must contain at least one uppercase letter');
            return false;
        } else if (!/[a-z]/.test(trimmedValue)) {
            setPasswordError('Password must contain at least one lowercase letter');
            return false;
        } else if (!/[0-9]/.test(trimmedValue)) {
            setPasswordError('Password must contain at least one digit');
            return false;
        } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(trimmedValue)) {
            setPasswordError('Password must contain at least one special character (e.g., !@#$%)');
            return false;
        } else {
            setPasswordError('');
            return true;
        }
    };

    const validateConfirmPassword = (value) => {
        const trimmedValue = value.trim();
        if (!trimmedValue) {
            setConfirmError('Please confirm your password');
            return false;
        } else if (trimmedValue !== regPassword) {
            setConfirmError('Passwords do not match');
            return false;
        } else {
            setConfirmError('');
            return true;
        }
    };

    const validateForm = () => {
        const trimmedUsername = username.trim();
        const trimmedEmail = regEmail.trim();
        const trimmedPassword = regPassword.trim();
        const trimmedConfirm = confirmPassword.trim();

        let isValid = true;

        isValid = validateUsername(trimmedUsername) && isValid;
        isValid = validateEmail(trimmedEmail) && isValid;
        isValid = validatePassword(trimmedPassword) && isValid;
        isValid = validateConfirmPassword(trimmedConfirm) && isValid;

        return isValid;
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        // Clear previous field errors
        setUsernameError('');
        setEmailError('');
        setPasswordError('');
        setConfirmError('');

        if (!validateForm()) {
            setRegError('Please fix the errors above and try again.');
            return;
        }

        setIsLoading(true); // Start loading
        setRegError(''); // Clear any previous errors

        try {
            const res = await fetch(`${Server_url}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    email: regEmail.trim(),
                    password: regPassword.trim()
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Minimum 2-second delay after successful fetch
            await new Promise(resolve => setTimeout(resolve, 2000));

            // On success, close overlay and show success message with blast effect
            setShowRegister(false);
            setUsername('');
            setRegEmail('');
            setRegPassword('');
            setConfirmPassword('');
            setRegistrationSuccess(true); // Trigger the success overlay
        } catch (err) {
            setRegError(err.message);
        } finally {
            setIsLoading(false); // End loading
        }
    };

    useEffect(() => {
        if (error) {
            setTimeout(() => {
                setError('');
            }, 2000);
        }
        if (regError) {
            setTimeout(() => {
                setRegError('');
            }, 2000);
        }
    }, [error, regError]);

    const handleCloseClick = () => {
        setShowRegister(false);
        setUsernameError('');
        setEmailError('');
        setPasswordError('');
        setConfirmError('');
        setUsername('');
        setRegEmail('');
        setRegPassword('');
        setConfirmPassword('');
    }

    return (
        <div className="login_main">
            <div className="img_container_outer">
                <img src="https://res.cloudinary.com/dasparepg/image/upload/v1752559684/Login_image_b8ggug.jpg" alt="" />
            </div>
            <div className="login_inner">
                <div className="img_container">
                    <img src="https://res.cloudinary.com/dasparepg/image/upload/v1752559684/Login_image_b8ggug.jpg" alt="" />
                </div>
                <div className="login_container">
                    <div className="pramesh_logo_line">
                        <img src={Pramesh_logo} alt="" />
                        <div className="focus_line"></div>
                    </div>

                    <h2>Hii, <span>Onboarding Champion</span></h2>

                    <div className="input_fields">
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        <div className="password_container">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="toggle_password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <FaUserSecret /> : <FaMask />}
                            </button>
                        </div>
                        <button onClick={handleLogin} className='login_button'>Log In</button>

                    </div>
                    <p>Do not have Account ? <span onClick={() => setShowRegister(true)}> <u>Register</u> </span></p>
                    {error && <p className="error">{error}</p>}
                </div>
            </div>
            {showRegister && (
                <div className="register_overlay">
                    <div className="register_container">
                        <div className="register_header">
                            <h2>Create Your Account</h2>
                            <button className="close_button" onClick={handleCloseClick}>×</button>
                        </div>
                        <form onSubmit={handleRegister}>
                            <div className="input_group">
                                <label htmlFor="username">Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => {
                                        setUsername(e.target.value);
                                        validateUsername(e.target.value);
                                    }}
                                    required
                                />
                                {usernameError && <span className="field-error">{usernameError}</span>}
                            </div>
                            <div className="input_group">
                                <label htmlFor="regEmail">Email</label>
                                <input
                                    type="email"
                                    id="regEmail"
                                    placeholder="Enter your email"
                                    value={regEmail}
                                    onChange={(e) => {
                                        setRegEmail(e.target.value);
                                        validateEmail(e.target.value);
                                    }}
                                    required
                                />
                                {emailError && <span className="field-error">{emailError}</span>}
                            </div>
                            <div className="input_group">
                                <label htmlFor="regPassword">Password</label>
                                <div className="password_container">
                                    <input
                                        type={showRegPassword ? "text" : "password"}
                                        id="regPassword"
                                        placeholder="Enter your password"
                                        value={regPassword}
                                        onChange={(e) => {
                                            setRegPassword(e.target.value);
                                            validatePassword(e.target.value);
                                            // Re-validate confirm if password changes
                                            if (confirmPassword) {
                                                validateConfirmPassword(confirmPassword);
                                            }
                                        }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="toggle_password"
                                        onClick={() => setShowRegPassword(!showRegPassword)}
                                    >
                                        {showRegPassword ? <FaUserSecret /> : <FaMask />}
                                    </button>
                                </div>
                                {passwordError && <span className="field-error">{passwordError}</span>}
                            </div>
                            <div className="input_group">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <div className="password_container">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        id="confirmPassword"
                                        placeholder="Confirm your password"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            validateConfirmPassword(e.target.value);
                                        }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="toggle_password"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <FaUserSecret /> : <FaMask />}
                                    </button>
                                </div>
                                {confirmError && <span className="field-error">{confirmError}</span>}
                            </div>
                            <button
                                type="submit"
                                className="register_button"
                                disabled={isLoading} // Disable during loading
                            >
                                {isLoading ? 'Registering...' : 'Register'}
                            </button>
                            {regError && <p className="reg_error">{regError}</p>}
                        </form>
                        <p className="register_footer">
                            Already have an account? <span onClick={handleCloseClick}>Log In</span>
                        </p>
                    </div>
                </div>
            )}
            {registrationSuccess && (
                <div className="regSuccess_overlay">
                    <div className="regMessage">
                        <div className="image_con">
                            <img src={Pramesh_logo} alt="Pramesh Logo" />
                        </div>

                        <div className="message_content">
                            <h3 className="message_header">🎉 Registration Received!</h3>

                            <p className="message_body">
                                Hey there! We've got your registration details and passed them along to our admin team for a quick review.
                                Hang tight—you'll get an email nudge as soon as it's all set (usually within 24-48 hours).
                                Thanks for joining the crew—we're excited to have you!
                            </p>

                            <p className="message_support">
                                If you have any questions in the meantime, feel free to reply to this email or reach out to us at {' '}
                                <strong>prameshwealth@gmail.com</strong>. Don't forget to check your spam folder too! 😊
                            </p>

                            <div className="message_signoff">
                                <p>Best,<br />The Onboarding Team</p>
                            </div>
                        </div>

                        <button onClick={() => setRegistrationSuccess(false)} className="close_button">
                            Close
                        </button>
                    </div>
                    {/* Blast effect: Confetti explosion - now on top */}
                    <div className="confetti-wrapper">
                        <Confetti
                            width={window.innerWidth}
                            height={window.innerHeight}
                            recycle={false}
                            numberOfPieces={200}
                            gravity={0.2}
                            colors={['#4a90e2', '#faac4d', '#ffffff', '#e8e6e6']} // Match your brand colors
                        />
                    </div>
                </div>
            )}
        </div>
    );
}