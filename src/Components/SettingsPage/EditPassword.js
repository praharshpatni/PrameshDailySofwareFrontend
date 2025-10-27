import React, { useEffect, useState } from 'react'
import "./EditPassword.css"
import { Server_url, socket_url } from '../../Urls/AllData'
import { io } from 'socket.io-client';
import { createPortal } from 'react-dom';
import NoUser from "./../../Assets/No_user.png"
import Edit from "./SettingsPageAsset/edit.png"
import AddUser from "./SettingsPageAsset/Add_User.png"
// import { ImCancelCircle } from "react-icons/im";
// import { IoCheckmarkCircleOutline } from "react-icons/io5";
import accept from "./../../Assets/accept.png"
import close from "./../../Assets/close.png"


const socket = io(socket_url, {
    transports: ['websocket'],
    withCredentials: true,
})

function EditPassword() {

    const [userName_Pass, set_userName_Pass] = useState(0);
    const total_user = Math.max(0, userName_Pass.length - 1);
    const [showAddUser, setShowAddUser] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteUser, setDeleteUser] = useState();
    // New states for editing
    const [editingId, setEditingId] = useState(null);
    const [editUserName, setEditUserName] = useState('');
    const [editUserEmail, setEditUserEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');

    const fetchData = async () => {
        try {
            const response = await fetch(`${Server_url}/api/fetchuserdata`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const data = await response.json();

            if (!response.ok) {
                console.log("positive response");
                console.log("Error response:", data);

            }
            set_userName_Pass(data.data);
        } catch (error) {
            console.error("Fetch error:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // for the live tracking of the login and logout 
    useEffect(() => {
        socket.on('logoutfromPrameshDataSystem', () => {
            fetchData();
        })
        socket.on('logintoPrameshDataSystem', () => {
            fetchData();
        })
    })

    // close menu when clicked outside 
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (openMenuId !== null && !e.target.closest('.dropdown_menu') && !e.target.closest('.edit_option')) {
                setOpenMenuId(null);
            }
            // Close editing if clicking outside the row
            if (editingId !== null && !e.target.closest(`tr[data-user-id="${editingId}"]`)) {
                handleCancelEdit();
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [openMenuId, editingId]);

    // New function: Start editing a user
    const handleEdit = (user) => {
        setEditingId(user.id);
        setEditUserName(user.user_name);
        setEditUserEmail(user.user_email);
        setEditPassword(user.password);
        setOpenMenuId(null);
    };

    // New function: Save edited user
    const handleSaveEdit = async (userId) => {
        if (editUserName.trim().length < 3) {
            alert("Username must be at least 3 characters");
            return;
        }
        if (!validateEmail(editUserEmail)) {
            alert("Invalid email format");
            return;
        }
        if (!validatePassword(editPassword)) {
            alert("Password must be at least 8 characters, include uppercase, lowercase, number & special character");
            return;
        }

        try {
            const response = await fetch(`${Server_url}/api/updateUser`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: userId,
                    user_name: editUserName,
                    user_email: editUserEmail,
                    password: editPassword
                })
            });

            const result = await response.json();

            if (response.ok) {
                fetchData(); // Refresh the list
                handleCancelEdit();
            } else {
                alert(result.message || "Failed to update user!");
            }
        } catch (error) {
            console.error("Update error:", error);
            alert("Something went wrong. Please try again!");
        }
    };

    // New function: Cancel editing
    const handleCancelEdit = () => {
        setEditingId(null);
        setEditUserName('');
        setEditUserEmail('');
        setEditPassword('');
    };

    // Validation functions (reused from AddUserDatabase)
    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    const validatePassword = (pwd) => {
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;
        return re.test(pwd);
    }

    // Route --> for deleting the user from database 
    const deleteConfirmationPopup = async (user) => {
        // console.log("user", user)
        setDeleteUser(user);
        setConfirmDelete(true);
    }

    const toggleMenu = (id, e) => {
        if (openMenuId === id) {
            setOpenMenuId(null);
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const dropdownWidth = 100;
        const dropdownHeight = 80;
        const gap = 5;

        const left = rect.right - dropdownWidth;

        let top = rect.bottom + gap;
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < dropdownHeight) {
            top = rect.top - dropdownHeight - gap;
        }

        setMenuPosition({ left, top });
        setOpenMenuId(id);
    };

    const handleDeleteDatabaseUser = async (deleteUser) => {

        try {
            const response = await fetch(`${Server_url}/api/deleteUser`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: deleteUser.id })
            });

            const result = await response.json();

            if (response.ok) {
                fetchData(); // Refresh the user list
                setConfirmDelete(false);
                setDeleteUser(null);
            } else {
                console.error("Delete failed:", result.message);
                // Optionally show an error message
            }
        } catch (error) {
            console.error("Delete error:", error);
            // Optionally show an error message
        }
    }

    const handleAddUser = () => {
        setShowAddUser(true)
    }

    const handleCloseAddUser = () => {
        setShowAddUser(false)
    }
    const handleCloseDelete = () => {
        setConfirmDelete(false);
    }
    return (
        <div className='user_credential_container'>
            <div className="user_count">
                <div className="total_user">{total_user} <p>Accounts </p></div>
                <button onClick={handleAddUser}>Add Account</button>
            </div>
            {userName_Pass && userName_Pass?.length > 0 ? (
                <table className='userdata_table'>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>User Name </th>
                            <th>Email</th>
                            <th>Password</th>
                            <th>Login Status</th>
                            <th className='action_head'>Action</th>
                        </tr>
                    </thead>


                    <tbody>
                        {userName_Pass.filter((user) => user.user_name !== "Praharsh").map((user) => {
                            const isEditing = editingId === user.id;
                            return (
                                <tr key={user.id} data-user-id={user.id}>
                                    <td>{user.id}</td>
                                    {!isEditing ? (
                                        <>
                                            <td>{user.user_name}</td>
                                            <td>{user.user_email}</td>
                                            <td>{user.password}</td>
                                            <td>{user.is_logged_in ? "Yes" : "No"}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className='editable'>
                                                <input
                                                    type="text"
                                                    value={editUserName}
                                                    onChange={(e) => setEditUserName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit(user.id);
                                                        if (e.key === 'Escape') handleCancelEdit();
                                                    }}
                                                />
                                            </td>
                                            <td className='editable'>
                                                <input
                                                    type="email"
                                                    value={editUserEmail}
                                                    onChange={(e) => setEditUserEmail(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit(user.id);
                                                        if (e.key === 'Escape') handleCancelEdit();
                                                    }}
                                                />
                                            </td>
                                            <td className='editable'>
                                                <input
                                                    type="text"
                                                    value={editPassword}
                                                    onChange={(e) => setEditPassword(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit(user.id);
                                                        if (e.key === 'Escape') handleCancelEdit();
                                                    }}
                                                />
                                            </td>
                                            <td>{user.is_logged_in ? "Yes" : "No"}</td> {/* Login status not editable */}
                                        </>
                                    )}
                                    <td className='actions'>
                                        {!isEditing ? (
                                            <div className="action_menu_container">
                                                <span className="edit_option" onClick={(e) => toggleMenu(user.id, e)}> <img src={Edit} alt="" /> </span>

                                                {openMenuId === user.id && createPortal(
                                                    <div
                                                        className={`dropdown_menu show`}
                                                        style={{
                                                            position: 'fixed',
                                                            left: `${menuPosition.left}px`,
                                                            top: `${menuPosition.top}px`,
                                                            zIndex: 998
                                                        }}
                                                    >
                                                        <button onClick={() => handleEdit(user)} style={{ borderBottom: "1px solid grey" }}>Edit</button>
                                                        <button onClick={() => deleteConfirmationPopup(user)}>Delete</button>
                                                    </div>,
                                                    document.body
                                                )}

                                            </div>
                                        ) : (
                                            <div className="edit_actions">
                                                <img src={accept} alt='' onClick={() => handleSaveEdit(user.id)}></img>
                                                <img src={close} alt='' onClick={handleCancelEdit}></img>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}

                    </tbody>
                </table>
            )
                :
                (
                    <div className='no_user_data'>
                        <img src={NoUser} alt="" />
                        <h1>No User Found</h1>
                    </div>
                )}

            {showAddUser && <AddUserDatabase onClose={handleCloseAddUser} fetchData={fetchData} />}
            {confirmDelete && <ConfirmDeletePopup onClose={handleCloseDelete} deleteUser={deleteUser} handleDeleteDatabaseUser={handleDeleteDatabaseUser} />}
        </div>
    )
}

export default EditPassword


// Component for adding user into DATABASE 
function AddUserDatabase({ onClose, fetchData }) {
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const validateEmail = (email) => {
        // simple regex for email validation
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    const validatePassword = (pwd) => {
        // min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;
        return re.test(pwd);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // ✅ Frontend validation
        if (userName.trim().length < 3) {
            setError("Username must be at least 3 characters");
            return;
        }
        if (!validateEmail(userEmail)) {
            setError("Invalid email format");
            return;
        }
        if (!validatePassword(password)) {
            setError("Password must be at least 8 characters, include uppercase, lowercase, number & special character");
            return;
        }

        try {
            const response = await fetch(`${Server_url}/api/addDatabaseUser`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_name: userName, user_email: userEmail, password })
            });

            const result = await response.json();

            if (response.ok) {
                fetchData();
                onClose();
            } else {
                setError(result.message || "Failed to add user!");
            }
        } catch (err) {
            console.error("Error adding user:", err);
            setError("Something went wrong. Please try again!");
        }
    };

    return (
        <div className="adduser_modal">
            <div className="adduser_box">
                <div className="adduserImage">
                    <img src={AddUser} alt="" />
                    <h1>Add New User</h1>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="name_and_email">
                        <div className="name_div">
                            <input
                                type="text"
                                // placeholder="User Name"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                required
                            />
                            <span className='username'>User Name</span>
                        </div>

                        <div className="email_div">
                            <input
                                type="email"
                                // placeholder="Email"
                                value={userEmail}
                                onChange={(e) => setUserEmail(e.target.value)}
                                required
                            />
                            <span className='email'>Email</span>
                        </div>
                    </div>
                    <div className="password">

                        <input
                            type="password"
                            // placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <span>Password</span>
                    </div>
                    <div className="btns">
                        <button type="submit">Add User</button>
                        <button type="button" onClick={onClose}>Cancel</button>
                    </div>
                    {error && <p style={{ color: "red" }}>{error}</p>}
                </form>
            </div>
        </div>
    )
}


// Confirm Delete 
function ConfirmDeletePopup({ deleteUser, handleDeleteDatabaseUser, onClose }) {
    return (
        <div className='delete_popup'>
            <div className="inner_delete">
                <div className="delete_popup_content">
                    <h1>Delete User ?</h1>
                    <span>This will delete <b> {deleteUser.user_name} </b>from the Database</span>
                </div>
                <div className="note_container">
                    Account will not be recovered after deleting
                </div>
                <div className="delete_popup_button">
                    <button onClick={onClose}>Cancel</button>
                    <button onClick={() => handleDeleteDatabaseUser(deleteUser)}>Delete</button>
                </div>
            </div>
        </div>
    )
}