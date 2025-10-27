// SidebarAddRowForm.js - Corrected with missing imports
import React, { useState, useEffect } from 'react';
import './Styles/SidebarAddRowForm.css';
import { useDropdowns } from '../Contexts/DropdownContext';
import { useSelector } from 'react-redux';
import { emailToRMMap, unrestricted_adminEmails, Server_url, showErrorToast, showInfoToast, showSuccessToast } from '../Urls/AllData'; // Added missing imports

export default function SidebarAddRowForm({ allFields, defaultZeroFields, currentSubmodule, currentUser, onClose, onRowInserted }) {
    const [selectedSubmodule, setSelectedSubmodule] = useState(currentSubmodule);
    const [formData, setFormData] = useState({});
    const { dropdownFields } = useDropdowns();
    const reduxCurrentUser = useSelector((state) => state.user?.currentUser); // Fallback if prop missing

    const effectiveCurrentUser = currentUser || reduxCurrentUser;

    useEffect(() => {
        const today = new Date().toISOString().split("T")[0];

        const initialData = (allFields[selectedSubmodule] || []).reduce((acc, field) => {
            const lower = field.toLowerCase();
            if (
                (lower.includes('received') && lower.includes('date')) ||
                (lower.includes('proceed') && lower.includes('date')) ||
                (field === 'Date' && ['NSE_Pramesh', 'NSE_FFL'].includes(selectedSubmodule))
            ) {
                acc[field] = today;
            } else if (defaultZeroFields.includes(field)) {
                acc[field] = '0';
            } else {
                acc[field] = '';
            }
            return acc;
        }, {});
        setFormData(initialData);
    }, [selectedSubmodule, allFields, defaultZeroFields]);

    if (!allFields || !allFields[selectedSubmodule]) {
        return (
            <div className="sidebar-form">
                <div className="sidebar-header">
                    <h3>Add Row</h3>
                    <button onClick={onClose}>✕</button>
                </div>
                <p>⚠️ Fields not available yet for <strong>{selectedSubmodule}</strong>.</p>
            </div>
        );
    }

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        try {
            if (!effectiveCurrentUser?.email) {
                showInfoToast('⚠️ User email not found. Please log in again.');
                return;
            }

            const isAdmin = unrestricted_adminEmails.includes(effectiveCurrentUser.email);
            const currentRM = emailToRMMap?.[effectiveCurrentUser.email];
            const selectedRM = (formData['RM'] || '').trim();
            const normalizedCurrentRM = currentRM?.trim().toLowerCase();
            const normalizedSelectedRM = selectedRM?.toLowerCase();

            if (!isAdmin && !normalizedCurrentRM) {
                showInfoToast('Your email is not mapped to a valid RM. Contact support.');
                return;
            }

            if (
                !isAdmin &&
                allFields[selectedSubmodule].includes('RM') &&
                normalizedSelectedRM &&
                normalizedSelectedRM !== normalizedCurrentRM
            ) {
                showInfoToast(`You are only allowed to submit for yourself (${currentRM}).`);
                return;
            }

            // Prepare payload with created_by
            const payload = {
                tableName: selectedSubmodule,
                entries: [{ ...formData, created_by: effectiveCurrentUser?.name || 'Unknown' }],
            };

            const response = await fetch(`${Server_url}/api/insertTableData`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Insert failed with status ${response.status}`);
            }

            const insertedRows = result.insertedRows || [];
            const insertedRow = insertedRows[0] || { ...formData, id: Date.now() }; // Fallback for safety

            // Notify parent to add row to UI with server data
            if (typeof onRowInserted === 'function') {
                onRowInserted(insertedRow);
            }

            onClose();
            showSuccessToast('✅ Row inserted successfully.');
        } catch (err) {
            console.error('Insert error:', err.message);
            showErrorToast(`❌ Failed to insert row: ${err.message}`);
        }
    };

    const getDropdownOptions = (field) => {
        const statusMap = {
            STP_Switch: ['Success', 'Rejected', 'In Progress', 'Pending'],
            Non_Financial: ['Success', 'Rejected', 'In Progress', 'Pending'],
        };
        if (field === 'Status' && statusMap[selectedSubmodule]) {
            return statusMap[selectedSubmodule];
        }
        return dropdownFields[field] || null;
    };

    return (
        <div className="sidebar-form">
            <div className="sidebar-header">
                <h3>Add Row in <span style={{ backgroundColor: "#faac4d", padding: "0px 5px" }}>{selectedSubmodule}</span></h3>
                <button onClick={onClose}>✕</button>
            </div>

            <div className="form-group">
                <label>Table Name :</label>
                <select value={selectedSubmodule} onChange={(e) => setSelectedSubmodule(e.target.value)}>
                    {(allFields && Object.keys(allFields).length > 0)
                        ? Object.keys(allFields).map(key => (
                            <option key={key} value={key}>{key}</option>
                        ))
                        : <option disabled>Loading...</option>}
                </select>
            </div>

            <div className="form-fields">
                {(allFields[selectedSubmodule] || []).map((field, index) => {
                    const isDateField = field.toLowerCase().includes('date') &&
                        !['mandate', 'mandate_mode', 'mandate_sf', 'red_indicatores_update'].includes(field.toLowerCase());

                    const isNumeric = defaultZeroFields.includes(field);
                    const dropdownOptions = getDropdownOptions(field);

                    return (
                        <div className="form-row" key={index}>
                            <label>{field}</label>
                            {dropdownOptions ? (
                                <select value={formData[field] || ''} onChange={(e) => handleChange(field, e.target.value)}>
                                    <option value="">Select</option>
                                    {dropdownOptions.map((opt, i) => (
                                        <option key={i} value={opt}>{opt}</option>
                                    ))}
                                    {formData[field] && !dropdownOptions.includes(formData[field]) && (
                                        <option value={formData[field]}>{`Deleted: ${formData[field]}`}</option>
                                    )}
                                </select>
                            ) : (
                                <input
                                    type={
                                        isNumeric ? "number"
                                            : isDateField ? "date"
                                                : "text"
                                    }
                                    value={formData[field] || ''}
                                    onChange={(e) => handleChange(field, e.target.value)}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="form-actions">
                <button onClick={handleSubmit}>💾 Save</button>
            </div>
        </div>
    );
}