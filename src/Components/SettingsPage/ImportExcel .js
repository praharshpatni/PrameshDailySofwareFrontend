import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { FaFileExcel } from 'react-icons/fa';
import { Server_url, showErrorToast, showInfoToast, showSuccessToast } from '../../Urls/AllData';
import { useSelector } from 'react-redux';

const ImportExcel = () => {
    const [selectedTable, setSelectedTable] = useState('');
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [lastImportInfo, setLastImportInfo] = useState(null);
    const [importMode, setImportMode] = useState('override'); // 'append' or 'override'
    const currentUser = useSelector(state => state.user.currentUser);

    useEffect(() => {
        if (lastImportInfo) {
            const timer = setTimeout(() => {
                setLastImportInfo(null);
            }, 2000); // hides after 4 seconds

            return () => clearTimeout(timer);
        }
    }, [lastImportInfo]);

    const tableOptions = [
        'KYC', 'Transaction', 'STP_Switch', 'Non_Financial', 'NSE_Pramesh', 'Realvalue',
        'FFL_Transaction', 'FFL_STP_Switch', 'FFL_Non_Financial', 'NSE_FFL', 'FD', 'RV_Transaction', 'RV_NSE', 'RV_Non_Financial', 'RV_STP_Switch'
    ];

    const parseAndUploadExcel = async (file) => {
        if (!file) { showErrorToast("❌ No file selected."); return; }
        setUploading(true);
        setFileName(file.name);
        setLastImportInfo(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false, raw: true });

                const dataRows = json.slice(1);
                if (!dataRows || dataRows.length === 0) {
                    showInfoToast("⚠️ Excel sheet has no data rows!");
                    setUploading(false);
                    return;
                }

                const headerRow = json[0] || [];
                const XLSXDateToJSDate = (serial) => {
                    if (typeof serial === 'number') {
                        const utc_days = Math.floor(serial - 25569);
                        return new Date(utc_days * 86400 * 1000).toISOString().split('T')[0];
                    }
                    return serial;
                };

                const rowsWithHeaders = dataRows.map((row) => {
                    const obj = {};
                    headerRow.forEach((header, index) => {
                        let cellValue = row[index];
                        if (header && header.toLowerCase().includes('date')) {
                            if (typeof cellValue === 'number') {
                                cellValue = XLSXDateToJSDate(cellValue);
                            } else if (typeof cellValue === 'string' && cellValue.trim()) {
                                let parsedDate = new Date(cellValue);
                                if (!isNaN(parsedDate)) {
                                    cellValue = formatLocalDate(parsedDate);
                                } else {
                                    // Manual parse (assume DD-MM-YYYY primarily)
                                    const parts = cellValue.split(/[/.-]/);
                                    if (parts.length === 3) {
                                        let day = parseInt(parts[0], 10);
                                        let month = parseInt(parts[1], 10);
                                        let year = parseInt(parts[2], 10);
                                        // Handle 2-digit year
                                        if (year < 100) {
                                            year = year > 50 ? 1900 + year : 2000 + year;
                                        }
                                        // Try DD-MM-YYYY first
                                        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                                            parsedDate = new Date(year, month - 1, day);
                                            if (!isNaN(parsedDate) && parsedDate.getDate() === day) {
                                                cellValue = formatLocalDate(parsedDate);
                                            } else {
                                                // Fallback: Swap to MM-DD-YYYY
                                                [day, month] = [month, day];
                                                parsedDate = new Date(year, month - 1, day);
                                                if (!isNaN(parsedDate) && parsedDate.getDate() === day) {
                                                    cellValue = formatLocalDate(parsedDate);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            // Ensure it's a string or null
                            cellValue = cellValue || '';
                        }
                        obj[header || `column_${index}`] = cellValue || '';
                    });
                    return obj;
                });

                console.log("📦 Parsed", rowsWithHeaders.length, "rows");

                const response = await axios.post(`${Server_url}/api/importExcel`, {
                    tableName: selectedTable,
                    rows: rowsWithHeaders,
                    created_by: currentUser?.name || 'Unknown',
                    importMode: importMode // 'append' or 'override'
                });

                const { successCount = 0, skipped = [], totalProcessed, errorSummary = {}, mode, previousRowCount } = response.data;
                console.log("📥 Upload Response:", response.data);

                setLastImportInfo({ mode, previousRowCount, successCount, skipped: skipped.length });

                if (skipped.length > 0) {
                    console.group("⚠️ Skipped Rows:");
                    skipped.forEach(({ index, reason }) => console.warn(`Row ${index}: ${reason}`));
                    console.groupEnd();
                }

                if (mode === 'override') {
                    showSuccessToast(`🔄 Override: ${successCount} rows replaced ${previousRowCount} existing rows in '${selectedTable}'`);
                } else {
                    if (skipped.length === 0) {
                        showSuccessToast(`➕ Added ${successCount} new rows to '${selectedTable}' (total: ${previousRowCount + successCount})`);
                    } else {
                        const summaryText = Object.entries(errorSummary).map(([t, c]) => `${c} ${t}`).join(', ');
                        showSuccessToast(`➕ Added ${successCount}/${totalProcessed} rows (${skipped.length} skipped: ${summaryText})`);
                    }
                }

                if (skipped.length > 50) alert(`⚠️ High skip rate: ${skipped.length} rows failed. Check console.`);

            } catch (err) {
                console.error('❌ File upload error:', err);
                showErrorToast(`❌ Failed to import: ${err.response?.data?.message || err.message}`);
            } finally {
                setUploading(false);
                setTimeout(() => { if (fileInputRef.current) fileInputRef.current.value = ''; setFileName(''); }, 100);
            }
        };

        reader.onerror = () => { showErrorToast("❌ Failed to read file."); setUploading(false); };
        reader.readAsArrayBuffer(file);
    };

    const formatLocalDate = (date) => {
        if (!date || isNaN(date.getTime())) return null;
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    const validateAndProcessFile = (file) => {
        if (!file) { showInfoToast('⚠️ No file selected.'); return; }
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) { showInfoToast('⚠️ Please select a valid Excel file.'); return; }
        if (file.size > 100 * 1024 * 1024) { showInfoToast('⚠️ File size exceeds 100MB.'); return; }
        if (!selectedTable) { showInfoToast('⚠️ Please select a table first.'); return; }
        parseAndUploadExcel(file);
    };

    const handleFileUpload = (e) => { const file = e.target.files?.[0]; if (file) { setFileName(file.name); validateAndProcessFile(file); } };
    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) { setFileName(file.name); validateAndProcessFile(file); } };
    const handleChooseFileClick = () => fileInputRef.current?.click();
    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);

    return (
        <div className="import-excel-wrapper">
            <div className="selection_container">
                <label><b>Select Table:</b></label>
                <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}>
                    <option value="">-- Select a Table --</option>
                    {tableOptions.map((table) => <option key={table} value={table}>{table}</option>)}
                </select>
            </div>

            <div className="selection_container">
                <div className="import-mode-options">

                    <label><b>Import Mode:</b></label>
                    <label className={`mode-option ${importMode === 'append' ? 'active' : ''}`}>
                        <input
                            type="radio"
                            name="importMode"
                            value="append"
                            checked={importMode === 'append'}
                            onChange={(e) => setImportMode(e.target.value)}
                        />
                        <span className="mode-icon">➕</span>
                        <span className="mode-text">
                            <strong>Append</strong>
                            <small>Add new rows to existing data</small>
                        </span>
                    </label>
                    <label className={`mode-option ${importMode === 'override' ? 'active' : ''}`}>
                        <input
                            type="radio"
                            name="importMode"
                            value="override"
                            checked={importMode === 'override'}
                            onChange={(e) => setImportMode(e.target.value)}
                        />
                        <span className="mode-icon">🔄</span>
                        <span className="mode-text">
                            <strong>Override</strong>
                            <small>Replace all existing data</small>
                        </span>
                    </label>
                </div>
            </div>

            <div className="upload_container">
                <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                    <FaFileExcel size={20} style={{ marginRight: '8px', color: 'green' }} /> Choose Excel File
                </label>
                <div className={`excel_upload_ui ${isDragging ? 'dragging' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                    <div className="drag_drop_text">
                        <img src="https://res.cloudinary.com/dasparepg/image/upload/v1752559685/Upload_Excel_img_tpsswq.jpg" alt="Upload" />
                        <h2>Drag and Drop Files here</h2>
                        <span>Files Supported: XLS, XLSX</span>
                    </div>
                    {fileName && <div style={{ marginTop: '10px', color: '#333' }}>📄 Selected: <strong>{fileName}</strong></div>}
                    <div className="choose_file">
                        <button type="button" onClick={handleChooseFileClick} className="choose-file-btn" disabled={uploading}>
                            {uploading ? '⏳ Processing...' : 'Choose File'}
                        </button>
                    </div>
                    <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} ref={fileInputRef} />
                </div>
                {uploading && <p>⏳ Uploading file... please wait</p>}

            </div>


            {lastImportInfo && (
                <div
                    className={`import-result-info ${lastImportInfo.mode === "override"
                        ? "override-mode"
                        : "append-mode"
                        }`}
                >
                    <strong className="result-title">
                        {lastImportInfo.mode === "override"
                            ? "🔄 Override Mode"
                            : "➕ Append Mode"}
                    </strong>

                    <p className="result-details">
                        {lastImportInfo.mode === "override"
                            ? `Replaced ${lastImportInfo.previousRowCount} rows with ${lastImportInfo.successCount} new rows`
                            : `Added ${lastImportInfo.successCount} rows (was ${lastImportInfo.previousRowCount}, now ${lastImportInfo.previousRowCount +
                            lastImportInfo.successCount
                            })`}

                        {lastImportInfo.skipped > 0 &&
                            ` • ${lastImportInfo.skipped} skipped`}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ImportExcel;