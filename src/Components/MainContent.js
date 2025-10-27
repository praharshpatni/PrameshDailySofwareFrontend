import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveSubmodule } from './../Redux/uiSlice.js';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ModulePage from './ModulePage';
import AnalysisDashboard from './Analysis/AnalysisDashboard.js';
import './Styles/MainContent.css';
import { Server_url, showErrorToast, showInfoToast, showSuccessToast, socket_url } from '../Urls/AllData';
import { RiDeleteBin6Line } from "react-icons/ri";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FiMoreVertical } from "react-icons/fi";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import io from 'socket.io-client';
import Warning from "./../Assets/Warning.jpg"

export default function MainContent({ activeModule, isSidebarPinned }) {
    const dispatch = useDispatch();
    const activeSubmodule = useSelector(state => state.ui.activeSubmodule); // ✅ Redux state
    const currentUser = useSelector(state => state.user.currentUser);

    const [deleteData, setDeleteData] = useState({});
    const [showDeletePopup, setShowDeletePopup] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [allTableData, setAllTableData] = useState({});
    const menuRef = useRef(null);
    const socket = useRef(null);

    const submodules = useMemo(() => ({
        Pramesh: ['KYC', 'Transaction', 'STP_Switch', 'Non_Financial', 'NSE_Pramesh', 'Realvalue'],
        FFL: ['FFL_Transaction', 'FFL_STP_Switch', 'FFL_Non_Financial', 'NSE_FFL'],
        FD: ['FD'],
        Analysis: ['Chart Generator', 'SQL Terminal']
    }), []);

    useEffect(() => {
        socket.current = io(socket_url);
        socket.current.on('rowDeleted', ({ tableName, ids }) => {
            setAllTableData(prev => ({
                ...prev,
                [tableName]: (prev[tableName] || []).filter(row => !ids.includes(row.id))
            }));
        });
        return () => socket.current && socket.current.disconnect();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        if (menuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuOpen]);

    useEffect(() => {
        const defaultSubmodules = submodules[activeModule] || [];
        if (activeModule === 'Analysis') {
            if (defaultSubmodules.includes('Chart Generator')) {
                dispatch(setActiveSubmodule('Chart Generator')); // ✅ Redux
            }
        } else {
            const validDataSubmodule = defaultSubmodules.find(sub => !['Chart Generator', 'SQL Terminal'].includes(sub));
            if (validDataSubmodule) {
                dispatch(setActiveSubmodule(validDataSubmodule)); // ✅ Redux
            }
        }
    }, [activeModule, submodules, dispatch]);

    useEffect(() => {
        const handler = (e) => {
            if (!e.altKey) return;
            const keyMap = {
                q: 'KYC',
                w: 'Transaction',
                e: 'STP_Switch',
                r: 'Non_Financial',
                t: 'NSE_Pramesh',
                a: 'FFL_Transaction',
                s: 'FFL_STP_Switch',
                d: 'FFL_Non_Financial',
                f: 'NSE_FFL',
                '1': 'Chart Generator',
                '2': 'SQL Terminal'
            };

            const value = keyMap[e.key.toLowerCase()];
            if (value && submodules[activeModule].includes(value)) {
                dispatch(setActiveSubmodule(value)); // ✅ Redux
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [activeModule, submodules, dispatch]);

    const toggleDeletePopup = () => {
        const hasSelection = deleteData[activeSubmodule]?.length > 0 || false;
        hasSelection ? setShowDeletePopup(true) : showInfoToast("⚠️ Select rows first");
    };

    const handleDeleteData = async () => {
        const tableName = activeSubmodule;
        const ids = deleteData[tableName] || [];
        if (!ids.length) {
            setShowDeletePopup(false);
            return;
        }

        let updatedAllTableData = { ...allTableData };

        try {
            const res = await fetch(`${Server_url}/api/deleteSelectedRows`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tableName,
                    ids,
                    deleted_by: currentUser?.name || "Unknown"
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.message);

            updatedAllTableData[tableName] = (updatedAllTableData[tableName] || []).filter(
                row => !ids.includes(row.id)
            );
        } catch (err) {
            console.error(`Failed to delete from ${tableName}:`, err);
            showErrorToast(`Delete failed for ${tableName}`);
            return;
        }

        showSuccessToast("Rows deleted Successfully");
        setShowDeletePopup(false);
        setDeleteData(prev => ({ ...prev, [tableName]: [] }));
        setAllTableData(updatedAllTableData);
    };

    const renderDeleteConfirmBox = () => {
        if (!showDeletePopup || !activeSubmodule || !deleteData[activeSubmodule]?.length) return null;

        const tableName = activeSubmodule;
        const ids = deleteData[activeSubmodule];

        return (
            <div className="delete-confirm-overlay">
                <div className="delete-confirm-box">

                    <p>Are you sure you want to delete the selected rows?</p>
                    <div className="warnig_container">
                        <img src={Warning} alt="warning" />
                        <div className="table_container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Table</th>
                                        <th>Row ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ids.map(id => (
                                        <tr key={id}>
                                            <td>{tableName}</td>
                                            <td>{id}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="confirm-buttons">
                        <button className="confirm-btn" onClick={handleDeleteData}>Confirm Delete</button>
                        <button className="cancel-btn" onClick={() => setShowDeletePopup(false)}>Cancel</button>
                    </div>
                </div>
            </div>
        );
    };

    const logDownload = async (fileType) => {
        try {
            await fetch(`${Server_url}/api/logDownload`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_email: currentUser?.email,
                    table_name: activeSubmodule,
                    file_type: fileType
                })
            });
        } catch (err) {
            console.error("❌ Failed to log download:", err);
        }
    };

    const handleExportExcel = async () => {
        const data = allTableData[activeSubmodule] || [];
        if (!data.length) return showInfoToast("⚠️ No data to export.");

        await logDownload("excel");

        const headers = Object.keys(data[0]).filter(key => key !== 'id');
        const exportData = data.map(({ id, ...row }) => row);
        const worksheet = XLSX.utils.json_to_sheet(exportData, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, activeSubmodule);

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, `${activeSubmodule}_data.xlsx`);
    };

    const handleExportPDF = async () => {
        const data = allTableData[activeSubmodule] || [];
        if (!data.length) return showInfoToast("⚠️ No data to export.");

        await logDownload("pdf");

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const headers = Object.keys(data[0]).filter(key => key !== "id");
        const body = data.map(row => headers.map(h => (row[h] ?? "").toString()));
        doc.text(`${activeSubmodule} Data Export`, 8, 10);

        autoTable(doc, {
            startY: 14,
            head: [headers],
            body,
            styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
            headStyles: { fillColor: [75, 137, 220], textColor: 255, halign: 'center' },
            margin: { top: 10, bottom: 10, left: 5, right: 5 },
            theme: 'grid'
        });

        doc.save(`${activeSubmodule}_data.pdf`);
    };

    return (
        <main className={`main-content ${isSidebarPinned ? 'sidebar-open' : 'sidebar-closed'}`}>
            {activeModule !== 'Analysis' && (
                <div className="tab-nav">
                    {Array.isArray(submodules[activeModule]) && submodules[activeModule].length > 0 && (
                        <div className="sub_modules_list">
                            {submodules[activeModule].map((sub, i) => (
                                (sub !== 'SQL Terminal' || currentUser?.email === 'praharshpatni@gmail.com') && (
                                    <button
                                        key={i}
                                        className={`tab-button ${activeSubmodule === sub ? 'active' : ''}`}
                                        onClick={() => dispatch(setActiveSubmodule(sub))} // ✅ Redux
                                    >
                                        {sub}
                                    </button>
                                )
                            ))}
                        </div>
                    )}

                    {deleteData[activeSubmodule]?.length > 0 ? (
                        <div className="delete_all" onClick={toggleDeletePopup}><RiDeleteBin6Line />Delete all</div>
                    ) : (
                        <div className="menu-container" ref={menuRef}>
                            <button onClick={() => setMenuOpen(prev => !prev)} className="menu-button">
                                <FiMoreVertical />
                            </button>
                            {menuOpen && (
                                <div className="menu-dropdown">
                                    <button onClick={handleExportExcel}>
                                        <FaFileExcel style={{ color: 'green', marginRight: '6px' }} /> Download Excel
                                    </button>
                                    <hr style={{ color: "lightgrey", margin: "2px " }} />
                                    <button onClick={handleExportPDF}>
                                        <FaFilePdf style={{ color: "red" }} /> Download PDF
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {showDeletePopup && renderDeleteConfirmBox()}
                </div>
            )}

            {['Chart Generator', 'SQL Terminal'].includes(activeSubmodule) ? (
                <AnalysisDashboard
                    activeSubmodule={activeSubmodule}
                    setActiveSubmodule={(val) => dispatch(setActiveSubmodule(val))} // ✅ if passed
                />
            ) : (
                <ModulePage
                    module={activeModule}
                    submodule={activeSubmodule}
                    setDeleteData={setDeleteData}
                    deleteData={deleteData}
                    setAllTableData={setAllTableData}
                    allTableData={allTableData}
                />
            )}
        </main>
    );
}