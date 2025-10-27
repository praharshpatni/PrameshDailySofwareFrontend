// TableComponent.js - Excel-like multi-column filters + search + active indicator
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FiCopy } from 'react-icons/fi';
import './Styles/TableComponent.css';
import { useDropdowns } from '../Contexts/DropdownContext';
import { AiOutlineArrowUp, AiOutlineArrowDown } from 'react-icons/ai';
import { BiSortAlt2 } from 'react-icons/bi';
import useFilteredRowsByRM from '../hooks/useFilteredRowsByRM';
import { toast } from 'react-toastify';

export default function TableComponent({
    fields,
    rows,
    onAddRow,
    onInputChange,
    onDeleteRow,
    defaultZeroFields = [],
    submodule,
    selectedIds = [],
    onSelectionChange = () => { },
    isFullScreen
}) {
    const { dropdownFields } = useDropdowns();
    const [sortConfig, setSortConfig] = useState({ field: null, direction: null });
    const { filteredRows: userFilteredRows, isUnrestricted } = useFilteredRowsByRM(rows);
    const [visibleRowCount, setVisibleRowCount] = useState(50);
    const rowsPerBatch = 50;
    const observerRef = useRef(null);
    const lastRowRef = useRef(null);
    const tableWrapperRef = useRef(null);
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Column filter states: { [field]: Set(values) }
    const [columnFilters, setColumnFilters] = useState({});
    // Which field’s filter dropdown is open
    const [openFilterField, setOpenFilterField] = useState(null);
    const filterDropdownRef = useRef(null);
    // Search text per field for the filter dropdown
    const [filterSearch, setFilterSearch] = useState({}); // { [field]: string }

    // Close dropdown on outside click
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

    // const isColumnFiltered = useCallback(
    //     (field) => !!(columnFilters[field] && columnFilters[field].size > 0),
    //     [columnFilters]
    // );

    // Toggle dropdown; when opening, ensure a search key exists
    const toggleFilterDropdown = (field) => {
        setOpenFilterField((prev) => {
            const next = prev === field ? null : field;
            if (next) {
                setFilterSearch((s) => ({ ...s, [field]: s[field] ?? '' }));
            }
            return next;
        });
    };

    // Apply column filters (AND across columns) starting from userFilteredRows (RM restrictions)
    const filteredByColumnFilters = useMemo(() => {
        if (!userFilteredRows || Object.keys(columnFilters).length === 0) {
            return (userFilteredRows || []).map(row => ({ ...row, _originalIndex: rows.indexOf(row) }));
        }
        const filterEntries = Object.entries(columnFilters).filter(([_, s]) => s && s.size > 0);
        if (filterEntries.length === 0) {
            return userFilteredRows.map(row => ({ ...row, _originalIndex: rows.indexOf(row) }));
        }

        const baseRows = userFilteredRows.filter((r) => {
            for (const [field, selectedSet] of filterEntries) {
                const cell = r[field];
                const value = cell == null ? '' : String(cell);
                if (!selectedSet.has(value)) return false;
            }
            return true;
        }).map(row => ({ ...row, _originalIndex: rows.indexOf(row) }));

        return baseRows;
    }, [userFilteredRows, columnFilters, rows]);

    // Sorting (unchanged) but sourced from filteredByColumnFilters
    const sortedRows = useMemo(() => {
        const base = filteredByColumnFilters || [];
        if (!sortConfig.field || !sortConfig.direction) return base;
        return [...base].sort((a, b) => {
            const valA = (a[sortConfig.field] || '').toString().toLowerCase();
            const valB = (b[sortConfig.field] || '').toString().toLowerCase();
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredByColumnFilters, sortConfig]);

    const visibleRows = useMemo(() => sortedRows.slice(0, visibleRowCount), [sortedRows, visibleRowCount]);

    const loadMoreRows = useCallback(() => {
        if (visibleRowCount >= sortedRows.length) return;
        setVisibleRowCount((prev) => Math.min(prev + rowsPerBatch, sortedRows.length));
    }, [sortedRows.length, rowsPerBatch, visibleRowCount]);

    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && visibleRowCount < sortedRows.length) loadMoreRows();
            },
            { root: tableWrapperRef.current, threshold: 0.1 }
        );

        if (lastRowRef.current) observerRef.current.observe(lastRowRef.current);

        return () => observerRef.current && observerRef.current.disconnect();
    }, [visibleRowCount, sortedRows.length, loadMoreRows]);

    const handleSort = (field) => {
        setSortConfig((prev) =>
            prev.field === field
                ? { field, direction: prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc' }
                : { field, direction: 'asc' }
        );
        setVisibleRowCount(50);
    };

    const statusOptionsBySubmodule = {
        STP_Switch: ['Success', 'Rejected', 'In Progress', 'Pending'],
        Non_Financial: ['Success', 'Rejected', 'In Progress', 'Pending'],
    };

    const getDropdownOptions = (field) => {
        if (field === 'Status' && (submodule === 'STP_Switch' || submodule === 'Non_Financial')) {
            return statusOptionsBySubmodule[submodule];
        }
        if (field === 'Sub_RM' && submodule === 'Realvalue') return dropdownFields['Sub_RM'] || [];
        if (field === 'Sub_RM_ii' && submodule === 'Realvalue') return dropdownFields['Sub_RM_ii'] || [];
        if (field === 'Sub_RM_iii' && submodule === 'Realvalue') return dropdownFields['Sub_RM_iii'] || [];
        return dropdownFields[field];
    };

    const handleInputChange = (rowIndex, field, value) => {
        if (!isUnrestricted) {
            toast.error('⛔ You are not allowed to edit any data.');
            return;
        }
        onInputChange(rowIndex, field, value);
    };

    const importantFields = [
        'Name', 'DOB', 'AMC', 'PAN', 'Mobile', 'Email Address', 'Remark_1',
        'Approach_By', 'Scheme_Type', 'Scheme', 'Sub_RM', 'Sub_RM_ii', 'Sub_RM_iii',
    ];

    // Fix: Check full rows, not filtered
    const isLastRowFilled = rows.length === 0 || fields.some((f) => rows[rows.length - 1][f]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                const canAddRow = isUnrestricted || isLastRowFilled;
                if (canAddRow) {
                    onAddRow();
                    setTimeout(() => {
                        const lastRowIndex = rows.length;
                        setVisibleRowCount((prev) => Math.max(prev, lastRowIndex + 1));
                        setTimeout(() => {
                            lastRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            lastRowRef.current?.focus();
                        }, 100);
                    }, 100);
                } else {
                    toast.warn('⚠️ Fill the last row before adding a new one.');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLastRowFilled, onAddRow, isUnrestricted, rows.length]);

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

    // Distinct values for a column (respect other filters, exclude this column's own filter)
    const getDistinctValuesForColumn = useCallback((column) => {
        const otherFilters = {};
        for (const [k, setObj] of Object.entries(columnFilters)) {
            if (k !== column && setObj && setObj.size > 0) otherFilters[k] = setObj;
        }

        const baseRows = (userFilteredRows || []).filter((r) => {
            for (const [k, selectedSet] of Object.entries(otherFilters)) {
                const val = r[k] == null ? '' : String(r[k]);
                if (!selectedSet.has(val)) return false;
            }
            return true;
        });

        const distinct = new Set();
        for (const r of baseRows) {
            const v = r[column] == null ? '' : String(r[column]);
            distinct.add(v);
        }

        const arr = Array.from(distinct).sort((a, b) => {
            const aN = Number(a), bN = Number(b);
            if (!isNaN(aN) && !isNaN(bN)) return aN - bN;
            return String(a).localeCompare(String(b));
        });
        return arr;
    }, [userFilteredRows, columnFilters]);

    const toggleFilterValue = (field, value) => {
        setColumnFilters((prev) => {
            const next = { ...prev };
            const existing = new Set(next[field] ? Array.from(next[field]) : []);
            const key = String(value);
            if (existing.has(key)) existing.delete(key);
            else existing.add(key);
            next[field] = existing;
            return next;
        });
        setVisibleRowCount(50);
    };

    const setFilterAll = (field, valuesArray) => {
        setColumnFilters((prev) => {
            const next = { ...prev };
            next[field] = new Set(valuesArray.map((v) => String(v)));
            return next;
        });
        setVisibleRowCount(50);
    };

    const clearFilterForField = (field) => {
        setColumnFilters((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
        setVisibleRowCount(50);
    };

    const isValueSelected = (field, value) => {
        const s = columnFilters[field];
        return !!(s && s.has(String(value)));
    };

    // Render
    return (
        <div className="table_main_con">
            <div className={`table-wrapper ${isFullScreen ? 'fullscreen-mode' : ''}`} ref={tableWrapperRef}>
                {visibleRows.length === 0 ? (
                    <div className="no-data-container">
                        <img
                            src="https://res.cloudinary.com/dasparepg/image/upload/v1752559684/EmptyTable_qoobce.jpg"
                            alt="No Data"
                            className="no-data-image"
                        />
                        <p>No data available for your RM access.</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                {isUnrestricted && visibleRows.length > 0 && (
                                    <th>
                                        <input
                                            type="checkbox"
                                            onChange={(e) =>
                                                onSelectionChange(
                                                    e.target.checked ? visibleRows.map((r) => r.id).filter(Boolean) : []
                                                )
                                            }
                                            checked={
                                                selectedIds.length > 0 &&
                                                visibleRows.every((r) => r.id && selectedIds.includes(r.id))
                                            }
                                        />
                                    </th>
                                )}
                                <th>Index</th>
                                {fields.map((f, i) => {
                                    const activeCount = columnFilters[f]?.size || 0;
                                    const headerFiltered = activeCount > 0;
                                    return (
                                        <th
                                            key={i}
                                            className={`fieldsName filter-header ${headerFiltered ? 'filtered-column' : ''}`}
                                            data-field={f}
                                        >
                                            <div className="header-content">
                                                <span className="header-title">{f}</span>

                                                {headerFiltered && (
                                                    <span className="filter-badge" title={`${activeCount} filter${activeCount > 1 ? 's' : ''} applied`}>
                                                        {activeCount}
                                                    </span>
                                                )}

                                                {importantFields.includes(f) && (
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
                                                            toggleFilterDropdown(f);
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
                                                            {/* Search box */}
                                                            <div className="filter-search-wrap">
                                                                <input
                                                                    type="text"
                                                                    className="filter-search-input"
                                                                    placeholder="Search values…"
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
                                                                        // If search is active, select only the visible ones
                                                                        const term = (filterSearch[f] ?? '').trim().toLowerCase();
                                                                        const toSelect = term
                                                                            ? allValues.filter((v) =>
                                                                                (v === '' ? '(blank)' : String(v)).toLowerCase().includes(term)
                                                                            )
                                                                            : allValues;
                                                                        setFilterAll(f, toSelect);
                                                                    }}
                                                                >
                                                                    Select Visible
                                                                </button>
                                                                <button
                                                                    className="small-btn"
                                                                    onClick={() => clearFilterForField(f)}
                                                                >
                                                                    Clear
                                                                </button>
                                                            </div>

                                                            <div className="filter-values-list" role="list">
                                                                {(() => {
                                                                    const distinct = getDistinctValuesForColumn(f);
                                                                    const term = (filterSearch[f] ?? '').trim().toLowerCase();
                                                                    const filtered = term
                                                                        ? distinct.filter((val) =>
                                                                            (val === '' ? '(blank)' : String(val))
                                                                                .toLowerCase()
                                                                                .includes(term)
                                                                        )
                                                                        : distinct;

                                                                    if (!filtered || filtered.length === 0) {
                                                                        return <div className="no-values">No matches</div>;
                                                                    }

                                                                    return filtered.map((val, idx) => {
                                                                        const display = val === '' ? '(blank)' : val;
                                                                        const checked = isValueSelected(f, val);
                                                                        return (
                                                                            <label className="filter-value-item" key={`${val}-${idx}`}>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={checked}
                                                                                    onChange={() => toggleFilterValue(f, val)}
                                                                                />
                                                                                <span className="value-label" title={display}>{display}</span>
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
                            {visibleRows.map((row, ri) => {
                                const originalIndex = row._originalIndex;
                                return (
                                    <tr key={ri}>
                                        {isUnrestricted && (
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(row.id)}
                                                    onChange={() => toggleRowSelection(row.id)}
                                                />
                                            </td>
                                        )}
                                        <td>{ri + 1}</td>
                                        {fields.map((field, fi) => {
                                            const isEditable = isUnrestricted;
                                            const isImportant = importantFields.includes(field);
                                            const copiedKey = `${ri}-${field}`;
                                            const isDateField =
                                                field.toLowerCase().includes('date') &&
                                                !['mandate', 'mandate_mode', 'mandate_sf'].includes(field.toLowerCase());
                                            const isNumericField = defaultZeroFields.includes(field);
                                            const aboveRowIndex = ri - 1;
                                            const handleCopyDown = (e) => {
                                                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                                                    e.preventDefault();
                                                    const currentValue = e.target.value;
                                                    if (!currentValue && aboveRowIndex >= 0 && visibleRows[aboveRowIndex]) {
                                                        const aboveRow = visibleRows[aboveRowIndex];
                                                        const valueAbove = aboveRow[field];
                                                        if (valueAbove !== undefined && valueAbove !== null && valueAbove !== '') {
                                                            handleInputChange(originalIndex, field, valueAbove);
                                                        } else {
                                                            toast.warn('⚠️ No value above to copy.');
                                                        }
                                                    }
                                                }
                                            };

                                            return (
                                                <td key={fi} className="field-cell">
                                                    <div className="input-wrapper">
                                                        {getDropdownOptions(field) ? (
                                                            <select
                                                                disabled={!isEditable}
                                                                value={row[field] || ''}
                                                                data-row={originalIndex}
                                                                data-field={field}
                                                                onKeyDown={handleCopyDown}
                                                                onChange={(e) => handleInputChange(originalIndex, field, e.target.value)}
                                                                className={`copy-input ${getStatusClass(field, row[field])}`}
                                                            >
                                                                <option value="">Select</option>
                                                                {getDropdownOptions(field)?.map((option, index) => (
                                                                    <option key={index} value={option}>
                                                                        {option}
                                                                    </option>
                                                                ))}
                                                                {row[field] && !getDropdownOptions(field)?.includes(row[field]) && (
                                                                    <option value={row[field]} className="deleted-option">
                                                                        Deleted: {row[field]}
                                                                    </option>
                                                                )}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                disabled={!isEditable}
                                                                type={isNumericField ? 'number' : isDateField ? 'date' : 'text'}
                                                                min={isNumericField ? '0' : undefined}
                                                                ref={ri === visibleRows.length - 1 && fi === 0 ? lastRowRef : null}
                                                                value={isDateField && row[field] === '1970-01-01' ? '' : row[field] ?? ''}
                                                                data-row={originalIndex}
                                                                data-field={field}
                                                                onKeyDown={handleCopyDown}
                                                                onChange={(e) => {
                                                                    let value = e.target.value;
                                                                    if (isNumericField && value.trim() === '') value = '0';
                                                                    handleInputChange(originalIndex, field, value);
                                                                }}
                                                                className="copy-input custom-date"
                                                            />
                                                        )}
                                                        {isImportant && (
                                                            <div className="copy-container">
                                                                <button
                                                                    className="copy-btn"
                                                                    onClick={() => handleCopy(row[field], ri, field)}
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
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}