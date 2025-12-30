import React, { useState, useEffect, useMemo } from 'react';
import "./Styles/RaiseTicketPopup.css";

function RaiseTicketPopup({ onClose }) {
    const [formData, setFormData] = useState({
        id: '',
        rm_email: '',
        row_id: '',
        description: '',
        table_name: '',
        status: 'open',
        admin_email: '',
        created_at: new Date().toISOString(),
        solved_at: null
    });

    const [selectedMainModule, setSelectedMainModule] = useState('');
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Load submodules from env
    const submodules = useMemo(() => {
        const envSubmodules = process.env.REACT_APP_SUBMODULES;
        if (!envSubmodules) {
            console.warn('REACT_APP_SUBMODULES not found in .env');
            return {};
        }
        try {
            return JSON.parse(envSubmodules);
        } catch (error) {
            console.error('Failed to parse SUBMODULES from env:', error);
            return {};
        }
    }, []);

    const mainModules = Object.keys(submodules);
    const currentSubModules = submodules[selectedMainModule] || [];

    // Fetch table preview when rm_email AND table_name are set
    useEffect(() => {
        async function fetchPreview() {
            if (!formData.rm_email || !formData.table_name) {
                setTableData([]);
                setError('');
                setFormData(prev => ({ ...prev, row_id: '' }));
                return;
            }

            setLoading(true);
            setError('');

            try {
                // Replace with your actual backend endpoint
                const response = await fetch(
                    `/api/preview-table?table_name=${encodeURIComponent(formData.table_name)}&rm_email=${encodeURIComponent(formData.rm_email)}`
                );

                if (!response.ok) throw new Error('Failed to load table data');

                const data = await response.json();
                // Expecting { rows: [{ id: 123, col1: '...', ... }, ...] }
                setTableData(data.rows || data || []);
            } catch (err) {
                setError(err.message || 'Error loading table preview');
                setTableData([]);
            } finally {
                setLoading(false);
            }
        }

        fetchPreview();
    }, [formData.rm_email, formData.table_name]);

    const filteredData = useMemo(() => {
        if (!searchTerm) return tableData;
        const lower = searchTerm.toLowerCase();
        return tableData.filter(row =>
            Object.values(row).some(val =>
                val != null && val.toString().toLowerCase().includes(lower)
            )
        );
    }, [tableData, searchTerm]);

    const columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMainModuleChange = (e) => {
        const value = e.target.value;
        setSelectedMainModule(value);
        setFormData(prev => ({ ...prev, table_name: '' }));
        setSearchTerm('');
    };

    const handleSubModuleChange = (e) => {
        const value = e.target.value;
        setFormData(prev => ({ ...prev, table_name: value }));
        setSearchTerm('');
    };

    const handleRowSelect = (row) => {
        // Assume every table has an 'id' column as primary key
        const rowId = row.id != null ? row.id.toString() : '';
        setFormData(prev => ({ ...prev, row_id: rowId }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.row_id) {
            alert('Please select a row from the table preview');
            return;
        }
        console.log('Ticket Data for DB:', formData);
        onClose();
    };

    return (
        <>
            <div className="raise_ticket_overlay" onClick={onClose}></div>
            <div className='raise_ticket_con'>
                <div className="close_button" onClick={onClose}>&times;</div>
                <div className="raise_ticket_header">
                    <h2>Raise Support Ticket</h2>
                    <p>Fill in details to send ticket to admin for row modification.</p>
                </div>
                <form onSubmit={handleSubmit} className="ticket_form">

                    {/* Main Module */}
                    <div className="form_group">
                        <label htmlFor="main_module">Main Module: <span className="required">*</span></label>
                        <select
                            id="main_module"
                            value={selectedMainModule}
                            onChange={handleMainModuleChange}
                            required
                        >
                            <option value="">-- Choose Main Module --</option>
                            {mainModules.map((module) => (
                                <option key={module} value={module}>{module}</option>
                            ))}
                        </select>
                    </div>

                    {/* Submodule / Table Name */}
                    {selectedMainModule && (
                        <div className="form_group">
                            <label htmlFor="table_name">Table Name (Submodule): <span className="required">*</span></label>
                            <select
                                id="table_name"
                                name="table_name"
                                value={formData.table_name}
                                onChange={handleSubModuleChange}
                                required
                            >
                                <option value="">-- Choose Submodule --</option>
                                {currentSubModules.map((sub) => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Table Preview & Row Selection */}
                    {formData.table_name && (
                        <div className="preview_section">
                            <h3>Table Preview: {formData.table_name}</h3>

                            {!formData.rm_email ? (
                                <p>Please enter RM Email above to load the data.</p>
                            ) : loading ? (
                                <p>Loading table data...</p>
                            ) : error ? (
                                <p className="error">{error}</p>
                            ) : tableData.length === 0 ? (
                                <p>No rows found for this RM in {formData.table_name}.</p>
                            ) : (
                                <>
                                    <div className="preview_search">
                                        <input
                                            type="text"
                                            placeholder="Search in table rows..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    <div className="preview_table_wrapper">
                                        <table className="preview_table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '60px' }}>Select</th>
                                                    {columns.map(col => (
                                                        <th key={col}>{col}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredData.map((row, idx) => (
                                                    <tr
                                                        key={row.id ?? idx}
                                                        className={formData.row_id === (row.id?.toString()) ? 'selected' : ''}
                                                    >
                                                        <td>
                                                            <input
                                                                type="radio"
                                                                name="row_select"
                                                                checked={formData.row_id === (row.id?.toString())}
                                                                onChange={() => handleRowSelect(row)}
                                                            />
                                                        </td>
                                                        {columns.map(col => (
                                                            <td key={col}>{row[col] ?? ''}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {formData.row_id && (
                                        <div className="selected_row_display">
                                            <strong>Selected Row ID:</strong> {formData.row_id}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Description - After row selection */}
                    <div className="form_group">
                        <label htmlFor="description">Description / Required Change: <span className="required">*</span></label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="5"
                            placeholder="Explain what needs to be modified in the selected row..."
                            required
                        ></textarea>
                    </div>

                    <div className="form_actions">
                        <button type="submit" className="submit_btn">Submit Ticket</button>
                        <button type="button" onClick={onClose} className="cancel_btn">Cancel</button>
                    </div>
                </form>
            </div>
        </>
    );
}

export default RaiseTicketPopup;