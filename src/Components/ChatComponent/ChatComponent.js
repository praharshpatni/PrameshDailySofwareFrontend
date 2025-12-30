import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import io from "socket.io-client";
import "./ChatComponent.css";
import { Server_url, socket_url } from "../../Urls/AllData";
import { LuSendHorizontal } from "react-icons/lu";
import No_User_Found from "./../../Assets/No_user_found.png"
import PrameshLogo from "./../../Assets/Pramesh Logo.png"
import Messaging from "./../../Assets/Messaging.png"
import { RiArrowDropDownLine } from "react-icons/ri";
import { IoCloseSharp } from "react-icons/io5";
import { MdOutlineReply } from "react-icons/md";
import { FaRegCopy } from "react-icons/fa6";
import { FiEdit3 } from "react-icons/fi";
import { MdOutlineDownloadDone, MdOutlineClose, MdOutlineFullscreen, MdOutlineFullscreenExit } from "react-icons/md";
import { RiDeleteBin6Line } from "react-icons/ri";

const SOCKET_URL = socket_url;

export const ChatComponent = ({ isVisible, onClose, currentUserEmail }) => {
    const [users, setUsers] = useState([]);
    const [activeChatUser, setActiveChatUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [replyTo, setReplyTo] = useState(null);
    const [searchText, setSearchText] = useState("");
    const [typingIndicator, setTypingIndicator] = useState("");
    const [unreadCounts, setUnreadCounts] = useState({});
    const [lastMessageTimes, setLastMessageTimes] = useState({});
    const [toastMessage, setToastMessage] = useState(null);
    const [isMaximized, setIsMaximized] = useState(false);
    const previousPosition = useRef({ left: null, top: null, width: null, height: null });
    const [deletePopup, setDeletePopup] = useState({
        isOpen: false,
        messageId: null,
        messageText: "",
        isClosing: false
    });
    const [chatContextMenu, setChatContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0
    });

    const [dropdownOpen, setDropdownOpen] = useState(null);
    const [editPopup, setEditPopup] = useState(null); // NEW: { isOpen: boolean, messageId: null, messageText: "" }
    const dropdownRef = useRef(null);
    const editTextareaRef = useRef(null); // NEW: Ref for edit textarea

    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const chatRef = useRef(null);
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleCloseMenu = () => {
            setChatContextMenu({ visible: false, x: 0, y: 0 });
        };

        if (chatContextMenu.visible) {
            document.addEventListener('click', handleCloseMenu);
            document.addEventListener('contextmenu', handleCloseMenu);
        }

        return () => {
            document.removeEventListener('click', handleCloseMenu);
            document.removeEventListener('contextmenu', handleCloseMenu);
        };
    }, [chatContextMenu.visible]);

    const closeCurrentChat = () => {
        setActiveChatUser(null);
        setMessages([]);
        setReplyTo(null);
        setChatContextMenu({ visible: false, x: 0, y: 0 });
    };
    // NEW: Handle edit popup open
    const openEditPopup = (msg) => {
        setEditPopup({
            isOpen: true,
            messageId: msg.id,
            messageText: msg.message_text,
            originalText: msg.message_text
        });
        setDropdownOpen(null);
    };

    // NEW: Handle edit popup close
    const closeEditPopup = () => {
        setEditPopup(null);
    };

    // NEW: Handle save edit from popup
    const handleSaveEditFromPopup = async () => {
        if (!editPopup) return;

        const { messageId, messageText, originalText } = editPopup;

        // Check if text actually changed and is not empty
        if (!messageText.trim() || messageText.trim() === originalText) {
            closeEditPopup();
            return;
        }

        try {
            const res = await fetch(`${Server_url}/chat/edit-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messageId,
                    newText: messageText.trim(),
                    currentUserEmail,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setMessages(prev =>
                    prev.map(m =>
                        m.id === messageId
                            ? { ...m, message_text: messageText.trim(), edited: true }
                            : m
                    )
                );

                // Update any active reply preview
                setReplyTo(prev =>
                    prev?.id === messageId ? { ...prev, text: messageText.trim() } : prev
                );

                // Show success toast
                setToastMessage("Message edited");
                setTimeout(() => setToastMessage(null), 2000);
            } else {
                setToastMessage("Failed to edit message");
                setTimeout(() => setToastMessage(null), 2000);
            }
        } catch (err) {
            console.error("Edit error:", err);
            setToastMessage("Error editing message");
            setTimeout(() => setToastMessage(null), 2000);
        } finally {
            closeEditPopup();
        }
    };

    // NEW: Focus textarea when popup opens
    useEffect(() => {
        if (editPopup?.isOpen && editTextareaRef.current) {
            editTextareaRef.current.focus();
            editTextareaRef.current.select();
        }
    }, [editPopup?.isOpen]);

    // NEW: Handle ESC key to close edit popup
    useEffect(() => {
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape' && editPopup?.isOpen) {
                closeEditPopup();
            }
        };

        document.addEventListener('keydown', handleEscapeKey);
        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [editPopup]);

    // Rest of your existing useEffect and other functions remain the same...
    useEffect(() => {
        const chatElement = chatRef.current;
        if (!chatElement) return;

        const handleMouseDown = (e) => {
            if (!e.target.closest('.top_bar')) return;

            isDragging.current = true;
            const rect = chatElement.getBoundingClientRect();
            dragOffset.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };

            document.body.style.cursor = 'grabbing';
        };

        const handleMouseMove = (e) => {
            if (!isDragging.current) return;

            let newLeft = e.clientX - dragOffset.current.x;
            let newTop = e.clientY - dragOffset.current.y;

            const rect = chatElement.getBoundingClientRect();
            const maxLeft = window.innerWidth - rect.width;
            const maxTop = window.innerHeight - rect.height;

            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));

            chatElement.style.left = `${newLeft}px`;
            chatElement.style.top = `${newTop}px`;
            chatElement.style.transform = 'none';
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = 'default';
        };

        chatElement.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            chatElement.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Rest of your existing code remains the same until the return statement...
    const isSameDay = (date1, date2) => {
        return (
            date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()
        );
    };

    const getDateLabel = (dateString) => {
        const messageDate = new Date(dateString);
        const today = new Date();

        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (isSameDay(messageDate, today)) return "Today";
        if (isSameDay(messageDate, yesterday)) return "Yesterday";

        return messageDate.toLocaleDateString("en-GB");
    };

    useEffect(() => {
        if (!socketRef.current || !currentUserEmail) return;

        socketRef.current.emit('setActiveChat', {
            userEmail: currentUserEmail,
            activeChatEmail: activeChatUser?.user_email || null
        });

        setTypingIndicator("");
    }, [activeChatUser, currentUserEmail]);

    useEffect(() => {
        if (!isVisible || !currentUserEmail) return;

        const fetchUsers = async () => {
            try {
                const usersRes = await fetch(
                    `${Server_url}/chat/fetchActiveUsers?currentUserEmail=${encodeURIComponent(currentUserEmail)}`
                );
                const usersData = await usersRes.json();
                setUsers(usersData.users || []);

                const countsRes = await fetch(
                    `${Server_url}/chat/unread-counts?currentUserEmail=${encodeURIComponent(currentUserEmail)}`
                );
                const countsData = await countsRes.json();

                setUnreadCounts(countsData.unreadCounts || {});
                setLastMessageTimes(countsData.lastMessageTimes || {});
            } catch (err) {
                console.error("Error fetching chat data:", err);
            }
        };

        fetchUsers();

        socketRef.current = io(SOCKET_URL);
        socketRef.current.emit("login", currentUserEmail);

        socketRef.current.on("newMessage", async (msg) => {
            const otherUserEmail = msg.sender_email === currentUserEmail
                ? msg.receiver_email
                : msg.sender_email;

            setLastMessageTimes(prev => ({
                ...prev,
                [otherUserEmail]: msg.sent_at
            }));
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.user_email === otherUserEmail
                        ? {
                            ...user,
                            last_message: msg.message_text,
                            last_message_sender: msg.sender_email,
                            last_message_time: msg.sent_at
                        }
                        : user
                )
            );

            const isInActiveChat =
                (msg.sender_email === currentUserEmail && msg.receiver_email === activeChatUser?.user_email) ||
                (msg.receiver_email === currentUserEmail && msg.sender_email === activeChatUser?.user_email);

            if (isInActiveChat) {
                setMessages(prev => [...prev, msg]);

                if (msg.receiver_email === currentUserEmail && !msg.read_at) {
                    try {
                        await fetch(`${Server_url}/chat/mark-as-read`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                currentUserEmail,
                                otherUserEmail: msg.sender_email
                            })
                        });

                        setMessages(prev => prev.map(m =>
                            m.id === msg.id ? { ...m, read_at: new Date().toISOString() } : m
                        ));
                    } catch (err) {
                        console.error("Failed to force mark as read:", err);
                    }
                }
            } else if (msg.receiver_email === currentUserEmail) {
                if (!msg.read_at) {
                    setUnreadCounts(prev => ({
                        ...prev,
                        [msg.sender_email]: (prev[msg.sender_email] || 0) + 1
                    }));
                }
            }
        });

        socketRef.current.on("userTyping", ({ fromUserEmail, isTyping }) => {
            if (fromUserEmail === activeChatUser?.user_email) {
                setTypingIndicator(isTyping ? "typing..." : "");
            }
        });

        socketRef.current.on("userStatus", ({ userEmail, online }) => {
            setUsers((prev) =>
                prev.map((u) =>
                    u.user_email === userEmail ? { ...u, is_logged_in: online ? 1 : 0 } : u
                )
            );
        });

        socketRef.current.on("messageEdited", ({ messageId, newText }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === messageId
                    ? { ...msg, message_text: newText, edited: true }
                    : msg
            ));

            setReplyTo(prev =>
                prev?.id === messageId ? { ...prev, text: newText } : prev
            );
        });

        // Add this with your other socket listeners (after messageEdited)
        socketRef.current.on("messageDeleted", ({ messageId }) => {
            setMessages(prev =>
                prev.map(m =>
                    m.id === messageId
                        ? { ...m, is_deleted: 1, message_text: "This message was deleted" }
                        : m
                )
            );

            // Remove from reply if deleted
            setReplyTo(prev =>
                prev?.id === messageId ? null : prev
            );
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [isVisible, currentUserEmail, activeChatUser]);

    useLayoutEffect(() => {
        if (!activeChatUser) return;

        messagesEndRef.current?.scrollIntoView({
            behavior: "auto",
            block: "end"
        });
    }, [messages, activeChatUser]);

    useEffect(() => {
        if (!activeChatUser) return;

        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }, [messages.length, activeChatUser, typingIndicator]);

    useEffect(() => {
        if (!activeChatUser) {
            setMessages([]);
            return;
        }

        const loadMessages = async () => {
            try {
                const res = await fetch(
                    `${Server_url}/chat/messages?currentUserEmail=${currentUserEmail}&otherUserEmail=${activeChatUser?.user_email}`
                );
                const data = await res.json();
                // DO NOT FILTER - show all messages including deleted ones
                setMessages(data.messages || []);
            } catch (err) {
                console.error("Error loading messages:", err);
            }
        };

        loadMessages();
    }, [activeChatUser, currentUserEmail]);

    const sendMessage = () => {
        if (!newMessage.trim() || !activeChatUser) return;
        socketRef.current.emit("typing", {
            toUserEmail: activeChatUser.user_email,
            isTyping: false,
        });

        const messageData = {
            senderEmail: currentUserEmail,
            receiverEmail: activeChatUser.user_email,
            messageText: newMessage.trim(),
            replyToId: replyTo?.id || null,
        };

        socketRef.current.emit("sendMessage", messageData);
        setUsers(prevUsers =>
            prevUsers.map(user =>
                user.user_email === activeChatUser.user_email
                    ? {
                        ...user,
                        last_message: newMessage.trim(),
                        last_message_sender: currentUserEmail,
                        last_message_time: new Date().toISOString()
                    }
                    : user
            )
        );

        setLastMessageTimes(prev => ({
            ...prev,
            [activeChatUser.user_email]: new Date().toISOString()
        }));

        setNewMessage("");
        setReplyTo(null);
    };

    useEffect(() => {
        setTypingIndicator("");
    }, [activeChatUser]);

    const handleTyping = (e) => {
        const value = e.target.value;
        setNewMessage(value);

        if (!activeChatUser) return;

        socketRef.current.emit("typing", {
            toUserEmail: activeChatUser.user_email,
            isTyping: true,
        });

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            socketRef.current.emit("typing", {
                toUserEmail: activeChatUser.user_email,
                isTyping: false,
            });
        }, 1200);
    };

    const filteredUsers = users
        .filter((user) =>
            user.user_name?.toLowerCase().includes(searchText.toLowerCase())
        )
        .sort((a, b) => {
            const emailA = a.user_email;
            const emailB = b.user_email;

            const unreadA = unreadCounts[emailA] || 0;
            const unreadB = unreadCounts[emailB] || 0;

            if (unreadB !== unreadA) {
                return unreadB - unreadA;
            }

            const timeA = lastMessageTimes[emailA] ? new Date(lastMessageTimes[emailA]) : new Date(0);
            const timeB = lastMessageTimes[emailB] ? new Date(lastMessageTimes[emailB]) : new Date(0);

            if (timeA.getTime() !== timeB.getTime()) {
                return timeB - timeA;
            }

            if (b.is_logged_in !== a.is_logged_in) {
                return b.is_logged_in - a.is_logged_in;
            }

            return a.user_name.localeCompare(b.user_name);
        });

    if (!isVisible) return null;

    const handleReply = (msg) => {
        setReplyTo({
            id: msg.id,
            text: msg.message_text,
            sender: msg.sender_email === currentUserEmail ? "You" : activeChatUser.user_name,
        });
    };

    const copyText = async (text) => {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.error("Clipboard API failed:", err);
            }
        }

        const textArea = document.createElement("textarea");
        textArea.value = text;

        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                return true;
            }
        } catch (err) {
            console.error("Fallback copy failed:", err);
        }

        document.body.removeChild(textArea);
        return false;
    };

    const toggleMaximize = () => {
        const chatElement = chatRef.current;
        if (!chatElement) return;

        if (!isMaximized) {
            const rect = chatElement.getBoundingClientRect();
            previousPosition.current = {
                left: chatElement.style.left || rect.left + 'px',
                top: chatElement.style.top || rect.top + 'px',
                width: rect.width + 'px',
                height: rect.height + 'px',
            };

            chatElement.style.left = '0px';
            chatElement.style.top = '0px';
            chatElement.style.width = '100vw';
            chatElement.style.height = '100vh';
            chatElement.style.transform = 'none';
            chatElement.style.borderRadius = '0';
            chatElement.style.boxShadow = 'none';
        } else {
            const prev = previousPosition.current;
            chatElement.style.left = prev.left;
            chatElement.style.top = prev.top;
            chatElement.style.width = prev.width;
            chatElement.style.height = prev.height;
            chatElement.style.borderRadius = '';
            chatElement.style.boxShadow = '';
        }

        setIsMaximized(!isMaximized);
    };
    const handleTextareaChange = (e) => {
        const textarea = e.target;

        textarea.style.height = "auto"; // reset
        textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;

        setEditPopup({
            ...editPopup,
            messageText: textarea.value
        });
    };

    // Delete functionality
    // Open delete confirmation popup
    const openDeletePopup = (msg) => {
        setDeletePopup({
            isOpen: true,
            messageId: msg.id,
            messageText: msg.message_text,
            isClosing: false
        });
        setDropdownOpen(null);
    };

    // Close delete popup with animation
    const closeDeletePopup = () => {
        if (deletePopup.isOpen && !deletePopup.isClosing) {
            setDeletePopup(prev => ({ ...prev, isClosing: true }));

            setTimeout(() => {
                setDeletePopup({
                    isOpen: false,
                    messageId: null,
                    messageText: "",
                    isClosing: false
                });
            }, 200);
        }
    };

    // Handle delete message
    const handleDeleteMessage = async () => {
        if (!deletePopup.messageId) return;

        try {
            const res = await fetch(`${Server_url}/chat/delete-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messageId: deletePopup.messageId,
                    currentUserEmail,
                }),
            });

            const data = await res.json();

            if (data.success) {
                // Update local state to mark as deleted
                setMessages(prev =>
                    prev.map(m =>
                        m.id === deletePopup.messageId
                            ? { ...m, is_deleted: 1, message_text: "This message was deleted" }
                            : m
                    )
                );

                // Remove from reply if deleted
                setReplyTo(prev =>
                    prev?.id === deletePopup.messageId ? null : prev
                );

                setToastMessage("Message deleted");
                setTimeout(() => setToastMessage(null), 2000);
            } else {
                setToastMessage("Failed to delete message");
                setTimeout(() => setToastMessage(null), 2000);
            }
        } catch (err) {
            console.error("Delete error:", err);
            setToastMessage("Error deleting message");
            setTimeout(() => setToastMessage(null), 2000);
        } finally {
            closeDeletePopup();
        }
    };

    return (
        <>
            {/* Edit Message Popup Overlay */}
            {editPopup?.isOpen && (
                <div className="edit-popup-overlay">
                    <div className="edit-popup-container">
                        <div className="edit-popup-header">
                            <h3>Edit Message</h3>
                            <button className="close-popup-btn" onClick={closeEditPopup}>
                                <IoCloseSharp />
                            </button>
                        </div>
                        <div className="edit_text_image">
                            <div className="bg_layer"></div>
                            <div className="message_to_edit">{editPopup.messageText}</div>
                        </div>

                        <div className="edit-popup-content">
                            <textarea
                                ref={editTextareaRef}
                                className="edit-popup-textarea"
                                value={editPopup.messageText}
                                onChange={handleTextareaChange}
                                placeholder="Edit your message..."
                                rows={1}
                            />
                            <div className="edit-popup-footer">
                                <button
                                    className="save-btn"
                                    onClick={handleSaveEditFromPopup}
                                    disabled={!editPopup.messageText.trim() || editPopup.messageText.trim() === editPopup.originalText}
                                >
                                    <MdOutlineDownloadDone />
                                </button>
                            </div>
                        </div>


                    </div>
                </div>
            )}

            {/* Delete Confirmation Popup Overlay */}
            {deletePopup?.isOpen && (
                <div className={`edit-popup-overlay ${deletePopup.isClosing ? 'closing' : ''}`}>
                    <div className="edit-popup-container delete-popup-container">
                        <div className="edit-popup-header">
                            <h3>Delete Message</h3>
                            <button className="close-popup-btn" onClick={closeDeletePopup}>
                                <IoCloseSharp />
                            </button>
                        </div>

                        <div className="edit-popup-content">
                            <p className="delete-confirmation-text">
                                Are you sure you want to delete this message? This action cannot be undone.
                            </p>
                            {deletePopup.messageText && (
                                <div className="message-preview">
                                    <strong >Message :</strong>
                                    <p className="message-preview-text">{deletePopup.messageText}</p>
                                </div>
                            )}
                        </div>

                        <div className="edit-popup-footer">
                            <button
                                className="cancel-btn"
                                onClick={closeDeletePopup}
                            >
                                Cancel
                            </button>
                            <button
                                className="delete-confirm-btn"
                                onClick={handleDeleteMessage}
                            >
                                <RiDeleteBin6Line /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Chat Component */}
            <div className={`chatComponent_main ${isMaximized ? 'maximized' : ''}`} ref={chatRef}>
                <div className="top_bar">
                    <h2>Pramesh Chats</h2>
                    <div className="window_buttons">
                        <button onClick={toggleMaximize} className="maximize_btn">
                            {isMaximized ? <MdOutlineFullscreenExit /> : <MdOutlineFullscreen />}
                        </button>
                        <button onClick={onClose}>
                            <MdOutlineClose />
                        </button>
                    </div>
                </div>

                <div className="chat_body">
                    <div className="Search_name_outer">
                        <div className="search_container">
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </div>
                        <div className="list_of_names">
                            {filteredUsers.length === 0 ? (
                                <div className="no_users">
                                    <img src={No_User_Found} alt="" />
                                    <div>No users found</div>
                                </div>
                            ) : (
                                filteredUsers.map((user) => {
                                    const isMe = user.user_email === currentUserEmail;
                                    const tooltipText = user.last_message
                                        ? (user.last_message_sender === currentUserEmail ? "You: " : "") +
                                        (user.last_message_is_deleted === 1 ? "This message was deleted" : user.last_message)
                                        : "No messages yet";
                                    return (
                                        <div
                                            key={user.user_email}
                                            className={`single_user ${activeChatUser?.user_email === user.user_email ? "active_user" : ""}`}
                                            title={tooltipText}
                                            onClick={async () => {
                                                setActiveChatUser(user);

                                                if (user.user_email !== currentUserEmail) {
                                                    await fetch(`${Server_url}/chat/mark-as-read`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            currentUserEmail,
                                                            otherUserEmail: user.user_email
                                                        })
                                                    });

                                                    setUnreadCounts(prev => ({
                                                        ...prev,
                                                        [user.user_email]: 0
                                                    }));
                                                }
                                            }}
                                        >
                                            <div className="profile_pic" />

                                            <div className="name_status">
                                                <div className="user_info">
                                                    <div className="name">
                                                        {isMe ? "Me (You)" : user.user_name}
                                                        {user.is_logged_in === 1 && <span className="online_dot"></span>}
                                                    </div>
                                                    <div className="last_message_preview">
                                                        {user.last_message ? (
                                                            <>
                                                                {user.last_message_sender === currentUserEmail && "You: "}
                                                                {user.last_message_is_deleted === 1 ? (
                                                                    <i>This message was deleted</i>
                                                                ) : (
                                                                    user.last_message
                                                                )}
                                                            </>
                                                        ) : (
                                                            "No messages yet"
                                                        )}
                                                    </div>
                                                </div>

                                                {unreadCounts[user.user_email] > 0 && (
                                                    <span className="unseen_badge">
                                                        {unreadCounts[user.user_email] > 99 ? '99+' : unreadCounts[user.user_email]}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="chat_section">
                        {activeChatUser ? (
                            <>
                                <div className="chat_header">
                                    <strong>{activeChatUser.user_name}</strong>
                                </div>

                                <div
                                    className="messages_area"
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();

                                        // Skip if clicking on dropdown or bubble
                                        const clickedOnDropdown = e.target.closest('.message_dropdown') ||
                                            e.target.closest('.dropdown_option') ||
                                            e.target.closest('.message_bubble');
                                        if (clickedOnDropdown || dropdownOpen !== null) return;

                                        // Exact cursor position on screen
                                        let x = e.clientX;
                                        let y = e.clientY;

                                        // Menu size (adjust if your menu is taller/wider)
                                        const menuWidth = 180;
                                        const menuHeight = 60;
                                        const padding = 10;

                                        // Snap to screen edges
                                        if (x + menuWidth > window.innerWidth) {
                                            x = window.innerWidth - menuWidth - padding;
                                        }
                                        if (y + menuHeight > window.innerHeight) {
                                            y = window.innerHeight - menuHeight - padding;
                                        }
                                        if (x < padding) x = padding;
                                        if (y < padding) y = padding;

                                        setChatContextMenu({
                                            visible: true,
                                            x,
                                            y
                                        });
                                    }}
                                >
                                    {messages.length === 0 ? (
                                        <div className="empty_chat_state">
                                            <div className="empty_chat_icon"><img src={Messaging} alt="" /></div>
                                            <h3>Start chatting with {activeChatUser?.user_name}</h3>
                                            <p>No messages yet. Say hi to your colleague!</p>
                                        </div>
                                    ) : (
                                        <React.Fragment>
                                            {messages.map((msg, index) => {
                                                const currentMsgDate = new Date(msg.sent_at);
                                                const prevMsgDate = index > 0 ? new Date(messages[index - 1].sent_at) : null;
                                                const showDateSeparator = index === 0 || !isSameDay(currentMsgDate, prevMsgDate);

                                                const isOwnMessage = msg.sender_email === currentUserEmail;

                                                return (
                                                    <React.Fragment key={msg.id}>
                                                        {showDateSeparator && (
                                                            <div className="date_separator">
                                                                {getDateLabel(msg.sent_at)}
                                                            </div>
                                                        )}

                                                        <div className={`message_bubble ${isOwnMessage ? "sent" : "received"} ${msg.is_deleted === 1 ? 'deleted-message' : ''}`}>
                                                            {msg.reply_to_id && !msg.is_deleted && (
                                                                <div className="reply_preview">
                                                                    <span className="reply_preview_sender">
                                                                        {msg.reply_sender_email === currentUserEmail ? "You" : activeChatUser.user_name}
                                                                    </span>
                                                                    <span className="reply_preview_text">{msg.reply_text}</span>
                                                                </div>
                                                            )}

                                                            <div className="text_in_bubble">
                                                                {msg.is_deleted === 1 ? (
                                                                    <span className="deleted_message_text">
                                                                        <i>This message was deleted</i>
                                                                    </span>
                                                                ) : (
                                                                    msg.message_text
                                                                )}</div>

                                                            <small className="timestamp">
                                                                {msg.edited && <span className="edited_label">Edited</span>}
                                                                {new Date(msg.sent_at).toLocaleTimeString([], {
                                                                    hour: "numeric",
                                                                    minute: "2-digit",
                                                                    hour12: true
                                                                })}
                                                            </small>

                                                            {/* Only show dropdown option if message is NOT deleted */}
                                                            {msg.is_deleted !== 1 && (
                                                                <div
                                                                    className="dropdown_option"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const messageId = msg.id;
                                                                        const shouldOpen = dropdownOpen !== messageId;
                                                                        setDropdownOpen(shouldOpen ? messageId : null);

                                                                        if (shouldOpen) {
                                                                            setTimeout(() => {
                                                                                const dropdown = dropdownRef.current;
                                                                                if (!dropdown) return;

                                                                                const bubbleRect = dropdown.parentElement.getBoundingClientRect();
                                                                                const dropdownRect = dropdown.getBoundingClientRect();
                                                                                const viewportWidth = window.innerWidth - "50%";
                                                                                const viewportHeight = window.innerHeight;

                                                                                dropdown.classList.remove("open-up", "open-left");

                                                                                if (bubbleRect.bottom + dropdownRect.height + 120 > viewportHeight) {
                                                                                    dropdown.classList.add("open-up");
                                                                                }

                                                                                if (bubbleRect.right + dropdownRect.width + 0 > viewportWidth) {
                                                                                    dropdown.classList.add("open-left");
                                                                                }
                                                                            }, 0);
                                                                        }
                                                                    }}
                                                                >
                                                                    <RiArrowDropDownLine />
                                                                </div>
                                                            )}

                                                            {dropdownOpen === msg.id && !msg.is_deleted && (
                                                                <div className="message_dropdown" ref={dropdownRef} style={
                                                                    !isOwnMessage
                                                                        ? { left: "40px" }
                                                                        : { right: "10px" }
                                                                }>
                                                                    <div
                                                                        className="dropdown_item"
                                                                        onClick={() => {
                                                                            handleReply(msg);
                                                                            setDropdownOpen(null);
                                                                        }}
                                                                    >
                                                                        <MdOutlineReply />
                                                                        Reply
                                                                    </div>

                                                                    <div
                                                                        className="dropdown_item"
                                                                        onClick={async () => {
                                                                            const success = await copyText(msg.message_text);
                                                                            if (success) {
                                                                                setToastMessage("Text copied");
                                                                                setTimeout(() => setToastMessage(null), 2000);
                                                                            } else {
                                                                                setToastMessage("Failed to copy");
                                                                                setTimeout(() => setToastMessage(null), 2000);
                                                                            }
                                                                            setDropdownOpen(null);
                                                                        }}
                                                                    >
                                                                        <FaRegCopy />
                                                                        Copy
                                                                    </div>

                                                                    {isOwnMessage && (
                                                                        <div
                                                                            className="dropdown_item"
                                                                            onClick={() => openEditPopup(msg)}
                                                                        >
                                                                            <FiEdit3 />
                                                                            Edit
                                                                        </div>
                                                                    )}

                                                                    {isOwnMessage && (
                                                                        <div
                                                                            className="dropdown_item delete_option"
                                                                            onClick={() => openDeletePopup(msg)}
                                                                        >
                                                                            <RiDeleteBin6Line />
                                                                            Delete
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </React.Fragment>
                                                );
                                            })}

                                        </React.Fragment>
                                    )}
                                    {toastMessage && (
                                        <div className="copy_toast">
                                            <span>{toastMessage}</span>
                                        </div>
                                    )}
                                    {typingIndicator && (
                                        <div className="typing-indicator-container">
                                            <div className="typing_bubble">
                                                <div className="typing-dots">
                                                    <span></span>
                                                    <span></span>
                                                    <span></span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>

                                {replyTo && (
                                    <div className="reply_bar">
                                        <strong className="reply_sender">{replyTo.sender}</strong>
                                        <p className="reply_text">{replyTo.text}</p>
                                        <button onClick={() => setReplyTo(null)}>✕</button>
                                    </div>
                                )}

                                <div className="input_area">
                                    <textarea
                                        className="message_input_textarea"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={handleTyping}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                sendMessage();
                                            }
                                        }}
                                        rows={1}
                                    />
                                    <button onClick={sendMessage} disabled={!newMessage.trim()}>
                                        <LuSendHorizontal className="send_icon" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="no_chat">
                                <img src={PrameshLogo} alt="" />
                                <p>Your trusted space to connect with <strong>Pramesh Wealth </strong> Members</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Chat Context Menu - Right Click */}
            {chatContextMenu.visible && activeChatUser && (
                <div
                    className="chat-context-menu"
                    style={{
                        position: 'fixed',     // ← CHANGED: now fixed to viewport
                        top: `${chatContextMenu.y}px`,
                        left: `${chatContextMenu.x}px`,
                        zIndex: 10000,
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="context-menu-item" onClick={closeCurrentChat}>
                        <IoCloseSharp size={16} />
                        <span>Close chat</span>
                    </div>
                </div>
            )}
        </>
    );
};