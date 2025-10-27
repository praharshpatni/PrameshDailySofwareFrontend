import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { emailToRMMap, unrestricted_adminEmails } from '../Urls/AllData';

export default function useFilteredRowsByRM(rows) {
    const currentUserEmail = useSelector(state => state.user.currentUser?.email);

    // const emailToRMMap = {
    //     'vishalvaidya@gmail.com': 'Vishal Vaidya'
    // };

    // const unrestrictedEmails = ['divya@gmail.com', 'admin@example.com', 'praharshpatni@gmail.com'];
    const currentRM = emailToRMMap[currentUserEmail?.toLowerCase()];
    const isUnrestricted = unrestricted_adminEmails.includes(currentUserEmail?.toLowerCase());

    const filteredRows = useMemo(() => {
        if (!currentUserEmail) return [];

        // const email = currentUserEmail.toLowerCase();

        if (isUnrestricted) {
            return rows;
        }

        // ✅ For restricted users: show only rows with matching RM (ignore empty RM rows)
        if (!currentRM) return [];

        return rows.filter(row => {
            const rmValue = (row.RM || '').toLowerCase();
            return rmValue && rmValue === currentRM.toLowerCase();
        });
    }, [rows, currentUserEmail, currentRM, isUnrestricted]);

    return { filteredRows, isUnrestricted, currentRM };
}
