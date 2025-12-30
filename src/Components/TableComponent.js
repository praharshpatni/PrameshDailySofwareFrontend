// TableComponent.js - Optimized with row virtualization for performance
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { FiCopy } from 'react-icons/fi';
import './Styles/TableComponent.css';
import { useDropdowns } from '../Contexts/DropdownContext';
import { AiOutlineArrowUp, AiOutlineArrowDown } from 'react-icons/ai';
import { BiSortAlt2 } from 'react-icons/bi';
import useFilteredRowsByRM from '../hooks/useFilteredRowsByRM';
import { toast } from 'react-toastify';
import { Server_url, emailToRMMap, unrestricted_adminEmails } from '../Urls/AllData';
import { MdCheckBox, MdCheckBoxOutlineBlank } from 'react-icons/md';
import EmptyTable from "./../Assets/EmptyTable.png"
export default function TableComponent({
    fields,
    rows,
    onAddRow,
    defaultZeroFields = [],
    submodule,
    selectedIds = [],
    onSelectionChange = () => { },
    isFullScreen,
    onCountChange = () => { },
    userEmail,
    setAllTableData,
    externalFilters = {},
    onFiltersChange = () => { }
}) {
    const [showGridBackground, setShowGridBackground] = useState(false);
    const { dropdownFields } = useDropdowns();
    const [sortConfig, setSortConfig] = useState({ field: null, direction: null });
    const { filteredRows: userFilteredRows, isUnrestricted } = useFilteredRowsByRM(rows);
    const [copiedIndex, setCopiedIndex] = useState(null);
    // Excel-like navigation state - Uses global indices in sortedRows
    const [focusedCell, setFocusedCell] = useState({ rowIndex: 0, colIndex: 0 });
    const [isEditing, setIsEditing] = useState(false);
    const inputRefs = useRef({});
    // Enhanced change tracking system
    const [editingValues, setEditingValues] = useState({});
    const [manuallyVisibleRows, setManuallyVisibleRows] = useState(new Set());
    const [editingReceivedDates, setEditingReceivedDates] = useState({});
    const lastSavedValuesRef = useRef({});
    // Undo/Redo stacks
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    // Virtualization state
    const [startIndex, setStartIndex] = useState(0);
    const [containerHeight, setContainerHeight] = useState(600);
    const rowHeight = 45;
    const overscan = 5;
    const tableWrapperRef = useRef(null);
    const sortedRowsRef = useRef([]);
    // Use external filters instead of local state
    const columnFilters = externalFilters;
    const [isLoadingFilters, setIsLoadingFilters] = useState(false);
    const [openFilterField, setOpenFilterField] = useState(null);
    const filterDropdownRef = useRef(null);
    const [filterSearch, setFilterSearch] = useState({});
    const currentUser = useSelector(state => state.user.currentUser);
    // for selecting the columns vertically
    const [selectionAnchor, setSelectionAnchor] = useState(null);
    const [selectionEnd, setSelectionEnd] = useState(null);
    const debounceRef = useRef({});
    const isLastRowFilled = rows.length === 0 || fields.some((f) => rows[rows.length - 1][f]);
    // Show checkbox column ONLY to unrestricted users (RMs who can see all + full admins)
    const hasCheckbox = isUnrestricted || unrestricted_adminEmails.includes(
        (currentUser?.email || '').trim().toLowerCase()
    );
    const totalCols = useMemo(() =>
        hasCheckbox ? fields.length + 2 : fields.length + 1,
        [hasCheckbox, fields.length]
    );
    const [justAddedRow, setJustAddedRow] = useState(false);
    const [pendingPasteData, setPendingPasteData] = useState(null);
    const historyKey = useMemo(() => `undoHistory_${(currentUser?.email || userEmail || '').trim().toLowerCase()}_${submodule}`, [currentUser?.email, userEmail, submodule]);
    const currentUserEmail = (currentUser?.email || userEmail || '').trim().toLowerCase();
    const currentRM = emailToRMMap[currentUserEmail];
    const isBhumika = (currentRM || '').toLowerCase() === 'bhumika'; const getInputRef = useCallback((rowIndex, colIndex) => {
        const inputKey = `${rowIndex}-${colIndex}`;
        return (el) => {
            inputRefs.current[inputKey] = el;
        };
    }, []);
    const cellRefs = useRef({});
    const getCellRef = useCallback((rowIndex, colIndex) => {
        const cellKey = `${rowIndex}-${colIndex}`;
        return (el) => {
            cellRefs.current[cellKey] = el;
        };
    }, []);
    // Helper to check if field is date
    const isDateField = useCallback((field) => {
        return field.toLowerCase().includes('date') &&
            !['mandate', 'mandate_mode', 'mandate_sf', 'red_indicators_update'].includes(field.toLowerCase());
    }, []);
    // Helper to check if field is amount-related
    const isAmountField = useCallback((field) => {
        return field.toLowerCase().includes('amount') || defaultZeroFields.includes(field);
    }, [defaultZeroFields]);
    const formatDate = (value) => {
        if (!value) return value;
        const d = new Date(value);
        if (isNaN(d)) return value;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };
    // NEW: Helper to check if field supports range selection (amount or folio_number)
    const isRangeSelectable = useCallback((field) => {
        return isAmountField(field) || field.toLowerCase().includes('folio_number');
    }, [isAmountField]);
    const parseDateForInput = (val) => {
        if (!val || val.toString().trim() === '') return '';
        const strVal = val.toString().trim();
        // Try to parse as Date first
        const date = new Date(strVal);
        if (!isNaN(date)) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        // Handle various date formats
        if (strVal.includes('-')) {
            const parts = strVal.split('-');
            if (parts.length === 3) {
                // Check format: yyyy-mm-dd
                if (parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
                    return strVal;
                }
                // Check format: dd-mm-yyyy
                if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }
        }
        // Handle dd/mm/yyyy or dd.mm.yyyy
        if (strVal.includes('/') || strVal.includes('.')) {
            const separator = strVal.includes('/') ? '/' : '.';
            const parts = strVal.split(separator);
            if (parts.length === 3) {
                // Try dd/mm/yyyy format
                if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
                // Try mm/dd/yyyy format (common in US)
                if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
                    // Try to parse as mm/dd/yyyy
                    const testDate = new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
                    if (!isNaN(testDate)) {
                        const year = testDate.getFullYear();
                        const month = String(testDate.getMonth() + 1).padStart(2, '0');
                        const day = String(testDate.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    }
                }
            }
        }
        // Try one more time with Date.parse
        const timestamp = Date.parse(strVal);
        if (!isNaN(timestamp)) {
            const finalDate = new Date(timestamp);
            const year = finalDate.getFullYear();
            const month = String(finalDate.getMonth() + 1).padStart(2, '0');
            const day = String(finalDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        // If all parsing fails, return empty string
        return '';
    };
    // Add this function to check if date is today
    const isToday = useCallback((dateString) => {
        if (!dateString) return false;
        try {
            const inputDate = new Date(dateString);
            const today = new Date();
            // Compare year, month, and date
            return inputDate.getDate() === today.getDate() &&
                inputDate.getMonth() === today.getMonth() &&
                inputDate.getFullYear() === today.getFullYear();
        } catch (error) {
            return false;
        }
    }, []);
    // Add this function to get row style based on Received_Date
    const getRowStyle = useCallback((row) => {
        const createdDate = row['created_date'];
        if (isToday(createdDate)) {
            return {
                backgroundColor: '#e8f5e9', // Light green background
                borderLeft: '4px solid #4caf50', // Green left border
                position: 'relative' // Add this for the green line
            };
        }
        return {};
    }, [isToday]);
    const isRowCreatedToday = useCallback((row) => {
        return isToday(row['created_date']);
    }, [isToday]);
    // Convert functions remain exactly the same
    function convertToSet(filters) {
        const result = {};
        for (const key in filters) {
            result[key] = new Set(filters[key]);
        }
        return result;
    }
    function convertToArray(filters) {
        const result = {};
        for (const [field, filterSet] of Object.entries(filters)) {
            if (filterSet && filterSet.size > 0) {
                result[field] = Array.from(filterSet);
            }
        }
        return result;
    }
    // Optimized filtering logic with manual visibility tracking
    const filteredByColumnFilters = useMemo(() => {
        if (!userFilteredRows || Object.keys(columnFilters).length === 0) {
            return userFilteredRows || [];
        }
        const filterEntries = Object.entries(columnFilters).filter(([_, s]) => s && s.size > 0);
        if (filterEntries.length === 0) {
            return userFilteredRows;
        }
        // Build rowId to row map for fast lookup (unchanged)
        const rowIdToRow = new Map();
        userFilteredRows.forEach((r, index) => {
            const rowId = r.id || r.tempId || index;
            rowIdToRow.set(rowId, r);
        });
        // This preserves original order from userFilteredRows; no appending needed
        const allVisibleRows = userFilteredRows.filter((r) => {
            const rowId = r.id || r.tempId || userFilteredRows.indexOf(r); // Fallback index if no ID
            // Always include if manually visible (e.g., during edit)
            if (manuallyVisibleRows.has(rowId)) {
                return true;
            }
            // Otherwise, check if matches ALL active filters
            for (const [field, selectedSet] of filterEntries) {
                const cell = r[field];
                const value = cell == null ? '' : String(cell);
                const normalizedValue = value.trim().toLowerCase();
                const normalizedSelectedSet = new Set(
                    Array.from(selectedSet).map(s => String(s).trim().toLowerCase())
                );
                if (!normalizedSelectedSet.has(normalizedValue)) {
                    return false; // Doesn't match this filter
                }
            }
            return true; // Matches all filters
        });
        return allVisibleRows;
    }, [userFilteredRows, columnFilters, manuallyVisibleRows]);
    // Auto-clear filters if they result in no data
    useEffect(() => {
        const hasActiveFilters = Object.keys(columnFilters).some(
            key => columnFilters[key] && columnFilters[key].size > 0
        );
        if (filteredByColumnFilters.length === 0 && userFilteredRows.length > 0 && hasActiveFilters) {
            // toast.info('No results found. Clearing filter to show all data.');
            onFiltersChange({});
        }
    }, [filteredByColumnFilters.length, userFilteredRows.length, columnFilters, onFiltersChange]);
    // Mark row as manually visible when user starts editing
    const markRowAsVisible = useCallback((rowId) => {
        setManuallyVisibleRows(prev => {
            const newSet = new Set(prev);
            newSet.add(rowId);
            return newSet;
        });
    }, []);
    // Clear manual visibility when filters change significantly
    const clearManualVisibility = useCallback(() => {
        setManuallyVisibleRows(new Set());
    }, []);
    // Reset startIndex on filter changes
    useEffect(() => {
        setStartIndex(0);
        const timeoutId = setTimeout(() => {
            clearManualVisibility();
        }, 1000);
        setEditingReceivedDates({});
        return () => clearTimeout(timeoutId);
    }, [columnFilters, clearManualVisibility]);
    useEffect(() => {
        return () => {
            toast.dismiss(); // Dismiss all open toasts
        };
    }, []);
    // Load undo/redo history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(historyKey);
        if (saved) {
            try {
                const { undo, redo } = JSON.parse(saved);
                setUndoStack(undo || []);
                setRedoStack(redo || []);
            } catch (e) {
                console.error('Failed to load undo/redo history');
            }
        }
    }, [historyKey]);
    // Save undo/redo history to localStorage
    useEffect(() => {
        localStorage.setItem(historyKey, JSON.stringify({ undo: undoStack, redo: redoStack }));
    }, [historyKey, undoStack, redoStack]);
    // Undo handler
    const handleUndo = useCallback(() => {
        setUndoStack((prev) => {
            if (prev.length === 0) return prev;
            const newStack = prev.slice(0, -1);
            const action = prev[prev.length - 1];
            const currentValue = rows.find((r) => (r.id || r.tempId) === action.rowId)?.[action.field];
            setAllTableData((prevData) => ({
                ...prevData,
                [submodule]: prevData[submodule].map((r) =>
                    (r.id || r.tempId) === action.rowId ? { ...r, [action.field]: action.restoreValue } : r
                ),
            }));
            setRedoStack((prevRedo) => [
                ...prevRedo,
                { rowId: action.rowId, field: action.field, restoreValue: currentValue },
            ]);
            markRowAsVisible(action.rowId);
            return newStack;
        });
    }, [rows, setAllTableData, submodule, markRowAsVisible]);
    // Redo handler
    const handleRedo = useCallback(() => {
        setRedoStack((prev) => {
            if (prev.length === 0) return prev;
            const newStack = prev.slice(0, -1);
            const action = prev[prev.length - 1];
            const currentValue = rows.find((r) => (r.id || r.tempId) === action.rowId)?.[action.field];
            setAllTableData((prevData) => ({
                ...prevData,
                [submodule]: prevData[submodule].map((r) =>
                    (r.id || r.tempId) === action.rowId ? { ...r, [action.field]: action.restoreValue } : r
                ),
            }));
            setUndoStack((prevUndo) => [
                ...prevUndo,
                { rowId: action.rowId, field: action.field, restoreValue: currentValue },
            ]);
            markRowAsVisible(action.rowId);
            return newStack;
        });
    }, [rows, setAllTableData, submodule, markRowAsVisible]);
    // Enhanced input change handler with visibility tracking
    const handleInputChange = useCallback((rowId, field, value) => {
        const row = rows.find(r => (r.id || r.tempId) === rowId);
        // Check for row disabled condition
        const isRowDisabled = !isUnrestricted && ['RV_Transaction', 'Transaction', 'FFL_Transaction'].includes(submodule) && row?.['tr_Status'] === 'Success';
        if (isRowDisabled) {
            toast.warning('Row is completed and cannot be edited.');
            return;
        }
        const cellKey = `${rowId}-${field}`;
        if (field === "Proceed_Date") {
            const received = row?.Received_Date;
            if (received && value) {
                const d1 = new Date(received);
                const d2 = new Date(value);
                if (d2 < d1) {
                    toast.error("❌ Proceed Date cannot be earlier than Receive Date");
                    return; // STOP update completely
                }
            }
        }
        if (!row) return;
        const oldValue = row[field];
        const isAmountFieldLocal = field.toLowerCase().includes('amount') || defaultZeroFields.includes(field);
        const finalValue = (isAmountFieldLocal && (value === '' || value == null)) ? null : value;
        // Mark row as manually visible when user starts editing
        markRowAsVisible(rowId);
        if (oldValue !== finalValue) {
            const action = {
                rowId,
                field,
                restoreValue: oldValue,
                timestamp: Date.now(),
                table: submodule,
                user: currentUser?.email || userEmail || "unknown"
            };
            setUndoStack((prev) => {
                const newStack = [...prev, action];
                return newStack.length > 50 ? newStack.slice(-50) : newStack;
            });
            setRedoStack([]);
        }

        // EXISTING LOGIC - NO CHANGES
        setEditingValues(prev => ({ ...prev, [cellKey]: finalValue }));
        // Immediate local update
        setAllTableData(prev => ({
            ...prev,
            [submodule]: prev[submodule].map(r =>
                (r.id || r.tempId) === rowId
                    ? { ...r, [field]: finalValue }
                    : r
            )
        }));
        if (debounceRef.current[cellKey]) {
            clearTimeout(debounceRef.current[cellKey]);
        }
        debounceRef.current[cellKey] = setTimeout(async () => {
            try {
                const change = {
                    rowId,
                    field,
                    value: finalValue,
                    timestamp: Date.now(),
                    user: currentUser?.email || "unknown",
                    submodule,
                };
                const res = await fetch(`${Server_url}/api/updateTableData`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tableName: submodule, data: change }),
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.message || "Failed to update");
                lastSavedValuesRef.current[cellKey] = finalValue;
            } catch (err) {
                console.error("Update failed", err);
                // Revert local state on failure
                setAllTableData(prev => ({
                    ...prev,
                    [submodule]: prev[submodule].map(r =>
                        (r.id || r.tempId) === rowId
                            ? { ...r, [field]: oldValue }
                            : r
                    )
                }));
                // Remove from undo stack if it matches the last action
                setUndoStack(prevUndo => {
                    if (prevUndo.length > 0) {
                        const lastAction = prevUndo[prevUndo.length - 1];
                        if (lastAction.rowId === rowId && lastAction.field === field && lastAction.restoreValue === oldValue) {
                            return prevUndo.slice(0, -1);
                        }
                    }
                    return prevUndo;
                });
                try {
                    toast.error("Failed to save");
                } catch (toastErr) {
                    console.warn("Toast failed:", toastErr);
                }
            }
        }, 400);
    }, [submodule, currentUser, setAllTableData, markRowAsVisible, rows, defaultZeroFields, isUnrestricted, userEmail]);
    // Enhanced focus handler to mark row as visible
    const handleFocus = useCallback((rowId, field) => {
        const cellKey = `${rowId}-${field}`;
        // Mark row as visible when user focuses on any cell in the row
        markRowAsVisible(rowId);
        // EXISTING LOGIC - NO CHANGES
        if (!editingValues[cellKey]) {
            setEditingValues(prev => ({ ...prev, [cellKey]: rows.find(r => (r.id || r.tempId) === rowId)?.[field] ?? '' }));
        }
        if (field === 'Received_Date') {
            const row = rows.find(r => (r.id || r.tempId) === rowId);
            if (row) {
                setEditingReceivedDates(prev => ({ ...prev, [rowId]: row.Received_Date }));
            }
        }
    }, [editingValues, rows, markRowAsVisible]);
    // EXISTING BLUR HANDLER - NO CHANGES
    const handleBlur = useCallback((rowId, field, value) => {
        const cellKey = `${rowId}-${field}`;
        setTimeout(() => {
            setEditingValues(prev => {
                const newPrev = { ...prev };
                delete newPrev[cellKey];
                return newPrev;
            });
            // UPDATED: Only exit editing mode, keep cell focused (don't null focusedCell)
            setIsEditing(false);
        }, 100);
    }, []);

    // Helper function for date comparison (empties last, direction-aware for non-empties)
    const compareDates = useCallback((dateA_raw, dateB_raw, dir = 1) => {
        const hasA = dateA_raw != null && dateA_raw !== '';
        const hasB = dateB_raw != null && dateB_raw !== '';
        let dateCompare;
        if (!hasA && !hasB) dateCompare = 0;
        else if (!hasA) dateCompare = 1; // empty goes last
        else if (!hasB) dateCompare = -1; // other empty goes last
        else {
            const dateA = new Date(dateA_raw);
            const dateB = new Date(dateB_raw);
            dateCompare = (dateA - dateB) * dir;
        }
        return dateCompare;
    }, []);

    // Helper to get value, handling editing for Received_Date
    const getFieldValue = useCallback((row, field) => {
        if (field === 'Received_Date') {
            const rowId = row.id || row.tempId;
            return editingReceivedDates[rowId] || row[field];
        }
        return row[field];
    }, [editingReceivedDates]);

    // Helper function for general comparison (handles empties last, direction-aware)
    const compareValues = useCallback((valA, valB, dir = 1) => {
        const hasA = valA != null && valA !== '';
        const hasB = valB != null && valB !== '';
        if (!hasA && !hasB) return 0;
        if (!hasA) return dir > 0 ? 1 : -1; // empty goes last (adjust for dir)
        if (!hasB) return dir > 0 ? -1 : 1;

        // Both non-empty: numeric first, then string
        const na = Number(valA), nb = Number(valB);
        if (!isNaN(na) && !isNaN(nb)) {
            return (na - nb) * dir;
        }
        return String(valA).localeCompare(String(valB)) * dir;
    }, []);

    // Fallback comparator (hardcoded multi-level sort)
    const fallbackComparator = useCallback((a, b) => {
        let dateField = 'Received_Date';
        if (submodule === 'RV_NSE') {
            dateField = 'Date';
        }
        const dateA_raw = getFieldValue(a, dateField);
        const dateB_raw = getFieldValue(b, dateField);

        // First compare dates (ascending - newest first, empties last)
        let dateCompare = compareDates(dateA_raw, dateB_raw, 1); // DESC for newest first
        if (dateCompare !== 0) return dateCompare;

        // If dates equal, fallback to stable ID (or extend with other fields if needed)
        const idA = a.id || a.tempId || 0;
        const idB = b.id || b.tempId || 0;
        return idA - idB;
    }, [getFieldValue, compareDates, submodule]);

    // Update the sortedRows useMemo to include secondary sorting by Online_Offline when no filters are active
    const sortedRows = useMemo(() => {
        let base = filteredByColumnFilters || [];
        base = [...base].sort((a, b) => {
            let cmp = 0;
            if (sortConfig.field) {
                const dir = sortConfig.direction === 'desc' ? -1 : 1;
                const valA = getFieldValue(a, sortConfig.field);
                const valB = getFieldValue(b, sortConfig.field);
                if (isDateField(sortConfig.field)) {
                    cmp = compareDates(valA, valB, dir); // Empties last
                } else {
                    cmp = compareValues(valA, valB, dir); // Empties last for non-dates
                }
                if (cmp !== 0) return cmp;
            }
            // Fallback to hardcoded multi-level sort
            return fallbackComparator(a, b);
        });
        return base;
    }, [filteredByColumnFilters, sortConfig, getFieldValue, compareDates, fallbackComparator, isDateField, compareValues]);
    const focusColumnFirstCell = useCallback((colIndex) => {
        if (sortedRows.length > 0) {
            // Set focus to the first row (index 0) of the specified column
            setFocusedCell({ rowIndex: 0, colIndex });
            setIsEditing(false);
            // Scroll to top if not already visible
            setTimeout(() => {
                if (tableWrapperRef.current) {
                    const rowTop = 0; // First row
                    const { scrollTop } = tableWrapperRef.current;
                    const visibleTop = scrollTop;
                    if (rowTop < visibleTop) {
                        tableWrapperRef.current.scrollTop = 0;
                    }
                }
            }, 50);
        }
    }, [sortedRows.length]);
    // Select whole column
    const selectWholeColumn = useCallback((colIndex) => {
        if (sortedRows.length === 0) return;
        setSelectionAnchor({ rowIndex: 0, colIndex });
        setSelectionEnd({ rowIndex: sortedRows.length - 1, colIndex });
        focusColumnFirstCell(colIndex);
    }, [sortedRows.length, focusColumnFirstCell]);
    useEffect(() => {
        if (justAddedRow && sortedRows.length > 0) {
            const newRowIndex = sortedRows.length - 1;
            const newRow = sortedRows[newRowIndex];
            if (newRow) {
                const newRowId = newRow.id || newRow.tempId;
                markRowAsVisible(newRowId);
                setFocusedCell({ rowIndex: newRowIndex, colIndex: 0 });
            }
            setJustAddedRow(false);
        }
    }, [sortedRows, justAddedRow, markRowAsVisible]);
    // Update ref for sortedRows
    useEffect(() => {
        sortedRowsRef.current = sortedRows;
    }, [sortedRows]);
    // Virtualization: compute viewport row count
    const viewportRowCount = useMemo(() =>
        Math.ceil(containerHeight / rowHeight) + (overscan * 2),
        [containerHeight]
    );
    // Virtualization: visible rows slice
    const visibleRows = useMemo(() => {
        const endIndex = Math.min(startIndex + viewportRowCount, sortedRows.length);
        return sortedRows.slice(startIndex, endIndex);
    }, [sortedRows, startIndex, viewportRowCount]);
    // Virtualization: handle scroll to update startIndex
    const handleScroll = useCallback((e) => {
        const { scrollTop } = e.target;
        const newStartIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
        setStartIndex(newStartIndex);
    }, [rowHeight, overscan]);
    useEffect(() => {
        const handleScroll = () => {
            if (tableWrapperRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = tableWrapperRef.current;
                // Show grid when scrolled beyond content or when no data
                const shouldShowGrid = scrollTop + clientHeight < scrollHeight - 100 || sortedRows.length === 0;
                setShowGridBackground(shouldShowGrid);
            }
        };
        const tableWrapper = tableWrapperRef.current;
        if (tableWrapper) {
            tableWrapper.addEventListener('scroll', handleScroll);
            // Initial check
            handleScroll();
        }
        return () => {
            if (tableWrapper) {
                tableWrapper.removeEventListener('scroll', handleScroll);
            }
        };
    }, [sortedRows.length]);
    // Container height measurement
    useEffect(() => {
        const updateHeight = () => {
            if (tableWrapperRef.current) {
                setContainerHeight(tableWrapperRef.current.clientHeight);
            }
        };
        updateHeight();
        const resizeObserver = new ResizeObserver(updateHeight);
        if (tableWrapperRef.current) {
            resizeObserver.observe(tableWrapperRef.current);
        }
        return () => resizeObserver.disconnect();
    }, []);
    // Excel-like navigation: move cell (global indices)
    const moveCell = useCallback((direction, enterEdit = false, clearValue = false) => {
        setFocusedCell(prev => {
            let newRowIndex = prev.rowIndex;
            let newColIndex = prev.colIndex;
            const maxRow = sortedRows.length - 1;
            const maxCol = fields.length - 1;
            switch (direction) {
                case 'up':
                    newRowIndex = Math.max(0, prev.rowIndex - 1);
                    break;
                case 'down':
                    newRowIndex = Math.min(maxRow, prev.rowIndex + 1);
                    break;
                case 'left':
                    if (prev.colIndex > 0) {
                        newColIndex = prev.colIndex - 1;
                    } else if (prev.rowIndex > 0) {
                        newRowIndex = prev.rowIndex - 1;
                        newColIndex = maxCol;
                    }
                    break;
                case 'right':
                    if (prev.colIndex < maxCol) {
                        newColIndex = prev.colIndex + 1;
                    } else if (prev.rowIndex < maxRow) {
                        newRowIndex = prev.rowIndex + 1;
                        newColIndex = 0;
                    }
                    break;
                default:
                    console.warn(`Unknown navigation direction: "${direction}". Valid directions are: "up", "down", "left", "right"`);
                    return prev;
            }
            // NEW: If entering edit, set state and optionally clear value for new cell
            if (enterEdit) {
                setIsEditing(true);
                const newRow = sortedRows[newRowIndex];
                if (newRow) {
                    const newRowId = newRow.id || newRow.tempId;
                    const newField = fields[newColIndex];
                    const newCellKey = `${newRowId}-${newField}`;
                    if (clearValue) {
                        setEditingValues(prev => ({ ...prev, [newCellKey]: '' })); // Clear for Tab
                    } else {
                        // Load value if not editing (for double-click/end cursor)
                        const cellValue = newRow[newField] ?? '';
                        if (!prev[newCellKey]) {
                            setEditingValues(prev => ({ ...prev, [newCellKey]: cellValue }));
                        }
                    }
                }
            }
            return { rowIndex: newRowIndex, colIndex: newColIndex };
        });
    }, [sortedRows, fields, setIsEditing, setEditingValues]);
    // Handle focus change: scroll to row if not in viewport, then focus input or cell
    useEffect(() => {
        const timer = setTimeout(() => {
            // Scroll to row if not in viewport
            if (tableWrapperRef.current && sortedRows.length > 0) {
                const rowTop = focusedCell.rowIndex * rowHeight;
                const rowBottom = rowTop + rowHeight;
                const { clientHeight, scrollTop } = tableWrapperRef.current;
                const visibleTop = scrollTop;
                const visibleBottom = scrollTop + clientHeight;
                if (rowTop < visibleTop || rowBottom > visibleBottom) {
                    const scrollTo = rowTop - (clientHeight / 2) + (rowHeight / 2);
                    tableWrapperRef.current.scrollTop = Math.max(0, scrollTo);
                }
            }
            // Focus cell or input after frame
            requestAnimationFrame(() => {
                const key = `${focusedCell.rowIndex}-${focusedCell.colIndex}`;
                const cellEl = cellRefs.current[key];
                if (cellEl) {
                    cellEl.focus();
                }
                if (isEditing) {
                    const inputEl = inputRefs.current[key];
                    if (inputEl) {
                        inputEl.focus();
                        // UPDATED: Place cursor at end for INPUTs, but skip date/number
                        if (inputEl.tagName === 'INPUT' &&
                            !['date', 'number'].includes(inputEl.type)) {
                            const valLength = inputEl.value.length;
                            inputEl.setSelectionRange(valLength, valLength);
                        }
                    }
                }
            });
        }, 50);
        return () => clearTimeout(timer);
    }, [focusedCell, isEditing, rowHeight, sortedRows.length]);
    // NEW: Handle single click - just focus the cell without editing
    const handleCellClick = useCallback((actualRowIndex, colIndex) => {
        const row = sortedRows[actualRowIndex];
        if (!row) return;
        const rowId = row.id || row.tempId;
        markRowAsVisible(rowId);
        // Start a new selection
        setSelectionAnchor({ rowIndex: actualRowIndex, colIndex });
        setSelectionEnd({ rowIndex: actualRowIndex, colIndex });
        setFocusedCell({ rowIndex: actualRowIndex, colIndex });
        setIsEditing(false);
    }, [sortedRows, markRowAsVisible]);
    // NEW: Handle double click for editing
    const handleDoubleClick = useCallback((actualRowIndex, colIndex) => {
        const row = sortedRows[actualRowIndex];
        if (!row) return;
        // Check for row disabled condition
        const isRowDisabled = !isUnrestricted && ['RV_Transaction', 'Transaction', 'FFL_Transaction'].includes(submodule) && row['tr_Status'] === 'Success';
        if (isRowDisabled) {
            toast.warning('Row is completed and cannot be edited.');
            return;
        }
        const field = fields[colIndex];
        if (!isUnrestricted && field.toLowerCase().includes('rm')) return;
        const rowId = row.id || row.tempId;
        markRowAsVisible(rowId);
        setFocusedCell({ rowIndex: actualRowIndex, colIndex });
        setIsEditing(true);
        // Value load/cursor handled in moveCell (but since no move, focus effect uses end cursor)
    }, [isUnrestricted, sortedRows, markRowAsVisible, fields, submodule]);
    // Helper function to detect RM field
    const detectRMField = useCallback((fields) => {
        const rmFieldPatterns = [
            'rm', 'relationship manager', 'rm name', 'manager',
            'sub_rm', 'sub_rm_ii', 'sub_rm_iii'
        ];
        return fields.find(field =>
            rmFieldPatterns.some(pattern =>
                field.toLowerCase().includes(pattern.toLowerCase())
            )
        );
    }, []);
    // Helper function to set user tracking fields
    const setUserTrackingFields = useCallback((rowId, userEmailLocal) => {
        const trackingFields = {
            'created_by': userEmailLocal,
            'created_by_user': userEmailLocal,
            'modified_by': userEmailLocal,
            'updated_by': userEmailLocal
        };
        Object.entries(trackingFields).forEach(([field, value]) => {
            if (fields.includes(field)) {
                handleInputChange(rowId, field, value);
            }
        });
    }, [fields, handleInputChange]);
    const processPaste = useCallback((lines, startRowIndex, startField, numAvailable) => {
        const updatedSortedRows = sortedRowsRef.current;
        // Recompute locals for new rows handling
        const currentRM = (emailToRMMap?.[currentUser?.email] || '').trim();
        const isAdmin = unrestricted_adminEmails.includes((currentUser?.email || '').toLowerCase());
        const isRMUser = !isAdmin && currentRM;
        const rmField = detectRMField(fields);
        const userEmailLocal = currentUser?.email || 'Unknown';
        for (let rowOffset = 0; rowOffset < lines.length; rowOffset++) {
            const targetRowIndex = startRowIndex + rowOffset;
            const targetRow = updatedSortedRows[targetRowIndex];
            if (!targetRow) {
                console.warn(`Paste skipped for offset ${rowOffset}: row not found`);
                continue;
            }
            // Check for row disabled condition
            const isRowDisabled = !isUnrestricted && ['RV_Transaction', 'Transaction', 'FFL_Transaction'].includes(submodule) && targetRow['tr_Status'] === 'Success';
            if (isRowDisabled) {
                continue;
            }
            const rowId = targetRow.id || targetRow.tempId;
            markRowAsVisible(rowId);
            const cols = lines[rowOffset];
            // Process each pasted column starting from startField
            cols.forEach((value, colOffset) => {
                const fieldIndex = fields.indexOf(startField) + colOffset;
                if (fieldIndex >= 0 && fieldIndex < fields.length) {
                    const targetField = fields[fieldIndex];
                    let newValue = (value || '').trim(); // Trim here as in example
                    // Improved date handling: Always attempt robust parsing for paste (standardize to YYYY-MM-DD if valid date)
                    if (isDateField(targetField)) {
                        const trimmedValue = newValue; // Already trimmed
                        if (trimmedValue) {
                            // First, try the existing parser
                            let parsed = parseDateForInput(trimmedValue);
                            if (!parsed) {
                                // Fallback: Attempt Date constructor for flexible formats (e.g., "December 08, 2025")
                                const date = new Date(trimmedValue);
                                if (!isNaN(date.getTime())) {
                                    const year = date.getFullYear();
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const day = String(date.getDate()).padStart(2, '0');
                                    parsed = `${year}-${month}-${day}`;
                                }
                            }
                            newValue = parsed || '';
                        } else {
                            newValue = '';
                        }
                    }
                    if (newValue !== '') {
                        // Prevent pasting into RM fields for non-unrestricted users
                        if (isUnrestricted || !targetField.toLowerCase().includes('rm')) {
                            // Check for Proceed_Date vs Received_Date validation
                            if (targetField === "Proceed_Date") {
                                const receivedDate = targetRow['Received_Date'];
                                if (receivedDate && newValue) {
                                    const d1 = new Date(receivedDate);
                                    const d2 = new Date(newValue);
                                    if (d2 < d1) {
                                        toast.error("❌ Proceed Date cannot be earlier than Receive Date");
                                        return; // Skip this specific field update
                                    }
                                }
                            }
                            handleInputChange(rowId, targetField, newValue);
                        }
                    }
                }
            });
            // For newly added rows only: auto-set RM and user tracking
            if (rowOffset >= numAvailable) {
                if (isRMUser && rmField) {
                    const currentValue = targetRow[rmField] || '';
                    if (!currentValue.trim()) {
                        handleInputChange(rowId, rmField, currentRM);
                    }
                }
                setUserTrackingFields(rowId, userEmailLocal);
            }
        }
        // Scroll to pasted area if needed
        const pastedEndIndex = startRowIndex + lines.length - 1;
        if (tableWrapperRef.current && pastedEndIndex > 0) {
            const scrollTo = Math.max(0, pastedEndIndex * rowHeight - (containerHeight / 2) + rowHeight / 2);
            tableWrapperRef.current.scrollTop = scrollTo;
        }
        toast.success(`✅ Pasted ${lines.length} row(s) successfully`);
    }, [sortedRowsRef, fields, isUnrestricted, currentUser?.email, handleInputChange, markRowAsVisible, rowHeight, containerHeight, isDateField, detectRMField, setUserTrackingFields, submodule, tableWrapperRef]);

    // Enhanced handlePaste with improved date handling
    const handlePaste = useCallback((e, startRowIndex, startField) => {
        const clipboardData = e.clipboardData || window.clipboardData;
        const pastedText = clipboardData.getData('Text');
        // Split by lines and tabs, filtering out empty lines (logic from example: no pre-trim on cells, trim only for check and value)
        const lines = pastedText
            .split(/\r?\n/)
            .map(line => line.split('\t'))
            .filter(line => line.length > 0 && line.some(v => v.trim() !== ''));
        if (lines.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        // Use sortedRows for targeting
        const numAvailable = sortedRows.length - startRowIndex;
        const rowsToAdd = Math.max(0, lines.length - numAvailable);
        // User context
        const currentRM = (emailToRMMap?.[currentUser?.email] || '').trim();
        const isAdmin = unrestricted_adminEmails.includes((currentUser?.email || '').toLowerCase());
        const isRMUser = !isAdmin && currentRM;
        const userEmailLocal = currentUser?.email || 'Unknown';
        // Add rows if needed
        for (let i = 0; i < rowsToAdd; i++) {
            if (isRMUser) {
                onAddRow({
                    rmName: currentRM,
                    isAdmin: false,
                    userEmail: userEmailLocal
                });
            } else {
                onAddRow();
            }
        }
        if (rowsToAdd > 0) {
            setPendingPasteData({
                lines,
                startRowIndex,
                startField,
                numAvailable,
                expectedLength: sortedRows.length + rowsToAdd
            });
        } else {
            processPaste(lines, startRowIndex, startField, numAvailable);
        }
    }, [sortedRows.length, currentUser?.email, onAddRow, processPaste]);

    useEffect(() => {
        if (pendingPasteData && sortedRows.length === pendingPasteData.expectedLength) {
            processPaste(pendingPasteData.lines, pendingPasteData.startRowIndex, pendingPasteData.startField, pendingPasteData.numAvailable);
            setPendingPasteData(null);
        }
    }, [sortedRows.length, pendingPasteData, processPaste]);
    // NEW: Handle paste on cell (for single-click paste)
    const handleCellPaste = useCallback((e, rowIndex, colIndex) => {
        // Prevent default if we're going to handle it
        e.preventDefault();
        e.stopPropagation();
        const field = fields[colIndex];
        const row = sortedRows[rowIndex];
        // Check row disabled condition
        const isRowDisabled = !isUnrestricted && ['RV_Transaction', 'Transaction', 'FFL_Transaction'].includes(submodule) && row['tr_Status'] === 'Success';
        if (isRowDisabled) {
            toast.warning('Row is completed and cannot be edited.');
            return;
        }
        // Check RM field restriction
        if (!isUnrestricted && field.toLowerCase().includes('rm')) {
            toast.warning('You do not have permission to edit RM fields');
            return;
        }
        // Call the main paste handler
        handlePaste(e, rowIndex, field);
    }, [fields, isUnrestricted, handlePaste, sortedRows, submodule]);
    // Clear manual visibility when submodule changes
    useEffect(() => {
        clearManualVisibility();
        setFocusedCell({ rowIndex: 0, colIndex: 0 });
        setIsEditing(false);
        setStartIndex(0);
    }, [submodule, clearManualVisibility]);
    // Clear manual visibility when opening/closing filter dropdowns
    useEffect(() => {
        setOpenFilterField(null);
        setFilterSearch({});
        clearManualVisibility();
    }, [submodule, clearManualVisibility]);
    // Visual indicator for manually visible rows
    const getRowClassName = useCallback((row, actualIndex) => {
        const rowId = row.id || row.tempId || actualIndex;
        if (manuallyVisibleRows.has(rowId)) {
            return 'manually-visible-row';
        }
        return '';
    }, [manuallyVisibleRows]);
    // Load filters from server
    const loadFiltersFromServer = useCallback(async () => {
        if (!userEmail || !submodule) return;
        setIsLoadingFilters(true);
        try {
            const response = await fetch(
                `${Server_url}/filter/getFilters?userEmail=${encodeURIComponent(userEmail)}&tableName=${encodeURIComponent(submodule)}`
            );
            if (response.ok) {
                const data = await response.json();
                const serverFilters = data.filters || {};
                const parsed = convertToSet(serverFilters);
                onFiltersChange(parsed);
                // console.log('✅ Loaded filters from server:', Object.keys(serverFilters).length, 'columns');
            } else {
                console.warn('Failed to load filters from server, starting fresh');
                onFiltersChange({});
            }
        } catch (error) {
            // console.error('Error loading filters from server:', error);
            // toast.error('Failed to load saved filters');
            onFiltersChange({});
        } finally {
            setIsLoadingFilters(false);
        }
    }, [userEmail, submodule, onFiltersChange]);
    const saveFiltersToServer = useCallback(async (filters) => {
        if (!userEmail || !submodule) return;
        try {
            const serialFilters = convertToArray(filters);
            const filteredRowCount = sortedRows ? sortedRows.length : 0;
            const response = await fetch(`${Server_url}/filter/saveFilters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userEmail,
                    tableName: submodule,
                    filters: serialFilters,
                    filteredRowCount
                })
            });
            if (response.ok) {
                console.log('✅ Filters saved to server');
            } else {
                throw new Error('Failed to save filters');
            }
        } catch (error) {
            console.error('Error saving filters to server:', error);
            toast.error('Failed to save filters to server');
            throw error;
        }
    }, [userEmail, submodule, sortedRows]);
    useEffect(() => {
        loadFiltersFromServer();
    }, [loadFiltersFromServer]);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                openFilterField &&
                filterDropdownRef.current &&
                !filterDropdownRef.current.contains(e.target)
            ) {
                setOpenFilterField(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openFilterField]);
    const toggleFilterDropdown = (field, colIndex) => {
        setOpenFilterField((prev) => {
            const next = prev === field ? null : field;
            if (next) {
                setFilterSearch((s) => ({ ...s, [field]: s[field] ?? '' }));
                focusColumnFirstCell(colIndex);
            }
            return next;
        });
    };
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (Object.keys(columnFilters).length > 0 || Object.keys(convertToArray(columnFilters)).length === 0) {
                saveFiltersToServer(columnFilters).catch(() => { });
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [columnFilters, saveFiltersToServer]);
    useEffect(() => {
        onCountChange(sortedRows.length);
    }, [sortedRows.length, onCountChange]);
    const handleSort = (field) => {
        setSortConfig((prev) =>
            prev.field === field
                ? { field, direction: prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc' }
                : { field, direction: 'asc' }
        );
        setStartIndex(0);
    };
    const statusOptionsBySubmodule = {
        STP_Switch: ['Success', 'Rejected', 'In Progress', 'Pending'],
        Non_Financial: ['Success', 'Rejected', 'In Progress', 'Pending'],
    };
    const getDropdownOptions = (field) => {
        if (field === 'Status' && (submodule === 'STP_Switch' || submodule === 'Non_Financial')) {
            return statusOptionsBySubmodule[submodule];
        }
        if (field === 'Sub_RM' && submodule === 'RV_Transaction') return dropdownFields['Sub_RM'] || [];
        if (field === 'Sub_RM_ii' && submodule === 'RV_Transaction') return dropdownFields['Sub_RM_ii'] || [];
        if (field === 'Sub_RM_iii' && submodule === 'RV_Transaction') return dropdownFields['Sub_RM_iii'] || [];
        return dropdownFields[field];
    };
    // Initialize last saved values
    useEffect(() => {
        const initialValues = {};
        rows.forEach(row => {
            const rowId = row.id || row.tempId;
            fields.forEach(field => {
                const key = `${rowId}-${field}`;
                initialValues[key] = row[field] ?? '';
            });
        });
        lastSavedValuesRef.current = initialValues;
    }, [rows, fields]);
    const importantFields = [
        'Name', 'DOB', 'AMC', 'PAN', 'Mobile', 'Email Address', 'Remark_1',
        'Approach_By', 'Scheme_Type', 'Scheme', 'Sub_RM', 'Sub_RM_ii', 'Sub_RM_iii',
    ];
    const handleCopy = (text, rowIndex, field) => {
        const copiedKey = `${rowIndex}-${field}`;
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text ?? '').then(() => {
                setCopiedIndex(copiedKey);
                setTimeout(() => setCopiedIndex(null), 1500);
            }).catch(() => fallbackCopyTextToClipboard(text ?? '', copiedKey));
        } else {
            fallbackCopyTextToClipboard(text ?? '', copiedKey);
        }
    };
    const fallbackCopyTextToClipboard = (text, copiedKey) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            if (document.execCommand('copy')) {
                setCopiedIndex(copiedKey);
                setTimeout(() => setCopiedIndex(null), 1500);
            }
        } catch { }
        document.body.removeChild(textArea);
    };
    const toggleRowSelection = (rowId) => {
        onSelectionChange(
            selectedIds.includes(rowId)
                ? selectedIds.filter((id) => id !== rowId)
                : [...selectedIds, rowId]
        );
    };
    const getStatusClass = (field, value) => {
        if (field !== 'Status' && field !== 'Modification') return '';
        const normalized = value?.toLowerCase();
        return {
            validate: `${field.toLowerCase()}-validate`,
            registered: `${field.toLowerCase()}-registered`,
            rejected: `${field.toLowerCase()}-rejected`,
            pending: `${field.toLowerCase()}-pending`,
            hold: `${field.toLowerCase()}-hold`,
            'under process': `${field.toLowerCase()}-process`,
            'not available': `${field.toLowerCase()}-na`,
        }[normalized] || '';
    };
    // Filter functions
    const toggleFilterValue = (field, originalValue) => {
        const updatedFilters = { ...columnFilters };
        const existing = new Set(updatedFilters[field] ? Array.from(updatedFilters[field]) : []);
        const normalizedIncoming = String(originalValue).trim().toLowerCase();
        let foundMatch = false;
        let matchedOriginalValue = null;
        for (const existingValue of existing) {
            if (String(existingValue).trim().toLowerCase() === normalizedIncoming) {
                foundMatch = true;
                matchedOriginalValue = existingValue;
                break;
            }
        }
        if (foundMatch) {
            existing.delete(matchedOriginalValue);
        } else {
            existing.add(String(originalValue));
        }
        updatedFilters[field] = existing.size > 0 ? existing : null;
        onFiltersChange(updatedFilters);
        setStartIndex(0);
    };
    const setFilterAll = (field, valuesArray) => {
        const updatedFilters = { ...columnFilters };
        updatedFilters[field] = new Set(valuesArray.map((v) => String(v)));
        onFiltersChange(updatedFilters);
        setStartIndex(0);
    };
    const clearFilterForField = (field) => {
        const updatedFilters = { ...columnFilters };
        delete updatedFilters[field];
        onFiltersChange(updatedFilters);
        setStartIndex(0);
    };
    const isValueSelected = (field, value) => {
        const s = columnFilters[field];
        if (!s) return false;
        const normalizedValue = String(value).trim().toLowerCase();
        const normalizedSelectedSet = new Set(
            Array.from(s).map(item => String(item).trim().toLowerCase())
        );
        return normalizedSelectedSet.has(normalizedValue);
    };
    // Enhanced getDistinctValuesForColumn with date sorting
    const getDistinctValuesForColumn = useCallback((column) => {
        let baseRows = userFilteredRows || [];
        const filterEntries = Object.entries(columnFilters)
            .filter(([f]) => f !== column)
            .filter(([_, s]) => s && s.size > 0);
        if (filterEntries.length > 0) {
            baseRows = baseRows.filter((r) => {
                for (const [field, selectedSet] of filterEntries) {
                    const cell = r[field];
                    const value = cell == null ? '' : String(cell);
                    const normalizedValue = value.trim().toLowerCase();
                    const normalizedSelectedSet = new Set(
                        Array.from(selectedSet).map(s => String(s).trim().toLowerCase())
                    );
                    if (!normalizedSelectedSet.has(normalizedValue)) return false;
                }
                return true;
            });
        }
        const normalizedMap = new Map();
        for (const r of baseRows) {
            const originalValue = r[column] == null ? '' : String(r[column]);
            const normalizedValue = originalValue.trim().toLowerCase();
            if (!normalizedMap.has(normalizedValue)) {
                normalizedMap.set(normalizedValue, originalValue);
            }
        }
        const arr = Array.from(normalizedMap.values());
        // Special sorting for date fields
        if (isDateField(column)) {
            return arr.sort((a, b) => {
                if (!a || a === '') return 1;
                if (!b || b === '') return -1;
                const dateA = new Date(a);
                const dateB = new Date(b);
                if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) {
                    return String(a).localeCompare(String(b));
                }
                if (isNaN(dateA.getTime())) return 1;
                if (isNaN(dateB.getTime())) return -1;
                return dateA.getTime() - dateB.getTime(); // Earliest first (ascending)
            });
        }
        // Default sorting for non-date fields
        return arr.sort((a, b) => {
            const aN = Number(a), bN = Number(b);
            if (!isNaN(aN) && !isNaN(bN)) return aN - bN;
            return String(a).localeCompare(String(b));
        });
    }, [userFilteredRows, columnFilters, isDateField]);
    // Enhanced formatDisplayValue for better date formatting
    const formatDisplayValue = (field, val) => {
        if (val === '' || val === null || val === undefined) return;
        const isDateFieldLocal = isDateField(field);
        if (isDateFieldLocal) {
            return formatDate(val);
        }
        return String(val);
    };
    // TableComponent.js - Add these helper functions at the top of your component
    // Helper function to normalize date formats for searching
    const normalizeDateForSearch = (dateString) => {
        if (!dateString) return '';
        const str = String(dateString).trim();
        // Try to parse as Date first
        const date = new Date(str);
        if (!isNaN(date)) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${day}-${month}-${year}`; // Return in DD-MM-YYYY format
        }
        // Handle various date formats
        if (str.includes('-')) {
            const parts = str.split('-');
            if (parts.length === 3) {
                // Check format: yyyy-mm-dd -> convert to dd-mm-yyyy
                if (parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
                // Check format: dd-mm-yyyy (already correct)
                if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                    return str;
                }
                // Check format: mm-dd-yyyy -> convert to dd-mm-yyyy
                if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                    const testDate = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
                    if (!isNaN(testDate)) {
                        const day = String(testDate.getDate()).padStart(2, '0');
                        const month = String(testDate.getMonth() + 1).padStart(2, '0');
                        const year = testDate.getFullYear();
                        return `${day}-${month}-${year}`;
                    }
                }
            }
        }
        // Handle dd/mm/yyyy or dd.mm.yyyy
        if (str.includes('/') || str.includes('.')) {
            const separator = str.includes('/') ? '/' : '.';
            const parts = str.split(separator);
            if (parts.length === 3) {
                // Try dd/mm/yyyy format
                if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                    return `${parts[0]}-${parts[1]}-${parts[2]}`;
                }
                // Try mm/dd/yyyy format
                if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
                    const testDate = new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
                    if (!isNaN(testDate)) {
                        const day = String(testDate.getDate()).padStart(2, '0');
                        const month = String(testDate.getMonth() + 1).padStart(2, '0');
                        const year = testDate.getFullYear();
                        return `${day}-${month}-${year}`;
                    }
                }
            }
        }
        // Return as-is if no pattern matches
        return str;
    };
    // Helper function to check if a value matches the search term (with date normalization)
    const doesValueMatchSearch = (rawValue, searchTerm, field) => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.trim().toLowerCase();
        const rawString = String(rawValue === '' || rawValue === null || rawValue === undefined ? '(blank)' : rawValue);
        // For date fields, try normalized comparison
        if (isDateField(field)) {
            // Normalize both the search term and the value for comparison
            const normalizedSearch = normalizeDateForSearch(searchTerm).toLowerCase();
            const normalizedValue = normalizeDateForSearch(rawString).toLowerCase();
            // Check if normalized values match
            if (normalizedValue.includes(normalizedSearch) || normalizedSearch.includes(normalizedValue)) {
                return true;
            }
            // Also check raw string match
            if (rawString.toLowerCase().includes(searchLower)) {
                return true;
            }
            // Try to format the raw value for display and check
            const displayValue = formatDate(rawString).toLowerCase();
            if (displayValue.includes(searchLower)) {
                return true;
            }
            return false;
        }
        // For non-date fields, do simple string matching
        return rawString.toLowerCase().includes(searchLower);
    };
    const noDataMessage = useMemo(() => {
        return userFilteredRows.length === 0
            ? 'No data available for your RM access.'
            : 'No rows match the current filters. Adjust filters in the header to see data.';
    }, [userFilteredRows.length]);
    // Add table-level paste handler
    useEffect(() => {
        const handleTablePaste = (e) => {
            // Don't handle paste if we're in an input/textarea or contenteditable
            const target = e.target;
            const tag = target.tagName.toLowerCase();
            // const type = target.type || '';
            // If paste is happening in an input, textarea, or contenteditable, let it happen naturally
            if (tag === 'input' || tag === 'textarea' || target.isContentEditable) {
                return;
            }
            // Check if we have a focused cell
            if (sortedRows.length === 0 || focusedCell.rowIndex < 0 || focusedCell.colIndex < 0) {
                return;
            }
            const row = sortedRows[focusedCell.rowIndex];
            const field = fields[focusedCell.colIndex];
            if (!row || !field) {
                return;
            }
            // Check row disabled condition
            const isRowDisabled = !isUnrestricted && ['RV_Transaction', 'Transaction', 'FFL_Transaction'].includes(submodule) && row['tr_Status'] === 'Success';
            if (isRowDisabled) {
                toast.warning('Row is completed and cannot be edited.');
                return;
            }
            // Check RM field restriction for non-unrestricted users
            if (!isUnrestricted && field.toLowerCase().includes('rm')) {
                toast.warning('You do not have permission to edit RM fields');
                return;
            }
            // Get clipboard data
            const clipboardData = e.clipboardData || window.clipboardData;
            const pastedText = clipboardData.getData('Text');
            if (!pastedText.trim()) {
                return;
            }
            // Parse the pasted data
            const lines = pastedText
                .split(/\r?\n/)
                .map(line => line.split('\t'))
                .filter(line => line.length > 0 && line.some(v => v.trim() !== ''));
            if (lines.length === 0) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            // Call the paste handler
            handlePaste(e, focusedCell.rowIndex, field);
        };
        // Add paste event listener to the table wrapper
        const tableWrapper = tableWrapperRef.current;
        if (tableWrapper) {
            tableWrapper.addEventListener('paste', handleTablePaste);
        }
        return () => {
            if (tableWrapper) {
                tableWrapper.removeEventListener('paste', handleTablePaste);
            }
        };
    }, [sortedRows, focusedCell, fields, isUnrestricted, handlePaste, submodule]);
    // Safe selected range (prevents crash when sortedRows is not ready)
    const getSelectedRange = useCallback(() => {
        if (!selectionAnchor || !selectionEnd || !sortedRows || sortedRows.length === 0) {
            return { rows: [], field: null, count: 0 };
        }
        const startRow = Math.min(selectionAnchor.rowIndex, selectionEnd.rowIndex);
        const endRow = Math.max(selectionAnchor.rowIndex, selectionEnd.rowIndex);
        const colIndex = selectionAnchor.colIndex; // single-column selection only
        return {
            rows: sortedRows.slice(startRow, endRow + 1),
            field: fields[colIndex],
            count: endRow - startRow + 1,
        };
    }, [selectionAnchor, selectionEnd, sortedRows, fields]);
    // Excel-like keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            const target = e.target;
            const tag = target.tagName.toLowerCase();
            const type = target.type || '';
            const className = target.className || '';

            if (
                target.closest('.chatComponent_main') ||                    // Entire chat window
                target.closest('.input_area') ||                           // Chat input area
                target.classList.contains('message_input_textarea') ||     // Direct match
                (tag === 'textarea' && className.includes('message_input')) ||
                (tag === 'input' && !target.closest('.data-table'))        // Any input outside table
            ) {
                return;
            }
            // Handle Undo/Redo globally (before other checks)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
                e.preventDefault();
                handleRedo();
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                let textToCopy;
                if (selectionAnchor && selectionEnd) {
                    const range = getSelectedRange();
                    if (range.count > 0) {
                        textToCopy = range.rows.map(row => String(row[range.field] || '')).join('\n');
                        toast.success(`Copied ${range.count} value(s) to clipboard`);
                    } else {
                        return;
                    }
                } else if (sortedRows.length > 0) {
                    const row = sortedRows[focusedCell.rowIndex];
                    const field = fields[focusedCell.colIndex];
                    if (row && field) {
                        textToCopy = String(row[field] || '');
                        toast.success('Copied value to clipboard');
                    } else {
                        return;
                    }
                } else {
                    return;
                }
                if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(textToCopy);
                } else {
                    const textArea = document.createElement('textarea');
                    textArea.value = textToCopy;
                    textArea.style.position = 'fixed';
                    textArea.style.top = '0';
                    textArea.style.left = '0';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                }
                return;
            }
            // Allow arrow keys and Tab for all elements (for accessibility)
            const isNavigationKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key);
            // If it's a form element and not a navigation key, don't handle it
            if (['input', 'select', 'textarea'].includes(tag) && !isNavigationKey) {
                return;
            }
            // If it's contenteditable and not a navigation key, don't handle it
            if (target.isContentEditable && !isNavigationKey) {
                return;
            }
            // Don't interfere with filter dropdown search
            if (tag === 'input' && (type === 'text' || type === 'search') &&
                (className.includes('filter-search-input') ||
                    className.includes('search-bar'))) {
                return;
            }
            // Handle Ctrl+Enter for adding new row (existing functionality)
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                const canAddRow = isUnrestricted || isLastRowFilled;
                if (canAddRow) {
                    setJustAddedRow(true);
                    const currentRM = (emailToRMMap?.[currentUser?.email] || '').trim();
                    const isAdmin = unrestricted_adminEmails.includes((currentUser?.email || '').toLowerCase());
                    onAddRow({
                        rmName: !isAdmin && currentRM ? currentRM : "",
                        isAdmin: isAdmin,
                        userEmail: currentUser?.email || 'Unknown'
                    });
                } else {
                    toast.warn('⚠️ Fill the last row before adding a new one.');
                }
                return;
            }
            // Handle Ctrl+V for paste (will be caught by table-level paste handler)
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                // Let the paste event handle it naturally
                return;
            }
            if (isEditing) {
                // If editing, only handle Escape and Enter
                if (e.key === 'Escape') {
                    setIsEditing(false);
                    e.preventDefault();
                } else if (e.key === 'Enter' && !e.shiftKey) {
                    setIsEditing(false);
                    moveCell('down');
                    e.preventDefault();
                } else if (e.key === 'Tab') {
                    setIsEditing(false); // Exit edit before moving
                    e.shiftKey ? moveCell('left') : moveCell('right');
                    e.preventDefault();
                }
                return;
            }
            // Navigation keys when not editing
            switch (e.key) {
                case 'ArrowUp':
                case 'ArrowDown': {
                    if (e.shiftKey && (e.ctrlKey || e.metaKey)) {
                        // Ctrl+Shift+Up/Down → Excel-style column range selection
                        e.preventDefault();
                        const direction = e.key === 'ArrowUp' ? -1 : 1;
                        const newRow = Math.max(0, Math.min(sortedRows.length - 1, focusedCell.rowIndex + direction));
                        setSelectionEnd(prev => ({ ...prev, rowIndex: newRow }));
                        setFocusedCell(prev => ({ ...prev, rowIndex: newRow }));
                    } else if (e.shiftKey) {
                        // Normal Shift+Arrow → extend selection one cell at a time
                        e.preventDefault();
                        moveCell(e.key === 'ArrowUp' ? 'up' : 'down');
                        setSelectionEnd(focusedCell);
                    } else {
                        // Normal navigation
                        e.preventDefault();
                        moveCell(e.key === 'ArrowUp' ? 'up' : 'down');
                    }
                    break;
                }
                case 'ArrowLeft':
                    moveCell('left');
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    moveCell('right');
                    e.preventDefault();
                    break;
                case 'Tab':
                    // UPDATED: Move/focus only—no auto-edit or clear
                    e.shiftKey ? moveCell('left') : moveCell('right');
                    e.preventDefault();
                    break;
                case 'Enter':
                case 'F2':
                case ' ':
                    // Check for row disabled condition
                    if (sortedRows.length > 0) {
                        const row = sortedRows[focusedCell.rowIndex];
                        const isRowDisabled = !isUnrestricted && ['RV_Transaction', 'Transaction', 'FFL_Transaction'].includes(submodule) && row['tr_Status'] === 'Success';
                        if (isRowDisabled) {
                            toast.warning('Row is completed and cannot be edited.');
                            break;
                        }
                    }
                    // Check for RM field restriction
                    if (!isUnrestricted) {
                        const field = fields[focusedCell.colIndex];
                        if (field.toLowerCase().includes('rm')) {
                            break; // Don't enter edit mode
                        }
                    }
                    setIsEditing(true);
                    e.preventDefault();
                    break;
                case 'Delete':
                    // Check for row disabled condition
                    if (sortedRows.length > 0) {
                        const row = sortedRows[focusedCell.rowIndex];
                        const isRowDisabled = !isUnrestricted && ['RV_Transaction', 'Transaction', 'FFL_Transaction'].includes(submodule) && row['tr_Status'] === 'Success';
                        if (isRowDisabled) {
                            toast.warning('Row is completed and cannot be edited.');
                            break;
                        }
                    }
                    // Delete cell content
                    if (isUnrestricted && focusedCell.rowIndex < sortedRows.length) {
                        const row = sortedRowsRef.current[focusedCell.rowIndex];
                        if (row) {
                            const rowId = row.id || row.tempId;
                            const field = fields[focusedCell.colIndex];
                            handleInputChange(rowId, field, '');
                        }
                        e.preventDefault();
                    }
                    break;
                default:
                    // NEW: Auto-enter edit and insert printable key (letters, numbers, space, symbols)
                    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                        // Check for row disabled condition
                        if (sortedRows.length > 0) {
                            const row = sortedRows[focusedCell.rowIndex];
                            const isRowDisabled = !isUnrestricted && ['RV_Transaction', 'Transaction', 'FFL_Transaction'].includes(submodule) && row['tr_Status'] === 'Success';
                            if (isRowDisabled) {
                                toast.warning('Row is completed and cannot be edited.');
                                break;
                            }
                        }
                        // Check for RM field restriction
                        if (!isUnrestricted) {
                            const field = fields[focusedCell.colIndex];
                            if (field.toLowerCase().includes('rm')) {
                                break; // Don't enter edit mode
                            }
                        }
                        const row = sortedRowsRef.current[focusedCell.rowIndex];
                        if (row) {
                            const rowId = row.id || row.tempId;
                            const field = fields[focusedCell.colIndex];
                            const cellKey = `${rowId}-${field}`;
                            setIsEditing(true);
                            // Overwrite with pressed key (cursor at end via focus effect)
                            setEditingValues(prev => ({ ...prev, [cellKey]: e.key }));
                        }
                        e.preventDefault(); // Prevent default until input focuses
                    }
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEditing, focusedCell, fields, isUnrestricted, isLastRowFilled, sortedRows, sortedRows.length, sortedRowsRef, onAddRow, currentUser?.email, moveCell, handleInputChange, submodule, handleUndo, handleRedo, getSelectedRange, selectionAnchor, selectionEnd]);

    // Compute sum safely
    const selectedSum = useMemo(() => {
        const range = getSelectedRange();
        if (range.count === 0 || !range.field) return null;
        return range.rows.reduce((sum, row) => {
            const val = row[range.field];
            const num = parseFloat(val);
            return sum + (isNaN(num) ? 0 : num);
        }, 0);
    }, [getSelectedRange]);
    const showSumBar = useMemo(() => {
        const range = getSelectedRange();
        return range.count >= 2 && selectedSum !== null && isAmountField(range.field);
    }, [getSelectedRange, selectedSum, isAmountField]);
    return (
        <>
            {(submodule === 'RV_Transaction' || submodule === 'RV_NSE' || submodule === 'RV_Non_Financial' || submodule === 'RV_STP_Switch') && !isBhumika && !unrestricted_adminEmails ? (
                <div className="no-access-message">
                    <p>You do not have access to the Real Value table.</p>
                </div>
            ) : (
                <div className="table_main_con">
                    <div
                        className={`table-wrapper ${isFullScreen ? 'fullscreen-mode' : ''} ${showGridBackground ? 'show-grid-background' : ''}`}
                        ref={tableWrapperRef}
                        onScroll={handleScroll}
                    >
                        {showGridBackground && sortedRows.length > 0 && (
                            <div className="empty-scroll-area"></div>
                        )}
                        {isLoadingFilters && (
                            <div className="loading-filters">
                                <div className="loading-spinner"></div>
                                <p>Loading your saved filters...</p>
                                <p className="loading-subtext">This ensures a personalized view tailored just for you.</p>
                            </div>
                        )}
                        {sortedRows.length === 0 ? (
                            <div className="no-data-container">
                                <img
                                    src={EmptyTable}
                                    alt="No Data"
                                    className="no-data-image"
                                />
                                <p>{noDataMessage}</p>
                            </div>
                        ) : (
                            <>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            {hasCheckbox && (
                                                <th data-label="checkbox">
                                                    <input
                                                        type="checkbox"
                                                        onChange={(e) =>
                                                            onSelectionChange(
                                                                e.target.checked
                                                                    ? sortedRows.map((r) => r.id || r.tempId)
                                                                    : []
                                                            )
                                                        }
                                                        checked={
                                                            selectedIds.length > 0 &&
                                                            sortedRows.length > 0 &&
                                                            sortedRows.every((r) => selectedIds.includes(r.id || r.tempId))
                                                        }
                                                    />
                                                </th>
                                            )}
                                            <th data-label="index">Index</th>
                                            {fields.map((f, i) => {
                                                const activeCount = columnFilters[f]?.size || 0;
                                                const headerFiltered = activeCount > 0;
                                                const isFocusedColumn = focusedCell.colIndex === i;
                                                return (
                                                    <th
                                                        key={i}
                                                        className={`fieldsName filter-header ${headerFiltered ? 'filtered-column' : ''} ${isFocusedColumn ? 'focused-column-header' : ''}`}
                                                        data-field={f}
                                                    >
                                                        <div className="header-content">
                                                            <span
                                                                className="header-title"
                                                                style={{ cursor: 'pointer' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    selectWholeColumn(i);
                                                                }}
                                                            >
                                                                {f}
                                                            </span>
                                                            {headerFiltered && (
                                                                <span className="filter-badge" title={`${activeCount} filter${activeCount > 1 ? 's' : ''} applied`}>
                                                                    {activeCount}
                                                                </span>
                                                            )}
                                                            {(importantFields.includes(f) || isDateField(f)) && (
                                                                <button className="sort-btn" onClick={() => handleSort(f)} title="Sort">
                                                                    {sortConfig.field === f ? (
                                                                        sortConfig.direction === 'asc' ? <AiOutlineArrowUp /> :
                                                                            sortConfig.direction === 'desc' ? <AiOutlineArrowDown /> :
                                                                                <BiSortAlt2 />
                                                                    ) : (
                                                                        <BiSortAlt2 />
                                                                    )}
                                                                </button>
                                                            )}
                                                            <div className="filter-btn-wrapper">
                                                                <button
                                                                    className={`filter-btn ${headerFiltered ? 'filter-btn-active' : ''}`}
                                                                    title="Filter"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleFilterDropdown(f, i);
                                                                        focusColumnFirstCell(i);
                                                                    }}
                                                                >
                                                                    ⋯
                                                                </button>
                                                                {openFilterField === f && (
                                                                    <div
                                                                        className="filter-dropdown"
                                                                        ref={filterDropdownRef}
                                                                        onClick={(e) => e.stopPropagation()}

                                                                    >
                                                                        <div className="filter-search-wrap">
                                                                            <input
                                                                                type="text"
                                                                                className="filter-search-input"
                                                                                placeholder={isDateField(f) ? "Search dates (e.g., 23-10-2025 or 2025-10-23)..." : "Search values…"}
                                                                                value={filterSearch[f] ?? ''}
                                                                                onChange={(e) =>
                                                                                    setFilterSearch((s) => ({ ...s, [f]: e.target.value }))
                                                                                }
                                                                                style={{ width: "100%" }}
                                                                            />
                                                                        </div>
                                                                        <div className="filter-dropdown-actions">
                                                                            <button
                                                                                className="small-btn"
                                                                                onClick={() => {
                                                                                    const allValues = getDistinctValuesForColumn(f);
                                                                                    const term = (filterSearch[f] ?? '').trim().toLowerCase();
                                                                                    const toSelect = term
                                                                                        ? allValues.filter((v) => {
                                                                                            // Use enhanced matching for date fields
                                                                                            if (isDateField(f)) {
                                                                                                return doesValueMatchSearch(v, term, f);
                                                                                            }
                                                                                            return (v === '' ? '(blank)' : String(v)).toLowerCase().includes(term);
                                                                                        })
                                                                                        : allValues;
                                                                                    setFilterAll(f, toSelect);
                                                                                }}
                                                                            >
                                                                                Select All Matches
                                                                            </button>
                                                                            <button
                                                                                className="small-btn"
                                                                                onClick={() => {
                                                                                    setFilterSearch((s) => ({ ...s, [f]: '' }));
                                                                                    clearFilterForField(f);
                                                                                }}
                                                                            >
                                                                                Clear
                                                                            </button>
                                                                        </div>
                                                                        <div className="filter-values-list" role="list">
                                                                            {(() => {
                                                                                const distinct = getDistinctValuesForColumn(f);
                                                                                const term = (filterSearch[f] ?? '').trim();
                                                                                const filtered = term
                                                                                    ? distinct.filter((val) => {
                                                                                        // Use enhanced matching for date fields
                                                                                        if (isDateField(f)) {
                                                                                            return doesValueMatchSearch(val, term, f);
                                                                                        }
                                                                                        return (val === '' ? '(blank)' : String(val))
                                                                                            .toLowerCase()
                                                                                            .includes(term.toLowerCase());
                                                                                    })
                                                                                    : distinct;
                                                                                if (!filtered || filtered.length === 0) {
                                                                                    return (
                                                                                        <div className="no-values">
                                                                                            {term ? `No matches for "${term}"` : 'No values available'}
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                                return filtered.map((val, idx) => {
                                                                                    const display = formatDisplayValue(f, val);
                                                                                    const checked = isValueSelected(f, val);
                                                                                    return (
                                                                                        <label
                                                                                            className="filter-value-item"
                                                                                            key={`${val}-${idx}`}
                                                                                            title={isDateField(f) ? `Raw: ${val}` : ''}
                                                                                        >
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={checked}
                                                                                                onChange={() => toggleFilterValue(f, val)}
                                                                                            />
                                                                                            <span className="value-label">
                                                                                                {display}
                                                                                                {isDateField(f) && val && val !== '' && (
                                                                                                    <span className="date-format-hint">
                                                                                                        ({normalizeDateForSearch(val)})
                                                                                                    </span>
                                                                                                )}
                                                                                            </span>
                                                                                        </label>
                                                                                    );
                                                                                });
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {startIndex > 0 && (
                                            <tr style={{ height: `${startIndex * rowHeight}px` }}>
                                                <td
                                                    colSpan={totalCols}
                                                    style={{ padding: 0, border: 'none', height: '100%' }}
                                                    className="virtualization-placeholder"
                                                />
                                            </tr>
                                        )}
                                        {visibleRows.map((row, localRi) => {
                                            const actualRowIndex = startIndex + localRi;
                                            const rowId = row.id || row.tempId;
                                            // Check for row disabled condition
                                            const isRowDisabled = !isUnrestricted && ['RV_Transaction', 'Transaction', 'FFL_Transaction'].includes(submodule) && row['TR_Status'] === 'Success';
                                            const rowClassName = `${getRowClassName(row, actualRowIndex)} ${isRowDisabled ? 'disabled-row' : ''} ${isRowCreatedToday(row) ? 'today-created-row' : ''}`; return (
                                                <tr
                                                    key={rowId || actualRowIndex}
                                                    className={rowClassName}
                                                    style={getRowStyle(row)}
                                                >
                                                    {hasCheckbox && (
                                                        <td>
                                                            <div
                                                                className="custom-checkbox-wrapper"
                                                                onClick={() => toggleRowSelection(rowId)}
                                                                style={{ cursor: 'pointer', display: 'inline-block' }}
                                                            >
                                                                {selectedIds.includes(rowId) ? (
                                                                    <MdCheckBox className="checkbox-icon" />
                                                                ) : (
                                                                    <MdCheckBoxOutlineBlank className="checkbox-icon" />
                                                                )}
                                                                {/* Hidden input for form submission/accessibility */}
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedIds.includes(rowId)}
                                                                    onChange={() => { }} // Empty onChange; handled by wrapper
                                                                    style={{ display: 'none' }}
                                                                />
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td data-label="index">{actualRowIndex + 1}</td>
                                                    {fields.map((field, fi) => {
                                                        const cellKey = `${rowId}-${field}`;
                                                        const editingValue = editingValues[cellKey];
                                                        const rawValue = row[field] ?? '';
                                                        const displayVal = formatDisplayValue(field, rawValue);
                                                        const inputVal = editingValue !== undefined ? editingValue : rawValue;
                                                        const inputDateVal = isDateField(field) ? parseDateForInput(inputVal) : inputVal;
                                                        const isCellFocused = focusedCell.rowIndex === actualRowIndex && focusedCell.colIndex === fi;
                                                        const isCurrentlyEditing = isEditing && isCellFocused; // Simplified: reuse isCellFocused
                                                        const isImportant = importantFields.includes(field);
                                                        const copiedKey = `${actualRowIndex}-${field}`;
                                                        const isNumericField = defaultZeroFields.includes(field);
                                                        const aboveRowIndex = actualRowIndex - 1;
                                                        const handleCopyDown = (e) => {
                                                            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                                                                // Check for row disabled condition
                                                                if (isRowDisabled) {
                                                                    toast.warning('Row is completed and cannot be edited.');
                                                                    return;
                                                                }
                                                                e.preventDefault();
                                                                if (aboveRowIndex >= 0 && sortedRows[aboveRowIndex]) {
                                                                    const aboveRow = sortedRows[aboveRowIndex];
                                                                    const valueAbove = aboveRow[field];
                                                                    if (valueAbove !== undefined && valueAbove !== null && valueAbove !== '') {
                                                                        handleInputChange(rowId, field, valueAbove);
                                                                        // toast.info('📋 Copied value from above row.');
                                                                    } else {
                                                                        toast.warn('⚠️ No value above to copy.');
                                                                    }
                                                                }
                                                            }
                                                        };
                                                        const handleFocusCallback = () => {
                                                            handleFocus(rowId, field);
                                                        };
                                                        const handleBlurCallback = (e) => {
                                                            handleBlur(rowId, field, e.target.value);
                                                        };
                                                        const inputOnChange = (e) => {
                                                            let value = e.target.value;
                                                            handleInputChange(rowId, field, value);
                                                        };
                                                        const isRMField = field.toLowerCase().includes('rm');
                                                        const isEditable = isUnrestricted || (!isRMField && !isRowDisabled);
                                                        return (
                                                            <td
                                                                key={fi}
                                                                ref={getCellRef(actualRowIndex, fi)}
                                                                tabIndex={isCellFocused && !isCurrentlyEditing ? 0 : -1}
                                                                className={`field-cell
                                                                        ${isCellFocused ? 'focused-cell' : ''}
                                                                        ${isCurrentlyEditing ? 'editing-cell' : ''}
                                                                        ${selectionAnchor &&
                                                                        selectionEnd &&
                                                                        selectionAnchor.colIndex === selectionEnd.colIndex &&
                                                                        selectionAnchor.colIndex === fi &&
                                                                        actualRowIndex >= Math.min(selectionAnchor.rowIndex, selectionEnd.rowIndex) &&
                                                                        actualRowIndex <= Math.max(selectionAnchor.rowIndex, selectionEnd.rowIndex) &&
                                                                        isRangeSelectable(field)
                                                                        ? 'selected-range-cell'
                                                                        : ''
                                                                    } ${isRowDisabled ? 'disabled-cell' : ''}`}
                                                                onClick={() => handleCellClick(actualRowIndex, fi)}
                                                                onDoubleClick={() => handleDoubleClick(actualRowIndex, fi)}
                                                                onKeyDown={handleCopyDown}
                                                                onFocus={() => markRowAsVisible(rowId)}
                                                                onPaste={(e) => handleCellPaste(e, actualRowIndex, fi)} // Add this line
                                                            >
                                                                <div className="input-wrapper">
                                                                    {isCurrentlyEditing ? (
                                                                        getDropdownOptions(field) ? (
                                                                            <select
                                                                                disabled={!isEditable}
                                                                                value={inputVal}
                                                                                data-row={rowId}
                                                                                data-field={field}
                                                                                title={inputVal}
                                                                                onFocus={handleFocusCallback}
                                                                                onBlur={handleBlurCallback}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                onChange={inputOnChange}
                                                                                ref={getInputRef(actualRowIndex, fi)}
                                                                                className={`copy-input ${getStatusClass(field, inputVal)} editing`}
                                                                            >
                                                                                <option value="">Select</option>
                                                                                {getDropdownOptions(field)?.map((option, index) => (
                                                                                    <option key={index} value={option}>
                                                                                        {option}
                                                                                    </option>
                                                                                ))}
                                                                                {inputVal && !getDropdownOptions(field)?.includes(inputVal) && (
                                                                                    <option value={inputVal} className="deleted-option">
                                                                                        Deleted: {inputVal}
                                                                                    </option>
                                                                                )}
                                                                            </select>
                                                                        ) : (
                                                                            <input
                                                                                type={isNumericField ? 'number' : isDateField(field) ? 'date' : 'text'}
                                                                                min={isNumericField ? '0' : undefined}
                                                                                disabled={!isEditable}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                ref={getInputRef(actualRowIndex, fi)}
                                                                                value={isDateField(field) ? inputDateVal : inputVal}
                                                                                data-row={rowId}
                                                                                data-field={field}
                                                                                title={inputVal}
                                                                                onFocus={handleFocusCallback}
                                                                                onBlur={handleBlurCallback}
                                                                                onChange={inputOnChange}
                                                                                onPaste={(e) => handlePaste(e, actualRowIndex, field)}
                                                                                className="copy-input custom-date editing"
                                                                            />
                                                                        )
                                                                    ) : (
                                                                        <div
                                                                            className={`display-input ${getStatusClass(field, rawValue)}`}
                                                                            title={displayVal}
                                                                        >
                                                                            {displayVal || ''}
                                                                        </div>
                                                                    )}
                                                                    {isImportant && (
                                                                        <div className="copy-container">
                                                                            <button
                                                                                className="copy-btn"
                                                                                onClick={() => handleCopy(rawValue, actualRowIndex, field)}
                                                                            >
                                                                                <FiCopy />
                                                                            </button>
                                                                            {copiedIndex === copiedKey && <span className="copied-text">Copied!</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                        {(startIndex + visibleRows?.length < sortedRows?.length) && (
                                            <tr style={{ height: `${(sortedRows?.length - (startIndex + visibleRows?.length)) * rowHeight}px` }} className="virtualization-placeholder">
                                                <td
                                                    colSpan={totalCols}
                                                    style={{ padding: 0, border: 'none', height: '100%' }}
                                                />
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                {showSumBar && (
                                    <div className="selection-summary-bar show">
                                        <span className="sum">
                                            Sum: ₹{selectedSum?.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div >
            )}
        </>
    );
}