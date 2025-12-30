import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import { Server_url, showErrorToast, showInfoToast } from '../../Urls/AllData';
import "./ChartGenerator.css";
import { FaChartPie, FaCalendarAlt } from 'react-icons/fa';
import { MdTune } from 'react-icons/md';
import { useSelector } from 'react-redux';

export default function ChartGenerator() {
    const [fromDate, setFromDate] = useState('');
    const [duration, setDuration] = useState('1');
    const [transactionType, setTransactionType] = useState('SIP');
    const [sipType, setSipType] = useState('NewAndExisting');
    const [chartData, setChartData] = useState(null);
    const [amountInfo, setAmountInfo] = useState(null);
    const [monthForClientStats, setMonthForClientStats] = useState('');
    const [clientChartData, setClientChartData] = useState(null);
    const [clientRawStats, setClientRawStats] = useState([]);
    const [startDateInfo, setStartDateInfo] = useState(null);

    const currentUserEmail = useSelector(state => state.user.currentUser);

    const chartRef = useRef(null);

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: false },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { stepSize: 1, precision: 0 },
            },
        },
    };

    useEffect(() => {
        const loadOverview = async () => {
            try {
                const [overviewRes, startRes] = await Promise.all([
                    axios.get(`${Server_url}/api/chart-overview`, {
                        headers: { email: currentUserEmail.email }
                    }),
                    axios.get(`${Server_url}/api/chart-start-date`)
                ]);

                // console.log("overview response data", overviewRes)
                // console.log("start response data", startRes)

                setChartData(overviewRes.data.chart);
                setAmountInfo(overviewRes.data.amounts);
                setTransactionType("SIPandLumpsum");
                setSipType("NewAndExisting");
                setStartDateInfo(startRes.data.startDate);
            } catch (err) {
                console.error("Overview error:", err);
            }
        };

        if (currentUserEmail?.email) {
            loadOverview();
        }
    }, [currentUserEmail]);

    useEffect(() => {
        if (fromDate && duration) {
            const from = new Date(fromDate);
            const to = new Date(from);
            to.setMonth(to.getMonth() + parseInt(duration));

            const now = new Date();
            if (to > now) {
                showInfoToast("Selected duration exceeds current month. Please adjust.");
                setFromDate('');
            }
        }
    }, [fromDate, duration]);

    const handleGenerateChart = async () => {
        if (!fromDate || !duration) {
            showInfoToast("Please fill all required fields.");
            return;
        }

        try {
            const res = await axios.post(`${Server_url}/api/chart-data`, {
                fromDate,
                duration
            }, {
                headers: {
                    email: currentUserEmail?.email  // safely get the email
                }
            });

            setChartData(res.data.chart);
            setAmountInfo(res.data.amounts);
            setClientChartData(null);
            setClientRawStats([]);
        } catch (err) {
            console.error("Chart Data Load Error:", err);
            showErrorToast("Failed to load chart data");
        }
    };


    const handleClientStats = async () => {
        try {
            const res = await axios.post(`${Server_url}/api/client-stats`, { month: monthForClientStats, email: currentUserEmail?.email });
            setClientChartData(res.data.chart);
            setClientRawStats(res.data.rawData);
            setChartData(null);
            setAmountInfo(null);
        } catch (err) {
            showErrorToast("Failed to fetch client stats");
        }
    };

    const downloadChartAsPDF = async () => {
        const chartElement = chartRef.current;
        if (!chartElement) return;

        const btn = chartElement.querySelector('.no-print');
        if (btn) btn.style.display = 'none';

        const canvas = await html2canvas(chartElement);
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const a4Width = 841.89;
        const a4Height = 595.28;
        const ratio = Math.min(a4Width / canvas.width, a4Height / canvas.height);

        const imgWidth = canvas.width * ratio;
        const imgHeight = canvas.height * ratio;
        const x = (a4Width - imgWidth) / 2;
        const y = (a4Height - imgHeight) / 2;

        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
        pdf.save('chart-report.pdf');

        if (btn) btn.style.display = 'block';
    };

    const formatDateDMY = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    return (
        <div className="chart-layout">
            <div className="controls">
                <h3>
                    <MdTune style={{ color: '#3f51b5' }} /> Chart Controls
                </h3>

                {clientChartData && !chartData && monthForClientStats && (
                    <p style={{ fontSize: "13px", marginTop: "4px", color: "gray", display: "flex", alignItems: "center", gap: "6px" }}>
                        <FaChartPie style={{ color: "#4caf50" }} />
                        Showing client data from <strong>{formatDateDMY(`${monthForClientStats}-01`)}</strong> to <strong>{formatDateDMY(new Date())}</strong>
                    </p>
                )}

                {!clientChartData && chartData && startDateInfo && (
                    <p style={{ fontSize: "13px", marginTop: "4px", color: "gray", display: "flex", alignItems: "center", gap: "6px" }}>
                        <FaCalendarAlt style={{ color: "#2196f3" }} />
                        Business data available from: <strong>{formatDateDMY(startDateInfo)}</strong>
                    </p>
                )}

                <label>From Date:</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />

                <label>Duration (months):</label>
                <select value={duration} onChange={e => setDuration(e.target.value)}>
                    <option value="1">1 Month</option>
                    <option value="3">3 Months</option>
                    <option value="12">1 Year</option>
                </select>

                <label>Transaction Type:</label>
                <select value={transactionType} onChange={e => setTransactionType(e.target.value)}>
                    <option value="SIP">SIP</option>
                    <option value="Lumpsum">Lumpsum</option>
                    <option value="SIPandLumpsum">SIP and Lumpsum</option>
                </select>

                {transactionType !== 'SIPandLumpsum' && (
                    <>
                        <label>SIP Type:</label>
                        <select value={sipType} onChange={e => setSipType(e.target.value)}>
                            <option value="NewAndExisting">New and Existing</option>
                            <option value="New">New</option>
                            <option value="Existing">Existing</option>
                        </select>
                    </>
                )}

                <button onClick={handleGenerateChart}>Generate Chart</button>
                <hr />

                <label>Monthwise Client Transaction Status</label>
                <input type="month" value={monthForClientStats} onChange={e => setMonthForClientStats(e.target.value)} />
                <button onClick={handleClientStats}>Show Client Stats</button>
            </div>

            <div className="chart-area" ref={chartRef}>
                {!chartData && !clientChartData && (
                    <div className="no-chart-msg">
                        <img src="https://res.cloudinary.com/dasparepg/image/upload/v1752559684/chart_illustration_ndbt9d.jpg" alt="" />
                        <p>No charts generated yet</p>
                        <p>Please use the controls to generate a chart</p>
                    </div>
                )}

                {chartData && !clientChartData && (
                    <>
                        {transactionType === 'SIPandLumpsum' ? (
                            <div className='chart'>
                                <Pie data={chartData} options={chartOptions} />
                            </div>
                        ) : (
                            <Bar data={chartData} options={chartOptions} />
                        )}

                        {amountInfo && (
                            <div className="amount-info">
                                <p><strong style={{ backgroundColor: "yellow", padding: "0px 5px" }}>Net Amount:</strong> ₹{(amountInfo.netAmount || 0).toLocaleString('en-IN')}</p>
                                <ul style={{ listStyle: 'none', fontSize: '14px' }}>
                                    <li><strong style={{ color: '#3f51b5' }}>New SIP:</strong> ₹{(amountInfo.newSIP || 0).toLocaleString('en-IN')}</li>
                                    <li><strong style={{ color: '#ff9800' }}>Re-SIP:</strong> ₹{(amountInfo.reSIP || 0).toLocaleString('en-IN')}</li>
                                    <li><strong style={{ color: '#4caf50' }}>Lumpsum:</strong> ₹{(amountInfo.lumpsum || 0).toLocaleString('en-IN')}</li>
                                    <li><strong style={{ color: '#f44336' }}>Additional:</strong> ₹{(amountInfo.additional || 0).toLocaleString('en-IN')}</li>
                                    <li><strong style={{ color: '#9c27b0' }}>Redemption:</strong> ₹{(amountInfo.redemption || 0).toLocaleString('en-IN')}</li>
                                </ul>
                            </div>
                        )}
                    </>
                )}


                {clientChartData && !chartData && (
                    <>
                        <Bar data={clientChartData} options={chartOptions} />
                        {clientRawStats.length > 0 && (
                            <div>
                                <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px' }} className='client_calculation'>
                                    {clientRawStats.map((item, idx) => (
                                        <li key={idx}><strong style={{ backgroundColor: "yellow", padding: "0px 5px" }}>{item.Client_Type}</strong> :{item.count}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}

                {(chartData || clientChartData) && (
                    <div className="no-print">
                        <button onClick={downloadChartAsPDF} className="download-btn">
                            Download Chart as PDF
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
