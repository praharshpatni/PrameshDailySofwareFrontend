import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server_url } from './../../Urls/AllData';
import "./LoginPage.css";
// import Login_image from "./../../Assets/Login_image.jpg";
import Pramesh_logo from "./../../Assets/Pramesh Logo.png";
import { FaUserSecret } from "react-icons/fa";
import { FaMask } from "react-icons/fa";

export default function LoginPage({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();


    const handleLogin = async () => {
        // console.log("...........")

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


    useEffect(() => {
        if (error) {
            setTimeout(() => {
                setError('');
            }, 2000);
        }
    }, [error]);

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

                    <h2>Hii, <span style={{ padding: "0px 5px", borderRadius: "2px", color: "#444", fontFamily: "Raleway, sans-serif" }}>Onboarding Champion</span></h2>

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
                    {error && <p className="error">{error}</p>}
                </div>
            </div>
        </div>
    );
}