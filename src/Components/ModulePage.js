// ModulePage.js - Fixed version
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import { ToastContainer } from 'react-toastify';
import { useSelector } from 'react-redux';
import TableComponent from './TableComponent';
import './Styles/ModulePage.css';
import { Server_url, showErrorToast, showInfoToast, showSuccessToast, socket_url, unrestricted_adminEmails } from '../Urls/AllData';
import { io } from 'socket.io-client';
import SidebarAddRowForm from './SidebarAddRowForm';
import { HiOutlineSearch } from 'react-icons/hi';

const socket = io(socket_url, {
    transports: ['websocket'],
    withCredentials: true,
});

const fieldMap = {
    KYC: [
        'Received_Date', 'Proceed_Date', 'RM', 'Ref_By', 'E_N',
        'PAN', 'Name', 'AMC', 'Status', 'Modification',
        'Remark_1', 'KRA'
    ],
    Transaction: [
        'Received_Date', 'Proceed_Date', 'RM', 'Approach_By',
        'Client_Type', 'PAN', 'Client_Code', 'Client_Name',
        'Transaction_Type', 'SIP_Type', 'Scheme_Type', 'Scheme',
        'Folio_Number', 'Amount', 'Redemption_Date', 'Red_Indicatores_Update',
        'TR_Status', 'OTM_Status', 'SoftWare_Status', 'Installment_Status', 'SIP_Date',
        'Online_Offline', 'Remark', 'Cheque_No'
    ],
    STP_Switch: [
        'Received_Date', 'Proceed_Date', 'RM', 'Ref_By', 'Client_Type',
        'Code', 'Client_Name', 'Transaction_Type_SS',
        'From_Scheme', 'To_Scheme', 'Folio_No', 'Amount', 'Total_Amount',
        'Status', 'Start_Date', 'End_Date', 'Installment', 'No_of_Installment',
        'Online_Offline', 'Remark'
    ],
    Non_Financial: [
        'Received_Date', 'Proceed_Date', 'RM', 'Ref_By', 'Client_Type',
        'Client_Code', 'Client_Name', 'Transaction_NF', 'Scheme_Name',
        'Folio_No', 'SIP_Start_Date', 'SIP_Cease_Date', 'Amount',
        'Status', 'Reason', 'Online_Offline', 'BSE_Client_Code',
        'Remark_1', 'Remark_2'
    ],
    NSE_Pramesh: [
        'Date', 'Create_By', 'RM', 'Code', 'Name', 'IIN_Status',
        'FATCA', 'Mandate', 'Transaction_NP', 'Remark'
    ],
    FFL_Transaction: [
        'Received_Date', 'Proceed_Date', 'RM', 'Approach_By', 'Client_Type',
        'PAN', 'Client_Code', 'Client_Name', 'Transaction_Type', 'SIP_Type',
        'Scheme_Type', 'Scheme', 'Folio_Number', 'Amount', 'Redemption_Date', 'Red_Indicators_Update',
        'TR_Status', 'OTM_Status', 'Software_Status', 'Installment_Status', 'SIP_Date',
        'Online_Offline', 'Remark', 'Cheque_No', 'Rejected_Amount'
    ],
    FFL_STP_Switch: [
        'Received_Date', 'Proceed_Date', 'RM', 'Ref_By', 'Client_Type',
        'Code', 'Client_Name', 'Transaction_Type_FSS', 'From_Scheme',
        'To_Scheme', 'Folio_No', 'Amount', 'Total_Amount', 'Status',
        'Start_Date', 'End_Date', 'Installment', 'No_of_Installment',
        'Online_Offline', 'Client_Code', 'Remark'
    ],
    FFL_Non_Financial: [
        'Received_Date', 'Proceed_Date', 'RM', 'Ref_By', 'Client_Type',
        'Client_Code', 'Client_Name', 'Transaction_FNF', 'Scheme_Name',
        'Folio_No', 'SIP_Start_Date', 'SIP_Cease_Date', 'Amount',
        'Status', 'Reason', 'Online_Offline', 'BSE_Client_Code',
        'Remark_1', 'Remark_2'
    ],
    NSE_FFL: [
        'Date', 'Create_By', 'RM', 'Code', 'Name', 'IIN_Status',
        'FATCA', 'Mandate', 'Transaction', 'Remark'
    ],
    Realvalue: [
        'Received_Date', 'Proceed_Date', 'Captain', 'Sub_RM', 'Sub_RM_ii',
        'Sub_RM_iii', 'Client_Type', 'PAN', 'Client_Code', 'Client_Name',
        'Transaction_Type', 'SIP_Type', 'Scheme_Type', 'Scheme', 'Folio_Number',
        'Amount', 'Red_Indicators_Update', 'TR_Status', 'OTM_Status',
        'Software_Status', 'Installment_Status', 'SIP_Date', 'Online_Offline',
        'Remark', 'Cheque_No'
    ],
    FD: [
        'Received_Date', 'Proceed_Date', 'PAN_Card', 'Online_Offline',
        'Name', 'Transaction_Type_FD', 'Company', 'FDR_Number',
        'Amount', 'Period', 'Cheque_Number', 'Bank_Name',
        'Bank_Account_Number', 'RM'
    ]
};

