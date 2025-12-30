import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    activeSubmodule: 'KYC',
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setActiveSubmodule: (state, action) => {
            state.activeSubmodule = action.payload;
        },
    },
});

export const { setActiveSubmodule } = uiSlice.actions;
export default uiSlice.reducer;