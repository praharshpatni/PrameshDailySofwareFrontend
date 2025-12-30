// ModulePage.js - Fixed duplicate row addition by updating global state only in handleAddRow with duplicate check

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { debounce } from 'lodash';
import { ToastContainer } from 'react-toastify';
import { useSelector } from 'react-redux';
import TableComponent from './TableComponent';
import './Styles/ModulePage.css';
import { Server_url, showErrorToast, showInfoToast, showSuccessToast, socket_url, unrestricted_adminEmails } from '../Urls/AllData';
import { io } from 'socket.io-client';
import SidebarAddRowForm from './SidebarAddRowForm';
import { HiOutlineSearch } from 'react-icons/hi';
import { FaFilterCircleXmark } from "react-icons/fa6";
// Add this import at the top if not already there
import { toast } from 'react-toastify';


const socket = io(socket_url, {
    transports: ['websocket'],
    withCredentials: true,
});

const fieldMap = {
    KYC: [
        'Received_Date', 'Proceed_Date', 'RM', 'Ref_By', 'E_N',
        'PAN', 'Name', 'AMC', 'Mother_Name', 'Contact', 'Email', 'Status', 'Modification',
        'Remark_1', 'KRA'
    ],
    Transaction: [
        'Received_Date', 'Proceed_Date', 'RM', 'Approach_By',
        'Client_Type', 'PAN', 'Client_Code', 'Client_Name',
        'Transaction_Type', 'SIP_Type', 'Scheme_Type', 'Scheme',
        'Folio_Number', 'Amount', 'Redemption_Date', 'Red_Indicators_Update',
        'TR_Status', 'OTM_Status', 'SoftWare_Status', 'Installment_Status', 'SIP_Date',
        'Online_Offline', 'Remark', 'Cheque_No'
    ],
    STP_Switch: [
        'Received_Date', 'Proceed_Date', 'RM', 'Ref_By', 'Client_Type',
        'Code', 'Client_Name', 'Transaction_Type_SS',
        'From_Scheme', 'To_Scheme', 'Folio_No', 'Amount', 'Total_Amount',
        'TR_Status', 'Start_Date', 'End_Date', 'Installment', 'No_of_Installment',
        'Online_Offline', 'Remark'
    ],
    Non_Financial: [
        'Received_Date', 'Proceed_Date', 'RM', 'Ref_By', 'Client_Type',
        'Client_Code', 'Client_Name', 'Transaction_NF', 'Scheme_Name',
        'Folio_No', 'SIP_Start_Date', 'SIP_Cease_Date', 'Amount',
        'TR_Status', 'Reason', 'Online_Offline', 'BSE_Client_Code',
        'Remark_1', 'Remark_2'
    ],
    NSE_Pramesh: [
        'Date', 'Create_By', 'RM', 'Code', 'Name', 'IIN_Status',
        'FATCA', 'Mandate', 'NSE_Transaction', 'Remark'
    ],
    FFL_Transaction: [
        'Received_Date', 'Proceed_Date', 'RM', 'Approach_By', 'Client_Type',
        'PAN', 'Client_Code', 'Client_Name', 'Transaction_Type', 'SIP_Type',
        'Scheme_Type', 'Scheme', 'Folio_Number', 'Amount', 'Redemption_Date', 'Red_Indicators_Update',
        'TR_Status', 'OTM_Status', 'SoftWare_Status', 'Installment_Status', 'SIP_Date',
        'Online_Offline', 'Remark', 'Cheque_No', 'Rejected_Amount'
    ],
    FFL_STP_Switch: [
        'Received_Date', 'Proceed_Date', 'RM', 'Ref_By', 'Client_Type',
        'Code', 'Client_Name', 'Transaction_Type_FSS', 'From_Scheme',
        'To_Scheme', 'Folio_No', 'Amount', 'Total_Amount', 'TR_Status',
        'Start_Date', 'End_Date', 'Installment', 'No_of_Installment',
        'Online_Offline', 'Client_Code', 'Remark'
    ],
    FFL_Non_Financial: [
        'Received_Date', 'Proceed_Date', 'RM', 'Ref_By', 'Client_Type',
        'Client_Code', 'Client_Name', 'Transaction_NF', 'Scheme_Name',
        'Folio_No', 'SIP_Start_Date', 'SIP_Cease_Date', 'Amount',
        'TR_Status', 'Reason', 'Online_Offline', 'BSE_Client_Code',
        'Remark_1', 'Remark_2'
    ],
    NSE_FFL: [
        'Date', 'Create_By', 'RM', 'Code', 'Name', 'IIN_Status',
        'FATCA', 'Mandate', 'NSE_Transaction', 'Remark'
    ],
    RV_Transaction: [
        'Received_Date', 'Proceed_Date', 'Captain', 'Sub_RM', 'Sub_RM_ii', 'Sub_RM_iii', 'Branch', 'Client_Type', 'PAN', 'Client_Code', 'Client_Name',
        'Transaction_Type', 'SIP_Type', 'Scheme_Type', 'Scheme',
        'Folio_Number', 'Amount', 'Redemption_Date', 'Red_Indicators_Update',
        'TR_Status', 'OTM_Status', 'SoftWare_Status', 'Installment_Status', 'SIP_Date',
        'Online_Offline', 'Remark', 'Cheque_No'
    ],
    RV_NSE: [
        'Date', 'RV_RM', 'Sub_RM', 'Sub_RM_ii', 'Contact', 'Create_By', 'Code', 'Name', 'IIN_Status',
        'FATCA', 'Mandate', 'NSE_Transaction', 'Mandate_Mode', 'Reason', 'Remark'
    ],
    RV_Non_Financial: [
        'Received_Date', 'Proceed_Date', 'RV_RM', 'Ref_By', 'Client_Type',
        'Client_Code', 'Client_Name', 'Transaction_NF', 'Scheme_Name',
        'Folio_No', 'SIP_Start_Date', 'SIP_Cease_Date', 'Amount', 'Investment_Value', 'Current_Value', 'As_On_Date',
        'TR_Status', 'Reason', 'Online_Offline', 'BSE_Client_Code',
        'Remark_1', 'Remark_2'
    ],
    RV_STP_Switch: [
        'Received_Date', 'Proceed_Date', 'RV_RM', 'Ref_By', 'Client_Type',
        'Code', 'Client_Name', 'Transaction_Type_SS',
        'From_Scheme', 'To_Scheme', 'Folio_No', 'Amount', 'Total_Amount',
        'TR_Status', 'Start_Date', 'End_Date', 'Installment', 'No_of_Installment',
        'Online_Offline', 'Remark'
    ],
    FD: [
        'Received_Date', 'Proceed_Date', 'RM', 'PAN_Card', 'Online_Offline',
        'Name', 'Transaction_Type_FD', 'Company', 'FDR_Number',
        'Amount', 'Period', 'Cheque_Number', 'Bank_Name',
        'Bank_Account_Number'
    ]
};

