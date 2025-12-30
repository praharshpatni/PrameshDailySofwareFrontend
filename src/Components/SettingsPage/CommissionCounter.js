import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './CommissionCounter.css';
import { Server_url, showErrorToast, showInfoToast } from '../../Urls/AllData';
import { FaFileExcel, FaFilePdf } from 'react-icons/fa';

const COMMISSION_BRACKETS = [
    { min: 10000, commission: 500 },
    { min: 8000, commission: 400 },
    { min: 6000, commission: 300 },
    { min: 4000, commission: 200 },
    { min: 2000, commission: 100 },
    { min: 1000, commission: 50 },
];

function formatDate(isoDate) {
    if (!isoDate) return '—';
    const parsedDate = new Date(isoDate);
    if (isNaN(parsedDate.getTime())) {
        const parts = isoDate.split("-");
        if (parts.length === 3) {
            const [day, month, year] = parts;
            const fallbackDate = new Date(`${year}-${month}-${day}`);
            return isNaN(fallbackDate.getTime()) ? '—' : fallbackDate.toLocaleDateString('en-GB');
        }
        return '—';
    }
    return parsedDate.toLocaleDateString('en-GB');
}

export default function CommissionCounter() {
    const [fromDate, setFromDate] = useState('');
    const [duration, setDuration] = useState('1');
    const [commissionResult, setCommissionResult] = useState(null);
    const [prameshNames, setPrameshNames] = useState([]);
    const [fflNames, setFflNames] = useState([]);
    const [selectedValue, setSelectedValue] = useState('');
    const [selectedPerson, setSelectedPerson] = useState('');
    const [loading, setLoading] = useState(false);
    const [transactionType, setTransactionType] = useState('SIP');
    const [detailedView, setDetailedView] = useState(false);

    useEffect(() => {
        axios.get(`${Server_url}/api/distinct-approach-by`)
            .then(res => {
                setPrameshNames([...new Set((res.data.pramesh || []).filter(name => name.trim() !== ''))]);
                setFflNames([...new Set((res.data.ffl || []).filter(name => name.trim() !== ''))]);
            })
            .catch(err => console.error("Failed to fetch names", err));
    }, []);

    const validateDateRange = useCallback(() => {
        const from = new Date(fromDate);
        const to = new Date(from);
        to.setMonth(to.getMonth() + parseInt(duration));
        return to <= new Date();
    }, [fromDate, duration]);

    const calculateCommission = async () => {
        if (!selectedValue || !fromDate || !duration) return showInfoToast("Please fill all fields");
        if (!validateDateRange()) return showInfoToast("Selected duration exceeds current month. Please adjust.");

        const selectedOption = memoizedOptions.combined.find(opt => opt.value === selectedValue);
        if (!selectedOption) {
            return showInfoToast("Please select a valid name");
        }

        const name = selectedOption.originalName;
        const table = selectedOption.tables.length === 1
            ? selectedOption.tables[0]
            : selectedOption.tables;

        let apiEndpoint = '';
        if (transactionType === 'SIP') {
            apiEndpoint = '/api/calculate-sip-commission';
        } else if (transactionType === 'Lumpsum') {
            apiEndpoint = '/api/calculate-lumpsum-commission';
        } else {
            return showInfoToast("Unsupported transaction type");
        }

        console.log("Name:", name);
        console.log("Table(s) to send:", table);

        try {
            setLoading(true);
            const res = await axios.post(`${Server_url}${apiEndpoint}`, {
                approach_by: name,
                fromDate,
                duration,
                table
            });

            if (transactionType === 'SIP') {
                // Existing SIP logic
                const rows = res.data.rows || [];
                if (rows === "working best") return;

                let totalAmount = 0;
                let totalIncentive = 0;

                const details = rows.map(row => {
                    const amount = parseFloat(row.Amount) || 0;
                    totalAmount += amount;

                    const bracket = COMMISSION_BRACKETS.find(b => amount >= b.min);
                    const incentive = bracket?.commission || 0;
                    totalIncentive += incentive;

                    return {
                        RM: row.RM,
                        Date: row.Date,
                        Client_Name: row.Client_Name,
                        Transaction_Type: row.Transaction_Type,
                        Scheme: row.Scheme,
                        Amount: amount,
                        Incentive: incentive
                    };
                });

                setCommissionResult({
                    totalAmount,
                    commission: totalIncentive,
                    totalIncentive,
                    details,
                    transactionType: 'SIP'
                });
            } else {
                // Lumpsum logic
                const data = res.data;
                setCommissionResult({
                    ...data,
                    transactionType: 'Lumpsum',
                    // For backward compatibility with table display
                    details: data.rows?.map(row => ({
                        RM: row.RM,
                        Date: row.Date,
                        Client_Name: row.Client_Name,
                        Transaction_Type: row.Transaction_Type,
                        Scheme: row.Scheme,
                        Amount: row.Amount,
                        Incentive: 0, // Lumpsum doesn't use incentive brackets
                        Redemption_Date: row.Redemption_Date
                    })) || []
                });
            }
        } catch (err) {
            console.error("Error calculating commission", err);
            showErrorToast("Failed to calculate commission");
        } finally {
            setLoading(false);
        }
    };

    const capitalizeFirstLetter = useCallback(str => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(), []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const exportToExcel = () => {
        if (!commissionResult?.details?.length) return showInfoToast("No data to export");

        if (commissionResult.transactionType === 'SIP') {
            // Existing SIP export logic
            const convertToExcelDate = ddmmyyyy => {
                const [day, month, year] = ddmmyyyy.split('-');
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            };

            const formattedData = commissionResult.details.map(row => ([
                row.RM,
                convertToExcelDate(row.Date),
                row.Client_Name,
                row.Transaction_Type,
                row.Scheme,
                row.Amount,
                row.Incentive
            ]));

            const worksheet = XLSX.utils.aoa_to_sheet([
                ["RM", "Date", "Client Name", "Transaction Type", "Scheme", "Amount", "Incentive"],
                ...formattedData
            ]);

            XLSX.utils.sheet_add_aoa(worksheet, [["", "", "", "", "", "Total Incentive", commissionResult.totalIncentive]], { origin: -1 });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Commission Data');
            XLSX.writeFile(workbook, 'Commission_Report.xlsx');
        } else {
            // Lumpsum export logic
            const workbook = XLSX.utils.book_new();

            // Sheet 1: Transaction Details
            const transactionData = commissionResult.rows?.map(row => ([
                row.RM,
                row.Date,
                row.Client_Name,
                row.Transaction_Type,
                row.Scheme,
                row.Amount,
                row.Redemption_Date || '—'
            ])) || [];

            const transactionWs = XLSX.utils.aoa_to_sheet([
                ["RM", "Date", "Client Name", "Transaction Type", "Scheme", "Amount", "Redemption Date"],
                ...transactionData
            ]);
            XLSX.utils.book_append_sheet(workbook, transactionWs, 'Transactions');

            // Sheet 2: Month-wise Breakdown (for RM only)
            if (commissionResult.isRM && commissionResult.monthWiseBreakdown?.length) {
                const breakdownData = commissionResult.monthWiseBreakdown.map(item => ([
                    item.month,
                    formatCurrency(item.totalLumpsum),
                    formatCurrency(item.deductions),
                    formatCurrency(item.netAmount),
                    formatCurrency(item.threshold),
                    formatCurrency(item.eligibleAfterThreshold),
                    item.status,
                    formatCurrency(item.commission)
                ]));

                const breakdownWs = XLSX.utils.aoa_to_sheet([
                    ["Month", "Total Lumpsum", "Redemption Deductions", "Net Amount", "Threshold (25L)", "Eligible Amount", "Status", "Commission"],
                    ...breakdownData
                ]);
                XLSX.utils.book_append_sheet(workbook, breakdownWs, 'Month Breakdown');
            }

            // Sheet 3: Redemption Deductions
            if (commissionResult.deductionDetails?.length) {
                const deductionData = commissionResult.deductionDetails.map(item => ([
                    item.month,
                    item.clientName,
                    item.scheme,
                    item.lumpsumDate,
                    formatCurrency(item.lumpsumAmount),
                    item.redemptionDate,
                    formatCurrency(item.redemptionAmount),
                    `${item.daysDifference} days`,
                    item.status
                ]));

                const deductionWs = XLSX.utils.aoa_to_sheet([
                    ["Month", "Client Name", "Scheme", "Lumpsum Date", "Lumpsum Amount", "Redemption Date", "Redemption Amount", "Days Difference", "Status"],
                    ...deductionData
                ]);
                XLSX.utils.book_append_sheet(workbook, deductionWs, 'Early Redemptions');
            }

            // Summary Sheet
            const summaryData = [
                ["Commission Type", commissionResult.commissionType],
                ["Total Lumpsum Amount", formatCurrency(commissionResult.totalLumpsum)],
                ["Total Redemption Amount", formatCurrency(commissionResult.totalRedemptions)],
                ["Eligible Amount", formatCurrency(commissionResult.total)],
                ["Commission Rate", commissionResult.commissionRate],
                ["Total Commission", formatCurrency(commissionResult.commission)],
                ["Threshold per Month", formatCurrency(commissionResult.threshold || 0)],
                ["Calculation Date", new Date().toLocaleDateString('en-GB')]
            ];

            const summaryWs = XLSX.utils.aoa_to_sheet([
                ["Lumpsum Commission Summary"],
                [],
                ...summaryData
            ]);
            XLSX.utils.book_append_sheet(workbook, summaryWs, 'Summary');

            XLSX.writeFile(workbook, 'Lumpsum_Commission_Report.xlsx');
        }
    };

    const exportToPDF = () => {
        if (!commissionResult?.details?.length) return showInfoToast("No data to export");

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        if (commissionResult.transactionType === 'SIP') {
            // Existing SIP PDF logic
            doc.setFontSize(14);
            doc.text("Commission Breakdown", 14, 15);

            autoTable(doc, {
                head: [["RM", "Date", "Client Name", "Transaction Type", "Scheme", "Amount", "Incentive"]],
                body: commissionResult.details.map(row => ([
                    row.RM,
                    formatDate(row.Date),
                    row.Client_Name,
                    row.Transaction_Type,
                    row.Scheme,
                    `₹${row.Amount}`,
                    `₹${row.Incentive}`
                ])),
                startY: 20,
                styles: { fontSize: 10 },
                theme: 'grid',
                didDrawPage: (data) => {
                    const summaryStartY = data.cursor.y + 10;
                    doc.setFontSize(12);
                    doc.setFont(undefined, 'bold');
                    doc.text(`Total Amount: ₹${commissionResult.totalAmount}`, 14, summaryStartY);
                    doc.text(`Total Incentive: ₹${commissionResult.totalIncentive}`, 14, summaryStartY + 8);
                }
            });
        } else {
            // Lumpsum PDF logic
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text("Lumpsum Commission Report", 14, 20);

            doc.setFontSize(10);
            doc.text(`For: ${capitalizeFirstLetter(selectedPerson)}`, 14, 28);
            doc.text(`Period: ${formatDate(fromDate)} to ${duration} month(s)`, 14, 34);
            doc.text(`Commission Type: ${commissionResult.commissionType}`, 14, 40);

            let startY = 50;

            // Summary Section
            autoTable(doc, {
                head: [["Description", "Amount"]],
                body: [
                    ["Total Lumpsum Amount", formatCurrency(commissionResult.totalLumpsum)],
                    ["Total Redemption Amount", formatCurrency(commissionResult.totalRedemptions)],
                    ["Eligible Amount", formatCurrency(commissionResult.total)],
                    ["Commission Rate", commissionResult.commissionRate],
                    ["Total Commission", formatCurrency(commissionResult.commission)]
                ],
                startY: startY,
                styles: { fontSize: 10 },
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] }
            });

            startY = doc.lastAutoTable.finalY + 10;

            // Month-wise breakdown for RM
            if (commissionResult.isRM && commissionResult.monthWiseBreakdown?.length) {
                doc.setFontSize(12);
                doc.text("Month-wise Breakdown:", 14, startY);
                startY += 8;

                autoTable(doc, {
                    head: [["Month", "Gross", "Deductions", "Net", "Threshold", "Eligible", "Commission"]],
                    body: commissionResult.monthWiseBreakdown.map(item => ([
                        item.month,
                        formatCurrency(item.totalLumpsum),
                        formatCurrency(item.deductions),
                        formatCurrency(item.netAmount),
                        formatCurrency(item.threshold),
                        formatCurrency(item.eligibleAfterThreshold),
                        formatCurrency(item.commission)
                    ])),
                    startY: startY,
                    styles: { fontSize: 9 },
                    theme: 'grid',
                    headStyles: { fillColor: [39, 174, 96] }
                });

                startY = doc.lastAutoTable.finalY + 10;
            }

            // Early Redemptions
            if (commissionResult.deductionDetails?.length) {
                doc.setFontSize(12);
                doc.text("Early Redemption Deductions:", 14, startY);
                startY += 8;

                autoTable(doc, {
                    head: [["Client", "Scheme", "Lumpsum Date", "Amount", "Redemption Date", "Days", "Status"]],
                    body: commissionResult.deductionDetails.map(item => ([
                        item.clientName,
                        item.scheme,
                        item.lumpsumDate,
                        formatCurrency(item.lumpsumAmount),
                        item.redemptionDate,
                        `${item.daysDifference} days`,
                        item.status
                    ])),
                    startY: startY,
                    styles: { fontSize: 8 },
                    theme: 'grid',
                    headStyles: { fillColor: [231, 76, 60] },
                    pageBreak: 'auto'
                });
            }
        }

        doc.save(`${commissionResult.transactionType}_Commission_Report.pdf`);
    };

    const memoizedOptions = useMemo(() => {
        const nameToTables = new Map();

        prameshNames.forEach(name => {
            const cleanName = name.trim();
            if (cleanName) {
                const lower = cleanName.toLowerCase();
                if (!nameToTables.has(lower)) {
                    nameToTables.set(lower, []);
                }
                nameToTables.get(lower).push('transaction');
            }
        });

        fflNames.forEach(name => {
            const cleanName = name.trim();
            if (cleanName) {
                const lower = cleanName.toLowerCase();
                if (!nameToTables.has(lower)) {
                    nameToTables.set(lower, []);
                }
                nameToTables.get(lower).push('ffl_transaction');
            }
        });

        const options = [];

        for (const [lowerName, tables] of nameToTables) {
            let originalName = '';
            if (tables.includes('transaction')) {
                originalName = prameshNames.find(n => n.trim().toLowerCase() === lowerName) || '';
            }
            if (!originalName && tables.includes('ffl_transaction')) {
                originalName = fflNames.find(n => n.trim().toLowerCase() === lowerName) || '';
            }
            originalName = originalName.trim();

            const label = capitalizeFirstLetter(originalName);

            options.push({
                label,
                value: originalName,
                tables: tables.sort(),
                originalName
            });
        }

        return { combined: options.sort((a, b) => a.label.localeCompare(b.label)) };
    }, [prameshNames, fflNames, capitalizeFirstLetter]);

    const renderLumpsumDetails = () => {
        if (commissionResult.transactionType !== 'Lumpsum') return null;

        return (
            <div className="lumpsum-details">
                <div className="summary-cards">
                    <div className="summary-card">
                        <h4>Total Lumpsum</h4>
                        <p className="amount">{formatCurrency(commissionResult.totalLumpsum)}</p>
                    </div>
                    <div className="summary-card">
                        <h4>Total Redemptions</h4>
                        <p className="amount">{formatCurrency(commissionResult.totalRedemptions)}</p>
                    </div>
                    <div className="summary-card">
                        <h4>Eligible Amount</h4>
                        <p className="amount">{formatCurrency(commissionResult.total)}</p>
                    </div>
                    <div className="summary-card highlight">
                        <h4>Total Commission</h4>
                        <p className={`amount ${commissionResult.commission < 0 ? 'negative' : ''}`}>
                            {formatCurrency(commissionResult.commission)}
                        </p>
                        <small>({commissionResult.commissionRate})</small>
                    </div>
                </div>

                <div className="commission-type-badge">
                    <span className={`badge ${commissionResult.isRM ? 'rm' : 'non-rm'}`}>
                        {commissionResult.commissionType}
                    </span>
                </div>

                <button
                    className="toggle-details-btn"
                    onClick={() => setDetailedView(!detailedView)}
                >
                    {detailedView ? 'Hide Detailed View' : 'Show Detailed View'}
                </button>

                {detailedView && (
                    <>
                        {commissionResult.monthWiseBreakdown?.length > 0 && (
                            <div className="month-breakdown">
                                <h4>Month-wise Breakdown</h4>
                                <table className="breakdown-table">
                                    <thead>
                                        <tr>
                                            <th>Month</th>
                                            <th>Gross Lumpsum</th>
                                            <th>Redemption Deductions</th>
                                            <th>Net Amount</th>
                                            <th>Threshold (25L)</th>
                                            <th>Eligible Amount</th>
                                            <th>Commission</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {commissionResult.monthWiseBreakdown.map((item, idx) => (
                                            <tr key={idx} className={item.status === 'Below Threshold' ? 'below-threshold' : ''}>
                                                <td>{item.month}</td>
                                                <td>{formatCurrency(item.totalLumpsum)}</td>
                                                <td className="deduction">{formatCurrency(item.deductions)}</td>
                                                <td>{formatCurrency(item.netAmount)}</td>
                                                <td>{formatCurrency(item.threshold)}</td>
                                                <td className={item.eligibleAfterThreshold > 0 ? 'eligible' : 'not-eligible'}>
                                                    {formatCurrency(item.eligibleAfterThreshold)}
                                                </td>
                                                <td className={`commission-amount ${item.commission < 0 ? 'negative' : 'positive'}`}>
                                                    {formatCurrency(item.commission)}
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${item.commission >= 0 ? 'success' : 'danger'}`}>
                                                        {item.status.replace(/Positive|negative/gi, "").trim()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {commissionResult.deductionDetails?.length > 0 && (
                            <div className="deduction-details">
                                <h4>Early Redemption Deductions ({commissionResult.deductionDetails.length})</h4>
                                <p className="note">Redemptions within 2 years of investment are deducted from lumpsum amount</p>
                                <table className="deduction-table">
                                    <thead>
                                        <tr>
                                            <th>Month</th>
                                            <th>Client</th>
                                            <th>Scheme</th>
                                            {/* <th>Lumpsum Date</th> */}
                                            {/* <th>Lumpsum Amount</th> */}
                                            <th>Redemption Date</th>
                                            <th>Days Difference</th>
                                            <th>Redemption Amount</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {commissionResult.deductionDetails.map((item, idx) => (
                                            <tr key={idx} className="deduction-row">
                                                <td>{item.month}</td>
                                                <td>{item.clientName}</td>
                                                <td>{item.scheme}</td>
                                                {/* <td>{item.lumpsumDate}</td> */}
                                                {/* <td>{formatCurrency(item.lumpsumAmount)}</td> */}
                                                <td>{item.redemptionDate}</td>
                                                <td>{item.daysDifference} days</td>
                                                <td className="deduction-amount">{formatCurrency(item.redemptionAmount)}</td>
                                                <td>
                                                    <span className="deduction-badge">Deducted</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {commissionResult.overlappingClients?.length > 0 && (
                            <div className="overlapping-clients">
                                <h4>Clients with Both Lumpsum & Redemptions</h4>
                                <p>Total: {commissionResult.overlappingClients.length} clients</p>
                                <div className="client-tags">
                                    {commissionResult.overlappingClients.map((client, idx) => (
                                        <span key={idx} className="client-tag">{client}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="commission-counter">
            <h3>Commission Calculator</h3>
            <h2>
                Commission for <code className='inline-highlight'>{capitalizeFirstLetter(selectedPerson)}</code> ({transactionType})
            </h2>

            <div className="input-section">
                <div className="form-group">
                    <label>Approach By:</label>
                    <select
                        value={selectedValue}
                        onChange={e => {
                            const value = e.target.value;
                            setSelectedValue(value);

                            const selectedOption = memoizedOptions.combined.find(opt => opt.value === value);
                            if (selectedOption) {
                                setSelectedPerson(selectedOption.originalName);
                            } else {
                                setSelectedPerson('');
                            }
                        }}
                    >
                        <option value="">-- Select Name --</option>
                        {memoizedOptions.combined.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>From Date:</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                </div>

                <div className="form-group">
                    <label>Duration:</label>
                    <select value={duration} onChange={e => setDuration(e.target.value)}>
                        <option value="1">1 Month</option>
                        <option value="3">3 Months</option>
                        <option value="12">1 Year</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Transaction Type:</label>
                    <select value={transactionType} onChange={e => setTransactionType(e.target.value)}>
                        <option value="SIP">SIP</option>
                        <option value="Lumpsum">Lumpsum</option>
                    </select>
                </div>

                <button onClick={calculateCommission} disabled={loading} className="calculate-btn">
                    {loading ? 'Calculating...' : 'Calculate Commission'}
                </button>
            </div>

            {loading && <div className="loading-spinner"></div>}
            {/* <div className="loading-spinner"></div> */}

            {commissionResult?.details?.length > 0 ? (
                <div className="result-container">
                    <h2 className="result-header">
                        Commission for <code className='inline-highlight'>{capitalizeFirstLetter(selectedPerson)}</code>
                    </h2>

                    {commissionResult.transactionType === 'Lumpsum' ? (
                        <>
                            {renderLumpsumDetails()}

                            <div className="transactions-section">
                                <h4>All Transactions ({commissionResult.rows?.length || 0})</h4>
                                <table className="transactions-table">
                                    <thead>
                                        <tr>
                                            <th>RM</th>
                                            <th>Date</th>
                                            <th>Client Name</th>
                                            <th>Transaction Type</th>
                                            <th>Scheme</th>
                                            <th>Amount</th>
                                            <th>Redemption Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {commissionResult.rows?.map((row, idx) => (
                                            <tr key={idx}>
                                                <td>{row.RM}</td>
                                                <td>{formatDate(row.Date)}</td>
                                                <td>{row.Client_Name}</td>
                                                <td>{row.Transaction_Type}</td>
                                                <td>{row.Scheme}</td>
                                                <td>{formatCurrency(row.Amount)}</td>
                                                <td>{row.Redemption_Date || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        // SIP Table (existing)
                        <div className="result-table">
                            <div className="total_rows">
                                <p>Total Rows : <code className='inline-highlight'>{commissionResult?.details?.length}</code></p>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>RM</th>
                                        <th>Date</th>
                                        <th>Client Name</th>
                                        <th>Transaction Type</th>
                                        <th>Scheme</th>
                                        <th>Amount</th>
                                        <th>Incentive</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {commissionResult.details.map((row, idx) => (
                                        <tr key={idx}>
                                            <td>{row.RM}</td>
                                            <td>{formatDate(row.Date)}</td>
                                            <td>{row.Client_Name}</td>
                                            <td>{row.Transaction_Type}</td>
                                            <td>{row.Scheme}</td>
                                            <td>₹{row.Amount}</td>
                                            <td>₹{row.Incentive}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="summary-row">
                                <strong>Total Amount:</strong> ₹{commissionResult.totalAmount}
                            </div>
                            <div className="summary-row">
                                <strong>Total Incentive:</strong> ₹{commissionResult.totalIncentive}
                            </div>
                        </div>
                    )}

                    <div className="export-buttons">
                        <button onClick={exportToExcel} className="export-btn excel">
                            <FaFileExcel style={{ marginRight: '6px', color: 'green' }} />
                            Download Excel
                        </button>
                        <button onClick={exportToPDF} className="export-btn pdf">
                            <FaFilePdf style={{ marginRight: '6px', color: 'red' }} />
                            Download PDF
                        </button>
                    </div>
                </div>
            ) : commissionResult?.details?.length === 0 ? (
                <div className="no-data-message" style={{ textAlign: 'center', marginTop: '20px' }}>
                    <img src="https://res.cloudinary.com/dasparepg/image/upload/v1752559684/noDataFound_zv6zuz.jpg" alt="No Data Found" style={{ width: '250px', maxWidth: '90%' }} />
                    <p style={{ marginTop: '10px', fontWeight: 'bold', color: '#2c387e' }}>
                        No incentive available for <span style={{ color: '#faac4d' }}>{capitalizeFirstLetter(selectedPerson)}</span> in the selected duration.
                    </p>
                </div>
            ) : null}
        </div>
    );
}