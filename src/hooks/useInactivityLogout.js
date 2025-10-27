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
import "./useInactivityLogout.css"
import inactivityWarning from "./../Assets/inactivityWarning.png"

// Timeout threshold (30 seconds)
const INACTIVITY_LIMIT = 30 * 60 * 1000;

// --- Context Setup for Modal ---
const InactivityContext = createContext();

export const useInactivityModal = () => useContext(InactivityContext);

export const InactivityProvider = ({ children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [onConfirm, setOnConfirm] = useState(null);
    const [onCancel, setOnCancel] = useState(null);

    const showModal = (confirmFn, cancelFn) => {
        setOnConfirm(() => confirmFn);
        setOnCancel(() => cancelFn);
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
                        <img src={inactivityWarning} alt="" />
                        <h2>Session Timeout</h2>
                        <p>You’ve been inactive. Do you want to stay logged in?</p>
                        <div className="modal-buttons">
                            <button
                                onClick={() => {
                                    onConfirm?.();
                                    hideModal();
                                }}
                            >
                                Stay Logged In
                            </button>
                            <button
                                onClick={() => {
                                    onCancel?.();
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
    const { showModal } = useInactivityModal();

    const isActiveRef = useRef(true);
    const inactivityTimeoutRef = useRef(null);
    const markUserActiveRef = useRef(null);
    const confirmBeforeLogoutRef = useRef(null);

    const handleLogout = useCallback(async () => {
        if (!currentUser) return;
        try {
            const response = await fetch(`${Server_url}/logout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: currentUser.email }),
            });

            if (response.ok) {
                sessionStorage.removeItem("user");
                dispatch(logoutUser());
                window.location.reload();
            }
        } catch (error) {
            console.error("Logout error:", error);
        }
    }, [currentUser, dispatch]);

    const markUserActive = useCallback(() => {
        if (!isActiveRef.current) {
            isActiveRef.current = true;
        }

        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = setTimeout(() => {
            if (isActiveRef.current) {
                isActiveRef.current = false;
            }

            if (confirmBeforeLogoutRef.current) {
                confirmBeforeLogoutRef.current();
            }
        }, INACTIVITY_LIMIT);
    }, []);

    const confirmBeforeLogout = useCallback(() => {
        if (!currentUser) return;

        showModal(
            () => {
                // Stay logged in
                markUserActiveRef.current?.();
            },
            () => {
                // Logout
                handleLogout();
            }
        );
    }, [currentUser, handleLogout, showModal]);

    useEffect(() => {
        confirmBeforeLogoutRef.current = confirmBeforeLogout;
        markUserActiveRef.current = markUserActive;
    }, [confirmBeforeLogout, markUserActive]);

    useEffect(() => {
        if (!currentUser) return;

        const events = ["mousemove", "keydown", "click", "scroll"];
        events.forEach((event) =>
            window.addEventListener(event, markUserActive)
        );

        markUserActive(); // Start timer immediately

        return () => {
            events.forEach((event) =>
                window.removeEventListener(event, markUserActive)
            );
            clearTimeout(inactivityTimeoutRef.current);
        };
    }, [currentUser, markUserActive]);
};

export default useInactivityLogout;
