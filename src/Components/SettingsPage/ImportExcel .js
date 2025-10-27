import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { FaFileExcel } from 'react-icons/fa';
import { Server_url, showErrorToast, showInfoToast, showSuccessToast } from '../../Urls/AllData';
import { useSelector } from 'react-redux';
// import Upload_Excel_img from "./../../Assets/Upload_Excel_img.jpg";

const ImportExcel = () => {
    const [selectedTable, setSelectedTable] = useState('');
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const currentUser = useSelector(state => state.user.currentUser);

    const tableOptions = [
        'KYC', 'Transaction', 'STP_Switch', 'Non_Financial', 'NSE_Pramesh', 'Realvalue',
        'FFL_Transaction', 'FFL_STP_Switch', 'FFL_Non_Financial', 'NSE_FFL', 'FD'
    ];

    // 🔁 Shared function: parse and upload Excel
    const parseAndUploadExcel = async (file) => {
        if (!file) {
            showErrorToast("❌ No file selected.");
            return;
        }

        setUploading(true);
        setFileName(file.name);

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet);

                if (!json || json.length === 0) {
                    showInfoToast("⚠️ Excel sheet is empty!");
                    setUploading(false);
                    return;
                }

                console.log("📦 Payload to send:", {
                    tableName: selectedTable,
                    rows: json,
                    created_by: currentUser?.name || 'Unknown'
                });

                await axios.post(`${Server_url}/api/importExcel`, {
                    tableName: selectedTable,
                    rows: json,
                    created_by: currentUser?.name || 'Unknown'
                });

                // console.log("📥 Upload Response:", response.data);
                showSuccessToast(`Data imported successfully into '${selectedTable}'!`);
            } catch (err) {
                console.error('❌ File upload error:', err);
                showErrorToast(`❌ Failed to import data: ${err.message || "Unknown error"}`);
            } finally {
                setUploading(false);
                setTimeout(() => {
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    setFileName('');
                }, 100); // Slight delay to ensure processing completes
            }
        };

        reader.onerror = () => {
            showErrorToast("❌ Failed to read file.");
            setUploading(false);
            setTimeout(() => {
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setFileName('');
            }, 100);
        };

        reader.readAsArrayBuffer(file);
    };

    // 🔍 File validation before processing
    const validateAndProcessFile = (file) => {
        if (!file) {
            showInfoToast('⚠️ No file selected.');
            return;
        }

        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            showInfoToast('⚠️ Please select a valid Excel file (.xlsx or .xls).');
            return;
        }

        if (file.size > 100 * 1024 * 1024) {
            showInfoToast('⚠️ File size exceeds 100MB limit.');
            return;
        }

        if (!selectedTable) {
            showInfoToast('⚠️ Please select a table before uploading.');
            return;
        }

        parseAndUploadExcel(file);
    };

    // Handle file upload via input
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        console.log("📂 File selected via input:", file); // Debug log
        if (file) {
            setFileName(file.name); // Update fileName immediately
            validateAndProcessFile(file);
        } else {
            showInfoToast('⚠️ No file selected.');
        }
    };

    // Handle file drop
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        console.log("📂 File dropped:", file); // Debug log
        if (file) {
            setFileName(file.name); // Update fileName immediately
            validateAndProcessFile(file);
        }
    };

    // Handle "Choose File" button click
    const handleChooseFileClick = () => {
        console.log("📥 Choose File button clicked"); // Debug log
        fileInputRef.current?.click();
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    return (
        <div className="import-excel-wrapper">
            <h3 style={{ marginBottom: '0rem' }}>Upload Excel File</h3>

            <div className="selection_container">
                <label><b>Select Table:</b></label>
                <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    style={{ margin: '0.5rem 0', padding: '0.5rem', width: '100%' }}
                >
                    <option value="">-- Select a Table --</option>
                    {tableOptions.map((table) => (
                        <option key={table} value={table}>{table}</option>
                    ))}
                </select>
            </div>

            <div className="upload_container">
                <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                    <FaFileExcel size={20} style={{ marginRight: '8px', color: 'green' }} />
                    Choose Excel File
                </label>

                <div
                    className={`excel_upload_ui ${isDragging ? 'dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="drag_drop_text">
                        <img src="https://res.cloudinary.com/dasparepg/image/upload/v1752559685/Upload_Excel_img_tpsswq.jpg" alt="Upload" />
                        <h2>Drag and Drop Files here</h2>
                        <span>Files Supported: XLS, XLSX</span>
                    </div>

                    {fileName && (
                        <div style={{ marginTop: '10px', color: '#333' }}>
                            📄 Selected file: <strong>{fileName}</strong>
                        </div>
                    )}

                    <div className="choose_file">
                        <button type="button" onClick={handleChooseFileClick}>Choose File</button>
                    </div>

                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                    />
                </div>
            </div>
            {/* <button onClick={() => showSuccessToast('Test Toast!')}>Show Test Toast</button> */}


            {uploading && <p>⏳ Uploading file... please wait</p>}
        </div>
    );
};

export default ImportExcel;