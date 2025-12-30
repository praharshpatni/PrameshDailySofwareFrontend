import React, { useState, useEffect, useCallback } from "react";
import "./Styles/Header.css";
import DropdownSettings from "./DropdownSettings";
import { useNavigate } from "react-router-dom";
import { Server_url } from "../Urls/AllData";
import { useSelector } from "react-redux";
import RaiseTicketPopup from "./RaiseTicketPopup";
import { AiOutlineMessage } from "react-icons/ai";
import { LuBell } from "react-icons/lu";
import { ChatComponent } from "./ChatComponent/ChatComponent";
import { FaUserCircle } from "react-icons/fa";

export default function Header() {
    const navigate = useNavigate();
    const currentUser = useSelector((state) => state.user.currentUser);
    const currentUserEmail = useSelector((state) => state.user.currentUser.email);
    const [admins, setAdmins] = useState([]);
    const [showSettings, setShowSettings] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [showRaiseTicketPopup, setShowRaiseTicketPopup] = useState(false);
    const [showChatComponent, setShowChatComponent] = useState(false);

    // ✅ Fetch admin users to determine who sees notifications
    useEffect(() => {
        const fetchAdmins = async () => {
            try {
                const res = await fetch(`${Server_url}/header/fetchAdminToshowNotification`);
                const data = await res.json();
                if (data.success) {
                    setAdmins(data.data);
                }
            } catch (err) {
                console.error("❌ Failed to fetch admins:", err);
            }
        };
        fetchAdmins();
    }, []);

    // ✅ Check if current user is an admin
    const isAdmin = admins.some((admin) => admin.user_name === currentUser?.name);

    const fetchNotifications = useCallback(async () => {
        if (!isAdmin) return;
        try {
            const res = await fetch(`${Server_url}/header/fetchNotifications`);
            const data = await res.json();
            if (data.success) {
                // ✅ Filter out only current user's own entries (do not show entries added by current user)
                const filteredData = data.data.filter((notif) =>
                    notif.rmName !== currentUser?.name
                );

                // Client-side: Add 'isNew' based on today's date
                const today = new Date().toDateString();
                const notificationsWithNew = filteredData.map((notif) => ({
                    ...notif,
                    isNew: new Date(notif.date).toDateString() === today
                }));
                setNotifications(notificationsWithNew);
            } else {
                setNotifications([]); // Fallback to empty
            }
        } catch (err) {
            console.error("❌ Failed to fetch notifications:", err);
            setNotifications([]); // Fallback to empty
        }
    }, [isAdmin, currentUser]);

    // ✅ Track unread notifications
    useEffect(() => {
        setHasUnread(notifications.some((n) => n.isNew));
    }, [notifications]);

    const handleShowNotificationBar = useCallback(async () => {
        if (isOpen) {
            setIsOpen(false);
            setTimeout(() => setShouldRender(false), 500);
        } else {
            // ✅ Fetch fresh notifications on bell click (when opening)
            await fetchNotifications();
            setShouldRender(true);
            requestAnimationFrame(() => setIsOpen(true));
            setHasUnread(false);
            setNotifications((prev) => prev.map((n) => ({ ...n, isNew: false })));
        }
    }, [isOpen, fetchNotifications]);

    const handleCloseNotification = useCallback(() => {
        setIsOpen(false);
        setTimeout(() => setShouldRender(false), 500);
    }, []);

    const handleOverlayClick = useCallback((e) => {
        if (e.target === e.currentTarget) handleCloseNotification();
    }, [handleCloseNotification]);

    // ✅ Disable background scroll when notification is open
    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "unset";
        return () => (document.body.style.overflow = "unset");
    }, [isOpen]);

    // ✅ Format datetime
    const formatDateTime = (isoString) =>
        new Date(isoString).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    const currentDate = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const groupedNotifications = React.useMemo(() => {
        const map = {};

        notifications.forEach((notif) => {
            const key = `${notif.rmName}-${notif.tableName}`;
            if (!map[key]) {
                map[key] = {
                    ...notif,
                    count: 1,
                };
            } else {
                map[key].count += 1;
                // Keep latest date for sorting later if needed
                if (new Date(notif.date) > new Date(map[key].date)) {
                    map[key].date = notif.date;
                }
            }
        });

        return Object.values(map).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [notifications]);

    // const toggleRaiseTicket = () => {
    //     setShowRaiseTicketPopup(true);
    // }

    function handleChatboxClick() {
        console.log("used chat component")
        setShowChatComponent(true);
    }
    return (
        <>
            <header className="header">
                <div className="header-title-pramesh">Pramesh Data Entry System</div>
                <div className="profile_notify_con">
                    {/* chat box  */}
                    <div className="chat_box" onClick={handleChatboxClick}>
                        <AiOutlineMessage className="chat_icon"
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = "#00ff11ff";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = "#ffffffff";
                            }}
                            size={30}
                        />
                        <span className="custom-tooltip">Chat</span>
                    </div>

                    {/* ✅ Bell icon visible only for admins */}
                    {isAdmin && (
                        <button
                            className="notify_con"
                            onClick={handleShowNotificationBar}
                            aria-label="Toggle notifications"
                        >
                            <LuBell className="chat_icon"
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = "#e9f412ff";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = "#ffffffff";
                                }}
                                size={30}
                            />
                            <span className="custom-tooltip">Notifications</span>
                            {hasUnread && <span className="notification-badge"></span>}
                        </button>
                    )}

                    <button
                        className="settings-button"
                        onClick={() => navigate("/settings")}
                        aria-label="Open settings"
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#69f793ff";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#ffffffff";
                        }}
                    >
                        <FaUserCircle size={30} />
                        <span className="custom-tooltip">Setting</span>
                    </button>
                </div>
                {showSettings && <DropdownSettings onClose={() => setShowSettings(false)} />}

            </header>
            {showRaiseTicketPopup && (<RaiseTicketPopup onClose={() => setShowRaiseTicketPopup(false)} />)}

            {/* ✅ Notification Panel */}
            {shouldRender && (
                <div
                    className={`notification_overlay ${isOpen ? "visible" : ""}`}
                    onClick={handleOverlayClick}
                >
                    <div
                        className={`notification_con ${isOpen ? "open" : ""}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="notification_header">
                            <h2>Recent Entries</h2>
                            <p className="current_date">{currentDate}</p>
                            <button className="notification_close_btn" onClick={handleCloseNotification}>
                                <span className="close_icon">&times;</span>
                            </button>
                        </div>
                        <div className="notification_list">
                            {groupedNotifications.length > 0 ? (
                                groupedNotifications.map((notif) => (
                                    <div
                                        key={`${notif.rmName}-${notif.tableName}`}
                                        className={`notification_item ${notif.isNew ? "new" : ""}`}
                                    >
                                        <div className="notification_avatar">
                                            <div className="avatar_circle">
                                                {notif.rmName?.[0]?.toUpperCase() || "U"}
                                            </div>
                                        </div>

                                        <div className="notification_content">
                                            <p className="notif_text">
                                                <strong>{notif.rmName}</strong> added{" "}
                                                {notif.count > 1 ? (
                                                    <span className="highlight">{notif.count} new entries</span>
                                                ) : (
                                                    "a new entry"
                                                )}{" "}
                                                in <span className="highlight">{notif.tableName}</span>
                                            </p>
                                            <p className="notif_time">{formatDateTime(notif.date)}</p>
                                        </div>

                                        {notif.isNew && <span className="new_dot"></span>}
                                    </div>
                                ))
                            ) : (
                                <div className="no_notifications">
                                    <p>No entries found in the last 30 days.</p>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* chat component toggling  */}
            {showChatComponent && (
                <ChatComponent isVisible={showChatComponent} onClose={() => setShowChatComponent(false)} currentUserEmail={currentUserEmail} />
            )}
        </>
    );
} 