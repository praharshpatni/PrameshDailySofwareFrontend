import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Server_url } from '../Urls/AllData';

const DropdownContext = createContext();

export const DropdownProvider = ({ children }) => {
    const [dropdownFields, setDropdownFields] = useState({});
    // const hasFetchedDropdowns = useRef(false);

    const fetchDropdowns = useCallback(async () => {

        try {
            const res = await axios.get(`${Server_url}/api/dropdowns`);
            setDropdownFields(res.data);
            // console.log("..........", res.data)
        } catch (err) {
            console.error("Failed to fetch dropdowns", err);
        }
    }, []);

    useEffect(() => {
        fetchDropdowns();
    }, [fetchDropdowns]);

    const addOption = (field, value) => {
        axios.post(`${Server_url}/api/dropdowns/add`, { field, value })
            .then(() => setDropdownFields(prev => ({
                ...prev,
                [field]: [...(prev[field] || []), value]
            })))
            .catch(console.error);
    };

    const deleteOption = (field, value) => {
        axios.delete(`${Server_url}/api/dropdowns/delete`, { data: { field, value } })
            .then(() => fetchDropdowns())

            .catch(console.error);
    };

    const renameOption = (field, oldValue, newValue) => {
        axios.put(`${Server_url}/api/dropdowns/rename`, { field, oldValue, newValue })
            .then(() => setDropdownFields(prev => ({
                ...prev,
                [field]: prev[field].map(v => v === oldValue ? newValue : v)
            })))
            .catch(console.error);
    };

    return (
        <DropdownContext.Provider value={{ dropdownFields, addOption, deleteOption, renameOption, refreshDropdowns: fetchDropdowns }}>
            {children}
        </DropdownContext.Provider>
    );
};

export const useDropdowns = () => useContext(DropdownContext);