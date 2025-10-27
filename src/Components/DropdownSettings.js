import React, { useState, useEffect } from 'react';
import { useDropdowns } from '../Contexts/DropdownContext';
import './Styles/DropdownSettings.css';
import { Server_url } from '../Urls/AllData';
import { FaCircleInfo } from "react-icons/fa6";
import { IoMdAddCircleOutline } from "react-icons/io";
import { MdOutlineDriveFileRenameOutline } from "react-icons/md";
import { MdDeleteOutline } from "react-icons/md";
import { LuSave } from "react-icons/lu";
import { AiOutlineClose } from "react-icons/ai";
import RMNoData from "./../Assets/edit_rm_noData.png"

const DropdownSettings = () => {
    const { dropdownFields, refreshDropdowns } = useDropdowns();

    const [selectedField, setSelectedField] = useState('');
    const [newTag, setNewTag] = useState('');
    const [editTag, setEditTag] = useState(null);
    const [editedValue, setEditedValue] = useState('');
    const [confirmDeleteTag, setConfirmDeleteTag] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [validationError, setValidationError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fieldNames = dropdownFields && Object.keys(dropdownFields);

    useEffect(() => {
        refreshDropdowns();
    }, [refreshDropdowns]);

    useEffect(() => {
        if (newTag.trim() && selectedField) {
            const isDuplicate = dropdownFields[selectedField]?.includes(newTag.trim());
            setValidationError(
                !newTag.trim()
                    ? 'Tag cannot be empty'
                    : isDuplicate
                        ? 'Tag already exists'
                        : ''
            );
        } else {
            setValidationError('');
        }
    }, [newTag, selectedField, dropdownFields]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && newTag.trim() && !validationError && !isLoading) {
            handleAddTag();
        }
    };

    const handleAddTag = async () => {
        if (validationError || isLoading) return;
        setIsLoading(true);
        setErrorMsg('');

        try {
            const res = await fetch(`${Server_url}/api/dropdowns/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field: selectedField, value: newTag.trim() })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add');

            refreshDropdowns();
            setNewTag('');
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRename = async (oldValue) => {
        if (!editedValue.trim() || isLoading) return;
        setIsLoading(true);
        setErrorMsg('');

        try {
            const res = await fetch(`${Server_url}/api/dropdowns/rename`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    field: selectedField,
                    oldValue,
                    newValue: editedValue.trim()
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to rename');

            refreshDropdowns();
            setEditTag(null);
            setEditedValue('');
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (isLoading) return;
        setIsLoading(true);
        setErrorMsg('');

        try {
            const res = await fetch(`${Server_url}/api/dropdowns/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(confirmDeleteTag)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Delete failed');

            refreshDropdowns();
            setConfirmDeleteTag(null);
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="dropdown-settings-segment settings-segment" tabIndex={0} onKeyDown={handleKeyDown}>
            <h3>Edit Dropdown Tags</h3>

            <label>Select Field:</label>
            <select
                value={selectedField}
                onChange={(e) => {
                    setSelectedField(e.target.value);
                    refreshDropdowns();
                }}
            >
                <option value="">Select</option>
                {fieldNames?.map((field, i) => (
                    <option key={i} value={field}>{field}</option>
                ))}
            </select>

            {selectedField ?
                <>
                    <ul className="tag-list">
                        {dropdownFields[selectedField]?.map((tag, index) => (
                            <li key={index}>
                                {editTag === tag ? (
                                    <>
                                        <input
                                            value={editedValue}
                                            onChange={(e) => setEditedValue(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleRename(tag)}
                                            disabled={isLoading}
                                        />
                                        <button onClick={() => handleRename(tag)} disabled={isLoading}>
                                            {isLoading ? 'Saving...' : <><LuSave /> Save</>}
                                        </button>
                                        <button onClick={() => setEditTag(null)} disabled={isLoading}><AiOutlineClose style={{ fontSize: "15px" }} /> Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <span>{tag}</span>
                                        <button onClick={() => {
                                            setEditTag(tag);
                                            setEditedValue(tag);
                                        }} disabled={isLoading}><MdOutlineDriveFileRenameOutline /> Rename</button>
                                        <button onClick={() => setConfirmDeleteTag({ field: selectedField, value: tag })} disabled={isLoading}><MdDeleteOutline /> Delete</button>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>

                    <div className="add-tag-row">
                        <input
                            placeholder="Add new tag"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            className={validationError ? 'input-error' : ''}
                        />
                        <button onClick={handleAddTag} disabled={isLoading || validationError}>
                            {isLoading ? 'Adding...' : <><IoMdAddCircleOutline style={{ height: "17px", width: "17px" }} /> Add</>}
                        </button>
                    </div>
                    {validationError && <p className="validation-error">{validationError}</p>}
                </>
                :
                <>
                    <div className='edit_dropdown_illustration'>
                        <img src={RMNoData} alt="" /><h1>Select Fields To Edit</h1></div>
                </>
            }

            {errorMsg && <p className="error-message">⚠️ {errorMsg}</p>}

            {confirmDeleteTag && (
                <div className="confirm_delete_overlay" onClick={() => setConfirmDeleteTag(null)}>
                    <div className="confirm-delete-box" onClick={(e) => e.stopPropagation()}>
                        <FaCircleInfo style={{ marginBottom: "20px", height: "35px", width: "35px", color: "white" }} />
                        <div className="dropdown_details">
                            <div>Are you sure you want to </div>
                            <p>delete "<strong>{confirmDeleteTag.value}</strong>" from "{confirmDeleteTag.field}"?</p>
                        </div>

                        <div className="delete_button_container">
                            <button onClick={handleDelete} disabled={isLoading}>
                                {isLoading ? 'Deleting...' : 'Yes'}
                            </button>
                            <button onClick={() => setConfirmDeleteTag(null)} disabled={isLoading}> No</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DropdownSettings;