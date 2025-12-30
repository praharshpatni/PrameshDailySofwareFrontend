// SidebarAddRowForm.js - Corrected with missing imports
import React, { useState, useEffect } from 'react';
import './Styles/SidebarAddRowForm.css';
import { useDropdowns } from '../Contexts/DropdownContext';
import { useSelector } from 'react-redux';
import { emailToRMMap, unrestricted_adminEmails, Server_url, showErrorToast, showInfoToast, showSuccessToast } from '../Urls/AllData'; // Added missing imports

export default function SidebarAddRowForm({ allFields, defaultZeroFields, currentSubmodule, currentUser, onClose, onRowInserted, onRefresh }) {
    const [selectedSubmodule, setSelectedSubmodule] = useState(currentSubmodule);
    const [formData, setFormData] = useState({});
    const { dropdownFields } = useDropdowns();
    const reduxCurrentUser = useSelector((state) => state.user?.currentUser);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const effectiveCurrentUser = currentUser || reduxCurrentUser;
    const isAdmin = unrestricted_adminEmails.includes(effectiveCurrentUser?.email);
    const currentRM = emailToRMMap?.[effectiveCurrentUser?.email] || "";


    useEffect(() => {
        const today = new Date().toISOString().split("T")[0];

        const initialData = (allFields[selectedSubmodule] || []).reduce((acc, field) => {
            const lower = field.toLowerCase();
            if (
                (lower.includes('received') && lower.includes('date')) ||
                (lower.includes('proceed') && lower.includes('date')) ||
                (field === 'Date' && ['NSE_Pramesh', 'NSE_FFL', 'RV_NSE'].includes(selectedSubmodule))
            ) {
                acc[field] = today;
            } else if (defaultZeroFields.includes(field)) {
                acc[field] = '0';
            } else if (field.toLowerCase() === 'captain') {
                acc[field] = 'Prasad Parsekar'
            }
            else {
                acc[field] = '';
            }
            return acc;
        }, {});

        setFormData(initialData);
        if (!isAdmin && initialData.hasOwnProperty("RM")) {
            setFormData(prev => ({ ...prev, RM: currentRM }));
        }
    }, [selectedSubmodule, isAdmin, currentRM, allFields, defaultZeroFields]);

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

    // to save form data to server
    const handleSubmit = async () => {
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            if (!effectiveCurrentUser?.email) {
                showInfoToast('⚠️ User email not found. Please log in again.');
                return;
            }

            const isAdmin = unrestricted_adminEmails.includes(effectiveCurrentUser.email);
            const currentRM = emailToRMMap?.[effectiveCurrentUser.email];
            const selectedRM = isAdmin
                ? (formData['RM'] || '').trim()
                : currentRM.trim();
            const normalizedCurrentRM = currentRM?.trim().toLowerCase();
            const normalizedSelectedRM = selectedRM?.toLowerCase();

            console.log("effective current user", effectiveCurrentUser.name, currentRM)

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
                entries: [{ ...formData, created_by: effectiveCurrentUser?.email || 'Unknown' }],
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
            onClose();
            showSuccessToast('✅ Row inserted successfully.');
        } catch (err) {
            console.error('Insert error:', err.message);
            showErrorToast(`❌ Failed to insert row: ${err.message}`);
        } finally {
            setIsSubmitting(false);
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
        <div className="sidebar-form" onKeyDown={(e) => e.stopPropagation()}>
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
                        !['mandate', 'mandate_mode', 'mandate_sf'].includes(field.toLowerCase());

                    const isNumeric = defaultZeroFields.includes(field);
                    const dropdownOptions = getDropdownOptions(field);

                    return (
                        <div className="form-row" key={index}>
                            <label>{field}</label>
                            {dropdownOptions ? (
                                field === "RM" && !isAdmin ? (
                                    // 🔒 Restricted user → only their own RM visible
                                    <select
                                        value={formData[field] || currentRM}
                                        onChange={(e) => handleChange(field, e.target.value)}
                                        onKeyDown={(e) => e.stopPropagation()}
                                    >
                                        <option value={currentRM}>{currentRM}</option>
                                    </select>
                                ) : (
                                    // 🔓 Admin → show full dropdown normally
                                    <select
                                        value={formData[field] || ''}
                                        onChange={(e) => handleChange(field, e.target.value)}
                                        onKeyDown={(e) => e.stopPropagation()}
                                    >
                                        <option value="">Select</option>
                                        {dropdownOptions.map((opt, i) => (
                                            <option key={i} value={opt}>{opt}</option>
                                        ))}
                                        {formData[field] && !dropdownOptions.includes(formData[field]) && (
                                            <option value={formData[field]}>{`Deleted: ${formData[field]}`}</option>
                                        )}
                                    </select>
                                )
                            ) : (
                                <input
                                    type={
                                        isNumeric ? "number"
                                            : isDateField ? "date"
                                                : "text"
                                    }
                                    value={formData[field] || ''}
                                    onChange={(e) => handleChange(field, e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="form-actions">
                <button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
}