import React, { useState } from 'react';
import './Styles/Header.css';
import DropdownSettings from './DropdownSettings';
import { IoPersonCircleSharp } from "react-icons/io5";
import { useNavigate } from 'react-router-dom';

export default function Header() {
    // const timer = useRef(null);
    // const [seconds, setSeconds] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const navigate = useNavigate();

    // useEffect(() => {
    //     // cleanup on unmount or re-mount
    //     return () => {
    //         if (timer.current) {
    //             clearInterval(timer.current);
    //             timer.current = null;
    //         }
    //     };
    // }, []);

    // function Start() {
    //     if (timer.current === null) {
    //         timer.current = setInterval(() => {
    //             setSeconds((pre) => pre + 1);
    //         }, 1000);
    //     }
    // }

    // function Stop() {
    //     if (timer.current) {
    //         console.log("Timer Id", timer.current)
    //         clearInterval(timer.current);
    //         timer.current = null;
    //         setSeconds(0)
    //     }
    // }

    return (
        <header className="header">
            <div className="header-title-pramesh">Pramesh Data Entry System</div>

            <button
                className="settings-button"
                onClick={() => navigate("/settings")}
            >
                <IoPersonCircleSharp />
            </button>

            {/* <div className="timer_test">
                <button onClick={Start}>Start</button>
                <button onClick={Stop}>Stop</button>
                <div>{seconds}</div>
            </div> */}
            {showSettings && (
                <DropdownSettings onClose={() => setShowSettings(false)} />
            )}
        </header>
    );
}