export default function ModulePage({ module, submodule, setDeleteData, deleteData, setAllTableData, allTableData }) {
    const fields = useMemo(() => fieldMap[submodule] || [], [submodule]);
    const [tableData, setTableData] = useState({ rows: [], modified: false });
    const [isFullScreen, setIsFullScreen] = useState(false);
    const containerRef = useRef(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ visible: false, rowId: null });
    const wasFullScreenOnSave = useRef(false);
    const [isAddSidebarOpen, setAddSidebarOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [filteredRows, setFilteredRows] = useState([]);
    const [displayCount, setDisplayCount] = useState({ showing: 0, total: 0 });
    const currentUser = useSelector(state => state.user.currentUser);
    const isAdmin = unrestricted_adminEmails.includes(currentUser?.email);
    const isAutoSaveEnabled = sessionStorage.getItem('autoSave') === 'true';
    const [tableFilters, setTableFilters] = useState({});

    const [activeFilterCount, setActiveFilterCount] = useState(0);
    const defaultZeroFields = useMemo(() => [
        'Amount', 'Total_Amount', 'No_of_Installment', 'Re_Amount',
        'Rejected_Amount', 'NAV', 'Investment_Value', 'Current_Value'
    ], []);

    // const baseRows = useMemo(() => {
    //     if (tableData.rows.length === 0) return [];
    //     return isAdmin
    //         ? tableData.rows
    //         : tableData.rows.filter(row => row.RM === (currentUser?.name || ''));
    // }, [tableData.rows, isAdmin, currentUser?.name]);
    const baseRows = useMemo(() => {
        if (tableData.rows.length === 0) return [];

        // Use a more efficient filtering approach
        if (isAdmin) return tableData.rows;

        const currentUserName = currentUser?.name;
        if (!currentUserName) return [];

        return tableData.rows.filter(row => row.RM === currentUserName);
    }, [tableData.rows, isAdmin, currentUser?.name]);

    // Function to get row count display text
    const getRowCountDisplay = () => {
        const { showing, total } = displayCount;
        return ` ${showing} of ${total} entries`;
    };

    // Update total count when baseRows changes
    useEffect(() => {
        setDisplayCount(prev => ({ ...prev, total: baseRows.length }));
    }, [baseRows.length]);

    // Sync tableData with allTableData for immediate updates
    useEffect(() => {
        const data = allTableData[submodule] || [];
        const relevantData = isAdmin
            ? data
            : data.filter(row => row.RM === (currentUser?.name || ''));
        setTableData({ rows: relevantData, modified: false });
    }, [allTableData, submodule, isAdmin, currentUser?.name]);

    // Debounce effect for search (kept at 1000ms to avoid UI jank on typing)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, 1000);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);
    // Client-side search filtering
    useEffect(() => {
        if (!debouncedTerm) {
            setFilteredRows(baseRows);
            return;
        }

        const lowerTerm = debouncedTerm.toLowerCase();
        const filtered = baseRows.filter(row =>
            fields.some(field =>
                String(row[field] ?? '').toLowerCase().includes(lowerTerm)
            )
        );
        setFilteredRows(filtered);
    }, [debouncedTerm, baseRows, fields]);

    // Fetch initial data (optimized: no changes needed, as it's a single efficient call)
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
                    if (row.created_date) {
                        sanitizedRow.created_date = row.created_date;
                    }
                    return sanitizedRow;
                });
                setAllTableData(prev => ({ ...prev, [submodule]: sanitizedData }));
                const relevantData = isAdmin
                    ? sanitizedData
                    : sanitizedData.filter(row => row.RM === (currentUser?.name || ''));
                setTableData({ rows: relevantData, modified: false });
            } catch (err) {
                console.error(`Failed to fetch ${submodule} data`, err);
                showErrorToast('Failed to fetch data.');
            }
        };
        if (submodule) fetchData();
    }, [submodule, fields, setAllTableData, isAdmin, currentUser?.name]);

    // Memoized onCountChange to prevent re-render loops
    const handleCountChange = useCallback((showing) => {
        setDisplayCount(prev => ({ ...prev, showing }));
    }, []);

    // Debounced save function (optimized: reduced to 500ms for faster batching to server/socket)
    // Improved debounced save function with better state management
    const debouncedSave = useMemo(
        () =>
            debounce(async () => {
                if (isSaving || !tableData.modified) return;
                setIsSaving(true);

                // Create a snapshot of current data to avoid state changes during save
                const currentRows = [...tableData.rows];
                const newRows = currentRows.filter(row => !row.id);
                // console.log("sssssssssssss", tableData);


                const formatDateFields = (row) => {
                    const formattedRow = { ...row };
                    delete formattedRow.tempId;

                    const dateFields = [
                        'Received_Date', 'Proceed_Date', 'Redemption_Date', 'SIP_Date',
                        'Start_Date', 'End_Date', 'SIP_Start_Date', 'SIP_Cease_Date', 'Date', 'As_On_Date'
                    ];

                    for (const key in formattedRow) {
                        if (dateFields.includes(key) ||
                            (key.toLowerCase().includes('date') &&
                                !key.toLowerCase().includes('indicator') &&
                                !['mandate', 'mandate mode', 'mandate sf'].includes(key.toLowerCase()))) {
                            const val = formattedRow[key];
                            const date = new Date(val);
                            formattedRow[key] = (val && val !== '1970-01-01' && !isNaN(date.getTime()))
                                ? date.toISOString().split('T')[0]
                                : null;
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

                    // Process new rows
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

                    // Process mod  ified rows
                    // if (modifiedRows.length > 0) {
                    //     const seenIds = new Set();
                    //     const formattedModifiedRows = modifiedRows
                    //         .map(row => ({
                    //             ...formatDateFields(row),
                    //             modified_by: currentUser?.name || 'Unknown',
                    //         }))
                    //         .filter(row => {
                    //             if (!row.id || seenIds.has(row.id)) return false;
                    //             seenIds.add(row.id);
                    //             return true;
                    //         });

                    //     // if (formattedModifiedRows.length > 0) {
                    //     //     const res = await fetch(`${Server_url}/api/updateTableData`, {
                    //     //         method: 'PUT',
                    //     //         headers: { 'Content-Type': 'application/json' },
                    //     //         body: JSON.stringify({ tableName: submodule, entries: formattedModifiedRows }),
                    //     //     });
                    //     //     const result = await res.json();
                    //     //     console.log("result", result);
                    //     //     if (!res.ok) throw new Error(result.message || 'Failed to update');

                    //     //     // Update allTableData with modified rows
                    //     //     setAllTableData(prev => ({
                    //     //         ...prev,
                    //     //         [submodule]: (prev[submodule] || []).map(existingRow => {
                    //     //             const updatedRow = formattedModifiedRows.find(r => r.id === existingRow.id);
                    //     //             if (updatedRow) {
                    //     //                 const sanitizedRow = { id: updatedRow.id };
                    //     //                 fields.forEach(field => {
                    //     //                     sanitizedRow[field] = updatedRow[field] ?? '';
                    //     //                 });
                    //     //                 return sanitizedRow;
                    //     //             }
                    //     //             return existingRow;
                    //     //         })
                    //     //     }));
                    //     // }
                    // }

                    // Update tableData with server-assigned IDs
                    if (insertedRows.length > 0) {
                        setTableData(prev => {
                            let updatedRows = [...prev.rows];
                            const tempRows = updatedRows.filter(row => row.tempId);
                            updatedRows = updatedRows.filter(row => !row.tempId);

                            tempRows.forEach(tempRow => {
                                const serverRow = insertedRows.find(sr => {
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
                                    updatedRows.push(tempRow);
                                }
                            });
                            return { rows: updatedRows, modified: false };
                        });

                        // Update allTableData with new rows
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
                    } else {
                        // Just mark as not modified if no new rows were inserted
                        setTableData(prev => ({ ...prev, modified: false }));
                    }

                } catch (err) {
                    console.error('Save error:', err);
                    showErrorToast('Failed to save data.');
                    // Don't set modified to false on error - allow retry
                } finally {
                    setIsSaving(false);
                }
            }, 500),
        [tableData, submodule, currentUser?.name, fields, setAllTableData, isSaving]
    );

    const handleFiltersChange = useCallback((filters) => {
        setTableFilters(filters);
    }, []);
    useEffect(() => {
        const count = Object.values(tableFilters).filter(set => set && set.size > 0).length;
        setActiveFilterCount(count);
    }, [tableFilters]);
    const removeAllFilters = useCallback(async () => {
        if (Object.keys(tableFilters).length === 0) {
            toast.info('No filters to remove');
            return;
        }

        try {
            // Clear filters
            setTableFilters({});

            // Clear from server if user is logged in
            if (currentUser?.email && submodule) {
                await fetch(`${Server_url}/filter/saveFilters`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userEmail: currentUser.email,
                        tableName: submodule,
                        filters: {},
                        filteredRowCount: baseRows?.length || 0
                    })
                });
            }

            // toast.success('🧹 Removed all filters');
        } catch (error) {
            console.error('Error removing filters:', error);
            toast.error('Failed to remove filters from server');
        }
    }, [tableFilters, currentUser?.email, submodule, baseRows]);
    // Trigger autosave only if enabled
    useEffect(() => {
        if (isAutoSaveEnabled && tableData.modified) debouncedSave();
        return () => debouncedSave.cancel();
    }, [tableData, isAutoSaveEnabled, debouncedSave]);

    // Toggle fullscreen mode
    const toggleFullScreen = useCallback(async () => {
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
    }, []);

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
    }, [debouncedSave, toggleFullScreen]);

    // Socket.IO listeners (unchanged, but ensures no duplicates)
    useEffect(() => {
        socket.on('rowInserted', ({ tableName, rows }) => {
            if (tableName === submodule) {
                const sanitizedNewRows = rows.map(row => {
                    const sanitizedRow = { id: row.id };
                    fields.forEach(field => sanitizedRow[field] = row[field] ?? '');
                    if (row.created_date || row.created_at) {
                        const createdDate = row.created_date ||
                            (row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : null);
                        sanitizedRow.created_date = createdDate;
                    }
                    return sanitizedRow;
                });
                const relevantNewRows = isAdmin
                    ? sanitizedNewRows
                    : sanitizedNewRows.filter(r => r.RM === (currentUser?.name || ''));

                setTableData(prev => ({
                    rows: [...prev.rows.filter(row => !row.tempId),
                    ...relevantNewRows.filter(newRow => !prev.rows.some(existing => existing.id === newRow.id))],
                    modified: false,
                }));

                setAllTableData(prev => ({
                    ...prev,
                    [submodule]: [...(prev[submodule] || []).filter(row => row.id),
                    ...sanitizedNewRows.filter(newRow => !(prev[submodule] || [])?.some(existing => existing.id === newRow.id))],
                }));
            }
        });

        socket.on('rowUpdated', ({ tableName, data }) => {
            setAllTableData(prev => {
                // console.log("dtaaaaaaaaaaaaaaaaaa", tableName, data);

                return {
                    ...prev,
                    [submodule]: (prev[submodule] || []).map(row => {
                        if (row.id === data.rowId) {
                            const updatedRow = { ...row };
                            updatedRow[data.field] = data.value ?? '';
                            return updatedRow;
                        }

                        return row;
                    }),
                };
            });
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
    }, [submodule, fields, setAllTableData, isAdmin, currentUser?.name]);

    // Memoized handleInputChange to prevent unnecessary re-renders (now ID-based)
    const handleInputChange = useCallback((rowId, field, value) => {
        console.log("value of changing row ", rowId, field, value)
        setTableData(prev => {
            if (field === 'RM' && !unrestricted_adminEmails.includes(currentUser?.email) && value !== currentUser?.name) {
                showInfoToast('⚠️ You are not allowed to enter other RM data.');
                return prev;
            }

            const receivedDateField = fields.find(f => f.toLowerCase().includes('received') && f.toLowerCase().includes('date'));
            const proceedDateField = fields.find(f => f.toLowerCase().includes('proceed') && f.toLowerCase().includes('date'));

            // To validate dates, need to find current row
            const currentRow = prev.rows.find(r => r.id === rowId || r.tempId === rowId);
            if (receivedDateField && proceedDateField && currentRow) {
                const receivedDate = new Date(field === receivedDateField ? value : currentRow[receivedDateField]);
                const proceedDate = new Date(field === proceedDateField ? value : currentRow[proceedDateField]);
                if (proceedDate < receivedDate) {
                    showInfoToast('⚠️ Proceed Date must be greater than or equal to Received Date.');
                    return prev;
                }
            }

            const updatedRows = prev.rows.map(r =>
                (r.id === rowId || r.tempId === rowId) ? { ...r, [field]: value } : r
            );
            return { rows: updatedRows, modified: true };
        });
    }, [fields, currentUser?.email, currentUser?.name]);

    // FIXED: Memoized handleAddRow - now updates global allTableData with duplicate check only (no local setTableData; sync handles it)
    const handleAddRow = useCallback(async (options = {}) => {
        const { data, rmName, userEmail } = options;
        // console.log("📥 handleAddRow called with:", { rmName, optionIsAdmin, userEmail });

        const today = new Date().toISOString().split('T')[0];

        // Create new row data
        const newRowData = data || fields.reduce((acc, field) => {
            const lowerField = field.toLowerCase();

            if (
                (lowerField.includes('received') && lowerField.includes('date')) ||
                (lowerField.includes('proceed') && lowerField.includes('date')) ||
                (field === 'Date' && ['NSE_Pramesh', 'NSE_FFL', 'RV_NSE'].includes(submodule))
            ) {
                acc[field] = today;

            } else if (defaultZeroFields.includes(field)) {
                acc[field] = '0';

            } else if ((field === 'Captain' && submodule === "RV_Transaction") || field === 'RV_RM') {
                acc[field] = 'Prasad Parsekar';

            } else if (field === 'RM') {
                // ⭐ Use the RM name passed from useEffect
                acc[field] = rmName || "";

            } else {
                acc[field] = '';
            }

            return acc;
        }, {
            created_by: userEmail || currentUser?.email || 'Unknown'
        });

        // console.log("📤 Sending to INSERT route:", newRowData);

        try {
            // ⭐ Call INSERT route
            const res = await fetch(`${Server_url}/api/insertTableData`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableName: submodule,
                    entries: [newRowData]
                })
            });

            const result = await res.json();

            if (!res.ok) throw new Error(result.message || 'Insert failed');


            // ⭐ FIXED: Update global allTableData with sanitized row and duplicate ID check
            if (result.insertedRows && result.insertedRows.length > 0) {
                const insertedRow = result.insertedRows[0];
                const sanitizedRow = { id: insertedRow.id };
                fields.forEach(field => {
                    sanitizedRow[field] = insertedRow[field] ?? '';
                });

                setAllTableData(prev => {
                    const existing = (prev[submodule] || []).filter(r => r.id);
                    if (existing.some(r => r.id === sanitizedRow.id)) {
                        return prev; // Already exists (e.g., added via socket)
                    }
                    return {
                        ...prev,
                        [submodule]: [...existing, sanitizedRow]
                    };
                });

                // toast.success('✅ Row added successfully');
            }

        } catch (err) {
            console.error("❌ Insert failed:", err);
            toast.error("Failed to add row to database");
        }

    }, [fields, defaultZeroFields, submodule, currentUser, setAllTableData]);

    // Memoized handleDeleteRow to prevent unnecessary re-renders (now ID-based)
    const handleDeleteRow = useCallback((rowId) => {
        setDeleteConfirm({ visible: true, rowId });
    }, []);

    const confirmDeleteRow = useCallback(async () => {
        const { rowId } = deleteConfirm;

        if (typeof rowId === 'string' && rowId.startsWith('temp-')) {
            // Local temp row: remove immediately
            setTableData(prev => ({
                rows: prev.rows.filter(r => r.tempId !== rowId),
                modified: false,
            }));
            setDeleteConfirm({ visible: false, rowId: null });
            showSuccessToast('Row deleted successfully.');
            return;
        }

        if (!rowId) {
            setDeleteConfirm({ visible: false, rowId: null });
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
            setDeleteConfirm({ visible: false, rowId: null });
        }
    }, [deleteConfirm, submodule, currentUser?.name, setAllTableData]);

    // Memoized onSelectionChange to prevent unnecessary re-renders
    const handleSelectionChange = useCallback((selectedIds) => {
        setDeleteData(prev => ({
            ...prev,
            [submodule]: selectedIds,
        }));
    }, [setDeleteData, submodule]);

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
                    <div className="row-count">
                        {getRowCountDisplay()}
                    </div>
                    {activeFilterCount > 0 && (
                        <button
                            onClick={removeAllFilters}
                            className="remove-filters-btn"
                            title="Remove all filters"
                        >
                            <FaFilterCircleXmark className="filter-icon" />
                            {activeFilterCount}
                        </button>
                    )}
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
                submodule={submodule}
                selectedIds={deleteData[submodule] || []}
                onSelectionChange={handleSelectionChange}
                isFullScreen={isFullScreen}
                onCountChange={handleCountChange}
                userEmail={currentUser?.email}
                setAllTableData={setAllTableData}
                onFilterCountChange={setActiveFilterCount}
                externalFilters={tableFilters}
                onFiltersChange={handleFiltersChange}
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
                            <button onClick={() => setDeleteConfirm({ visible: false, rowId: null })} className="cancel-btn">Cancel</button>
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
                limit={5}
            />
        </div>
    );
}