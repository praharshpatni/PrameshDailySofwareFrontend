import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './CommissionCounter.css';
import { Server_url, showErrorToast, showInfoToast } from '../../Urls/AllData';
import { FaFileExcel, FaFilePdf } from 'react-icons/fa';
// import NoDataFound from "./../../Assets/noDataFound.jpg";

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
        console.log("running commission calculation")
        if (!selectedValue || !fromDate || !duration) return showInfoToast("Please fill all fields");
        if (!validateDateRange()) return showInfoToast("Selected duration exceeds current month. Please adjust.");

        const [tableRaw, nameRaw] = selectedValue.split('|');
        const table = tableRaw.trim();
        const name = nameRaw.trim();

        try {
            setLoading(true);
            const res = await axios.post(`${Server_url}/api/calculate-commission`, {
                approach_by: name,
                fromDate,
                duration,
                table,
                transactionType
            });

            const rows = res.data.rows || [];

            let totalAmount = 0;
            let totalIncentive = 0;

            const details = rows.map(row => {
                const amount = parseFloat(row.Amount) || 0;
                totalAmount += amount;

                // Row-wise incentive calculation
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
                details
            });
        } catch (err) {
            console.error("Error calculating commission", err);
            showErrorToast("Failed to calculate commission");
        } finally {
            setLoading(false);
        }
    };

    const capitalizeFirstLetter = useCallback(str => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(), []);

    const exportToExcel = () => {
        if (!commissionResult?.details?.length) return showInfoToast("No data to export");

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
    };


    const exportToPDF = () => {
        if (!commissionResult?.details?.length) return showInfoToast("No data to export");

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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

        doc.save("Commission_Report.pdf");
    };

    const memoizedOptions = useMemo(() => ({
        pramesh: prameshNames.map(name => ({ label: capitalizeFirstLetter(name), value: `transaction|${name}` })),
        ffl: fflNames.map(name => ({ label: capitalizeFirstLetter(name), value: `ffl_transaction|${name}` })),
    }), [prameshNames, fflNames, capitalizeFirstLetter]);

    return (
        <div className="commission-counter">
            <h3>Commission Calculator</h3>
            <h2 style={{ marginBottom: '25px' }}>
                Commission for <span style={{ backgroundColor: "#faac4d", padding: "0px 0px" }}>{capitalizeFirstLetter(selectedPerson)}</span> ({transactionType})
            </h2>


            <label>Approach By:</label>
            <select
                value={selectedValue}
                onChange={e => {
                    const value = e.target.value;
                    setSelectedValue(value);
                    const name = value.split('|')[1]?.trim() || '';
                    setSelectedPerson(name);
                }}
            >
                <option value="">-- Select Name --</option>
                <optgroup label="Pramesh">
                    {memoizedOptions.pramesh.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </optgroup>
                <optgroup label="FFL">
                    {memoizedOptions.ffl.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </optgroup>
            </select>

            <label>From Date:</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />

            <label>Duration:</label>
            <select value={duration} onChange={e => setDuration(e.target.value)}>
                <option value="1">1 Month</option>
                <option value="4">4 Months</option>
                <option value="12">1 Year</option>
            </select>
            <label>Transaction Type:</label>
            <select value={transactionType} onChange={e => setTransactionType(e.target.value)}>
                <option value="SIP">SIP</option>
                <option value="Lumpsum">Lumpsum</option>
            </select>

            <button onClick={calculateCommission} disabled={loading}>
                {loading ? 'Calculating...' : 'Calculate'}
            </button>

            {loading && <p style={{ marginTop: '10px' }}>🔄 Fetching data...</p>}

            {commissionResult?.details?.length > 0 ? (
                <div className="result-table">
                    <h2 style={{ marginBottom: '10px' }}>
                        Commission for <span style={{ backgroundColor: "#faac4d", padding: "0px 8px" }}>{capitalizeFirstLetter(selectedPerson)}</span>
                    </h2>
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

                    <div className="export-buttons">
                        <button onClick={exportToExcel}><FaFileExcel style={{ marginRight: '6px', color: 'green' }} />Download Excel</button>
                        <button onClick={exportToPDF}><FaFilePdf style={{ marginRight: '6px', color: 'red' }} />Download PDF</button>
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
