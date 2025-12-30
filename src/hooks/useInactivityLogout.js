import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../Redux/UserSlice";
import { Server_url } from "../Urls/AllData";
import "./useInactivityLogout.css";
import inactivityWarning from "./../Assets/inactivityWarning.png";

// Timers
const INACTIVITY_WARNING = 30 * 60 * 1000; // 1 minute -> show modal
const INACTIVITY_LOGOUT = 60 * 60 * 1000;  // 2 minutes -> auto logout

// --- Context Setup for Modal ---
const InactivityContext = createContext();
export const useInactivityModal = () => useContext(InactivityContext);

export const InactivityProvider = ({ children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const onConfirmRef = useRef(null);
    const onCancelRef = useRef(null);

    const showModal = (confirmFn, cancelFn) => {
        onConfirmRef.current = confirmFn;
        onCancelRef.current = cancelFn;
        setIsVisible(true);
    };

    const hideModal = () => {
        setIsVisible(false);
    };

    return (
        <InactivityContext.Provider value={{ showModal, hideModal }}>
            {children}
            {isVisible && (
                <div className="modal-overlay">
                    <div className="modal">
                        <img src={inactivityWarning} alt="Inactivity warning" />
                        <h2>Session Timeout</h2>
                        <p>You’ve been inactive. Do you want to stay logged in?</p>
                        <div className="modal-buttons">
                            <button
                                onClick={() => {
                                    try { onConfirmRef.current?.(); } catch (e) { console.error(e); }
                                    hideModal();
                                }}
                            >
                                Stay Logged In
                            </button>
                            <button
                                onClick={() => {
                                    try { onCancelRef.current?.(); } catch (e) { console.error(e); }
                                    hideModal();
                                }}
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </InactivityContext.Provider>
    );
};

// --- Hook Logic ---
const useInactivityLogout = () => {
    const dispatch = useDispatch();
    const currentUser = useSelector((state) => state.user.currentUser);
    const { showModal, hideModal } = useInactivityModal();

    // timer refs
    const warningTimerRef = useRef(null);
    const logoutTimerRef = useRef(null);

    // keep currentUser stable in callbacks
    const currentUserRef = useRef(currentUser);
    useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

    // perform logout: server call + client cleanup
    const handleLogout = useCallback(async () => {

        try {
            const email = currentUserRef.current?.email;
            if (email) {
                await fetch(`${Server_url}/logout`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                }).catch(e => console.error("Server logout failed:", e));
            }
        } catch (e) {
            console.error("Logout error:", e);
        } finally {
            try { sessionStorage.removeItem("user"); } catch { }
            dispatch(logoutUser());
            window.location.reload();
        }
    }, [dispatch]);

    const clearTimers = useCallback(() => {
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
            warningTimerRef.current = null;
        }
        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = null;
        }
    }, []);

    // schedule the warning modal and the final logout
    const scheduleTimers = useCallback(() => {
        clearTimers();

        // when warning timer fires, show modal and schedule final logout
        warningTimerRef.current = setTimeout(() => {
            showModal(
                () => {
                    clearTimers();
                    scheduleTimers();
                },
                () => {
                    clearTimers();
                    handleLogout();
                }
            );

            const remaining = INACTIVITY_LOGOUT - INACTIVITY_WARNING;
            if (remaining > 0) {
                logoutTimerRef.current = setTimeout(() => {
                    hideModal();
                    handleLogout();
                }, remaining);
            } else {
                hideModal();
                handleLogout();
            }
        }, INACTIVITY_WARNING);
    }, [clearTimers, showModal, hideModal, handleLogout]);

    // resets timers on activity
    const markUserActive = useCallback(() => {
        scheduleTimers();
    }, [scheduleTimers]);

    // attach event listeners when user logged in
    useEffect(() => {
        if (!currentUser) {
            clearTimers();
            return;
        }

        const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
        const handler = () => markUserActive();

        events.forEach(e => window.addEventListener(e, handler, { passive: true }));

        // start timers immediately when user is present
        scheduleTimers();

        return () => {
            events.forEach(e => window.removeEventListener(e, handler));
            clearTimers();
        };
    }, [currentUser, markUserActive, scheduleTimers, clearTimers]);
};

export default useInactivityLogout;