export default function ModulePage({ module, submodule, setDeleteData, deleteData, setAllTableData, allTableData }) {
    const fields = useMemo(() => fieldMap[submodule] || [], [submodule]);
    const [tableData, setTableData] = useState({ rows: [], modified: false });
    const [isFullScreen, setIsFullScreen] = useState(false);
    const containerRef = useRef(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ visible: false, rowIndex: null, rowId: null });
    const wasFullScreenOnSave = useRef(false);
    const [isAddSidebarOpen, setAddSidebarOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [filteredRows, setFilteredRows] = useState([]);
    const currentUser = useSelector(state => state.user.currentUser);
    const isAutoSaveEnabled = sessionStorage.getItem('autoSave') === 'true';

    const defaultZeroFields = [
        'Amount', 'Total_Amount', 'No_of_Installment', 'Re_Amount',
        'Rejected_Amount', 'NAV'
    ];

    // Sync tableData with allTableData for immediate updates
    useEffect(() => {
        const data = allTableData[submodule] || [];
        setTableData({ rows: data, modified: false });
        if (!debouncedTerm) {
            setFilteredRows(data);
        }
    }, [allTableData, submodule, debouncedTerm]);

    // Debounce effect for search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    // Client-side search filtering
    useEffect(() => {
        if (!debouncedTerm) {
            setFilteredRows(tableData.rows);
            return;
        }

        const lowerTerm = debouncedTerm.toLowerCase();
        const filtered = tableData.rows.filter(row =>
            fields.some(field =>
                String(row[field] ?? '').toLowerCase().includes(lowerTerm)
            )
        );
        setFilteredRows(filtered);
    }, [debouncedTerm, tableData.rows, fields]);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${Server_url}/api/getTableData/${submodule}`);
                const data = await res.json();
                const sanitizedData = data.map(row => {
                    const sanitizedRow = { id: row.id };
                    fields.forEach(field => {
                        sanitizedRow[field] = row[field] ?? '';
                    });
                    return sanitizedRow;
                });
                setTableData({ rows: sanitizedData, modified: false });
                setAllTableData(prev => ({ ...prev, [submodule]: sanitizedData }));
                setFilteredRows(sanitizedData);
            } catch (err) {
                console.error(`Failed to fetch ${submodule} data`, err);
                showErrorToast('Failed to fetch data.');
            }
        };
        if (submodule) fetchData();
    }, [submodule, fields, setAllTableData]);

    // Debounced save function
    const debouncedSave = useMemo(
        () =>
            debounce(async () => {
                if (isSaving || !tableData.modified) return;
                setIsSaving(true);

                const newRows = tableData.rows.filter(row => !row.id); // Changed: filter by !id instead of !tempId for consistency
                const modifiedRows = tableData.rows.filter(row => row.id);

                const formatDateFields = (row) => {
                    const formattedRow = { ...row };
                    delete formattedRow.tempId;
                    for (const key in formattedRow) {
                        const lowerKey = key.toLowerCase();
                        const isActualDateField =
                            lowerKey.includes('date') &&
                            !['mandate', 'mandate mode', 'mandate sf'].includes(lowerKey);
                        if (isActualDateField) {
                            const val = formattedRow[key];
                            formattedRow[key] = val && val !== '1970-01-01' ? new Date(val).toISOString().split('T')[0] : null;
                        }
                    }
                    return formattedRow;
                };

                const isRowEmpty = (row) =>
                    Object.entries(row).every(([key, val]) => {
                        if (key.toLowerCase().includes('date') || key === 'tempId') return true;
                        return !val || val.trim() === '';
                    });

                try {
                    let insertedRows = [];
                    if (newRows.length > 0) {
                        const formattedNewRows = newRows
                            .map(row => ({
                                ...formatDateFields(row),
                                created_by: currentUser?.name || 'Unknown',
                            }))
                            .filter(row => !isRowEmpty(row));
                        if (formattedNewRows.length > 0) {
                            const res = await fetch(`${Server_url}/api/insertTableData`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ tableName: submodule, entries: formattedNewRows }),
                            });
                            const result = await res.json();
                            if (!res.ok) throw new Error(result.message || 'Failed to insert');
                            insertedRows = result.insertedRows || [];
                        }
                    }

                    if (modifiedRows.length > 0) {
                        const seenIds = new Set();
                        const formattedModifiedRows = modifiedRows
                            .map(row => ({
                                ...formatDateFields(row),
                                modified_by: currentUser?.name || 'Unknown',
                            }))
                            .filter(row => {
                                if (!row.id || seenIds.has(row.id)) return false;
                                seenIds.add(row.id);
                                return true;
                            });
                        if (formattedModifiedRows.length > 0) {
                            const res = await fetch(`${Server_url}/api/updateTableData`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ tableName: submodule, entries: formattedModifiedRows }),
                            });
                            const result = await res.json();
                            if (!res.ok) throw new Error(result.message || 'Failed to update');

                            // Update allTableData with modified rows for immediate sync
                            setAllTableData(prev => ({
                                ...prev,
                                [submodule]: (prev[submodule] || []).map(existingRow => {
                                    const updatedRow = formattedModifiedRows.find(r => r.id === existingRow.id);
                                    if (updatedRow) {
                                        const sanitizedRow = { id: updatedRow.id };
                                        fields.forEach(field => {
                                            sanitizedRow[field] = updatedRow[field] ?? '';
                                        });
                                        return sanitizedRow;
                                    }
                                    return existingRow;
                                })
                            }));
                        }
                    }

                    // Update tableData with server-assigned IDs (fix: replace temp rows with inserted ones)
                    setTableData(prev => {
                        let updatedRows = [...prev.rows];
                        // Identify and remove temp rows
                        const tempRows = updatedRows.filter(row => row.tempId);
                        updatedRows = updatedRows.filter(row => !row.tempId);
                        // Replace each temp row with its server counterpart
                        tempRows.forEach(tempRow => {
                            const serverRow = insertedRows.find(sr => {
                                // Match excluding id and tempId
                                return Object.keys(tempRow)
                                    .filter(k => k !== 'tempId' && k !== 'id')
                                    .every(key => tempRow[key] === (sr[key] ?? ''));
                            });
                            if (serverRow) {
                                const sanitizedRow = { id: serverRow.id };
                                fields.forEach(field => {
                                    sanitizedRow[field] = serverRow[field] ?? '';
                                });
                                updatedRows.push(sanitizedRow);
                            } else {
                                // Fallback: keep temp row (rare case)
                                updatedRows.push(tempRow);
                            }
                        });
                        return { rows: updatedRows, modified: false };
                    });

                    // Update allTableData (fix: add new rows without losing existing)
                    setAllTableData(prev => {
                        const existingRows = (prev[submodule] || []).filter(row => row.id);
                        const newSanitizedRows = insertedRows.map(sr => {
                            const sanitizedRow = { id: sr.id };
                            fields.forEach(field => {
                                sanitizedRow[field] = sr[field] ?? '';
                            });
                            return sanitizedRow;
                        }).filter(newRow => !existingRows.some(ex => ex.id === newRow.id));
                        return {
                            ...prev,
                            [submodule]: [...existingRows, ...newSanitizedRows]
                        };
                    });

                    // showSuccessToast('Data saved successfully!');
                } catch (err) {
                    console.error('Save error:', err);
                    showErrorToast('Failed to save data.');
                    // Rollback: restore original rows if needed (optimistic update not implemented here)
                } finally {
                    setIsSaving(false);
                }
            }, 500),
        [tableData, submodule, currentUser?.name, fields, setAllTableData, isSaving]
    );

    // Trigger autosave only if enabled
    useEffect(() => {
        if (isAutoSaveEnabled && tableData.modified) debouncedSave();
        return () => debouncedSave.cancel();
    }, [tableData, isAutoSaveEnabled, debouncedSave]);

    // Fullscreen and keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                toggleFullScreen();
            }
            if (e.key === 'Escape' && document.fullscreenElement) {
                document.exitFullscreen();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                wasFullScreenOnSave.current = !!document.fullscreenElement;
                debouncedSave();
            }
        };

        const handleFullScreenChange = () => {
            setIsFullScreen(document.fullscreenElement !== null);
        };

        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('fullscreenchange', handleFullScreenChange);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
            debouncedSave.cancel();
        };
    }, [debouncedSave]);

    // Socket.IO listeners (unchanged, but ensures no duplicates)
    useEffect(() => {
        socket.on('rowInserted', ({ tableName, rows }) => {
            if (tableName === submodule) {
                const sanitizedNewRows = rows.map(row => {
                    const sanitizedRow = { id: row.id };
                    fields.forEach(field => sanitizedRow[field] = row[field] ?? '');
                    return sanitizedRow;
                });

                setTableData(prev => ({
                    rows: [...prev.rows.filter(row => !row.tempId),
                    ...sanitizedNewRows.filter(newRow => !prev.rows.some(existing => existing.id === newRow.id))],
                    modified: false,
                }));

                setAllTableData(prev => ({
                    ...prev,
                    [submodule]: [...(prev[submodule] || []).filter(row => !row.tempId),
                    ...sanitizedNewRows.filter(newRow => !(prev[submodule] || [])?.some(existing => existing.id === newRow.id))],
                }));
            }
        });

        socket.on('rowUpdated', ({ tableName, rows }) => {
            if (tableName === submodule) {
                setTableData(prev => {
                    const updatedRows = prev.rows.map(row => {
                        const updatedRow = rows.find(r => r.id === row.id);
                        if (updatedRow) {
                            const sanitizedRow = { id: updatedRow.id };
                            fields.forEach(field => sanitizedRow[field] = updatedRow[field] ?? '');
                            return sanitizedRow;
                        }
                        return row;
                    });
                    return { rows: updatedRows, modified: false };
                });

                setAllTableData(prev => ({
                    ...prev,
                    [submodule]: (prev[submodule] || []).map(row => {
                        const updatedRow = rows.find(r => r.id === row.id);
                        if (updatedRow) {
                            const sanitizedRow = { id: updatedRow.id };
                            fields.forEach(field => sanitizedRow[field] = updatedRow[field] ?? '');
                            return sanitizedRow;
                        }
                        return row;
                    }),
                }));
            }
        });

        socket.on('rowDeleted', ({ tableName, ids }) => {
            if (tableName === submodule && ids?.length) {
                setTableData(prev => ({
                    rows: prev.rows.filter(row => !ids.includes(row.id)),
                    modified: false,
                }));
                setAllTableData(prev => ({
                    ...prev,
                    [submodule]: (prev[submodule] || []).filter(row => !ids.includes(row.id)),
                }));
            }
        });

        return () => {
            socket.off('rowInserted');
            socket.off('rowUpdated');
            socket.off('rowDeleted');
        };
    }, [submodule, fields, setAllTableData]);

    // Handle input changes (key press or selection)
    const handleInputChange = (rowIndex, field, value) => {
        setTableData(prev => {
            const updatedRows = [...prev.rows];
            const row = updatedRows[rowIndex];

            if (field === 'RM' && !unrestricted_adminEmails.includes(currentUser?.email) && value !== currentUser?.name) {
                showInfoToast('⚠️ You are not allowed to enter other RM data.');
                return prev;
            }

            const receivedDateField = fields.find(f => f.toLowerCase().includes('received') && f.toLowerCase().includes('date'));
            const proceedDateField = fields.find(f => f.toLowerCase().includes('proceed') && f.toLowerCase().includes('date'));

            if (receivedDateField && proceedDateField) {
                const receivedDate = new Date(field === receivedDateField ? value : row[receivedDateField]);
                const proceedDate = new Date(field === proceedDateField ? value : row[proceedDateField]);
                if (proceedDate < receivedDate) {
                    showInfoToast('⚠️ Proceed Date must be greater than or equal to Received Date.');
                    return prev;
                }
            }

            updatedRows[rowIndex] = { ...row, [field]: value };
            return { rows: updatedRows, modified: true };
        });
    };

    // Handle adding new rows (simplified: data optional for server-inserted rows)
    const handleAddRow = (options = {}) => {
        const { data } = options;
        const today = new Date().toISOString().split('T')[0];
        const tempId = data?.id ? null : `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const newRow = data || fields.reduce((acc, field) => {
            const lowerField = field.toLowerCase();
            if (
                (lowerField.includes('received') && lowerField.includes('date')) ||
                (lowerField.includes('proceed') && lowerField.includes('date')) ||
                (field === 'Date' && ['NSE_Pramesh', 'NSE_FFL'].includes(submodule))
            ) {
                acc[field] = today;
            } else if (defaultZeroFields.includes(field)) {
                acc[field] = '0';
            } else if (field === 'Captain' && submodule === 'Realvalue') {
                acc[field] = 'Prasad Parsekar';
            } else {
                acc[field] = '';
            }
            return acc;
        }, { tempId });

        setTableData(prev => ({
            rows: [...prev.rows, newRow],
            modified: !newRow.id, // Only mark modified if no server ID (local add)
        }));
    };

    // Handle row deletion
    const handleDeleteRow = (rowIndex) => {
        const rowId = tableData.rows[rowIndex]?.id;
        setDeleteConfirm({ visible: true, rowIndex, rowId });
    };

    const confirmDeleteRow = async () => {
        const { rowIndex, rowId } = deleteConfirm;
        // const row = tableData.rows[rowIndex];

        if (!rowId) {
            // Local temp row: remove immediately
            setTableData(prev => ({
                rows: prev.rows.filter((_, idx) => idx !== rowIndex),
                modified: tableData.modified && tableData.rows.length > 1, // Adjust modified if needed
            }));
            setDeleteConfirm({ visible: false, rowIndex: null, rowId: null });
            showSuccessToast('Row deleted successfully.');
            return;
        }

        try {
            const res = await fetch(`${Server_url}/api/deleteRows`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableName: submodule,
                    ids: [rowId],
                    deleted_by: currentUser?.name || 'Unknown',
                }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Failed to delete');
            // Instant UI update for existing row
            setTableData(prev => ({
                rows: prev.rows.filter(r => r.id !== rowId),
                modified: false,
            }));
            // Sync allTableData for consistency
            setAllTableData(prev => ({
                ...prev,
                [submodule]: (prev[submodule] || []).filter(r => r.id !== rowId),
            }));
            showSuccessToast('Row deleted successfully.');
        } catch (err) {
            console.error('Delete error:', err);
            showErrorToast('Failed to delete the row.');
        } finally {
            setDeleteConfirm({ visible: false, rowIndex: null, rowId: null });
        }
    };

    // Toggle fullscreen mode
    const toggleFullScreen = async () => {
        if (!document.fullscreenElement) {
            try {
                await containerRef.current.requestFullscreen();
            } catch (err) {
                console.error('Fullscreen error:', err);
            }
        } else {
            try {
                await document.exitFullscreen();
            } catch (err) {
                console.error('Exit fullscreen error:', err);
            }
        }
    };

    return (
        <div className={`module-page ${isFullScreen ? 'fullscreen-mode' : ''}`} ref={containerRef}>
            <div className="module-header">
                <h2>{module} → {submodule}</h2>
                <div className="header-actions">
                    <div className="search-container">
                        <span className="search-icon">
                            <HiOutlineSearch />
                        </span>
                        <input
                            type="text"
                            placeholder={`Search in ${submodule}`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="button_container">
                        <button onClick={() => setAddSidebarOpen(true)} className="add-row-btn">+ Add Entry</button>
                        <button onClick={toggleFullScreen} className="fullscreen-btn">
                            {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                        </button>
                    </div>
                </div>
            </div>

            <TableComponent
                fields={fields}
                rows={filteredRows}
                onAddRow={handleAddRow}
                onInputChange={handleInputChange}
                onDeleteRow={handleDeleteRow}
                defaultZeroFields={defaultZeroFields}
                setDeleteData={setDeleteData}
                submodule={submodule}
                selectedIds={deleteData[submodule] || []}
                onSelectionChange={(selectedIds) =>
                    setDeleteData(prev => ({
                        ...prev,
                        [submodule]: selectedIds,
                    }))
                }
                isFullScreen={isFullScreen}
            />
            {isAddSidebarOpen && (
                <SidebarAddRowForm
                    allFields={fieldMap}
                    defaultZeroFields={defaultZeroFields}
                    currentSubmodule={submodule}
                    currentUser={currentUser} // Pass currentUser for created_by
                    onClose={() => setAddSidebarOpen(false)}
                    onRowInserted={(data) => {
                        handleAddRow({ data });
                        setAddSidebarOpen(false);
                    }}
                />
            )}

            {deleteConfirm.visible && (
                <div className="delete-confirm-overlay">
                    <div className="delete-confirm-box">
                        <p>Are you sure you want to delete this row from <strong>{submodule}</strong>?</p>
                        <div className="confirm-buttons">
                            <button onClick={confirmDeleteRow} className="confirm-btn">Yes, Delete</button>
                            <button onClick={() => setDeleteConfirm({ visible: false, rowIndex: null, rowId: null })} className="cancel-btn">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                draggable
                pauseOnHover
            />
        </div>
    );
}