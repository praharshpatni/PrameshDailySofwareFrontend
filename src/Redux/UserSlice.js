// src/redux/userSlice.js
import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
    name: 'user',
    initialState: {
        users: [], // to hold multiple logged-in users
        currentUser: null // email of current user
    },
    reducers: {
        loginUser: (state, action) => {
            const { email, name } = action.payload;

            const existingUser = state.users.find(u => u.email === email);
            if (!existingUser) {
                state.users.push({ email, name });
            }

            // 🔧 Store full object
            state.currentUser = { email, name };
        },

        logoutUser: (state) => {
            state.currentUser = null;
        },
        removeUser: (state, action) => {
            const email = action.payload;
            state.users = state.users.filter(user => user.email !== email);

            if (state.currentUser === email) {
                state.currentUser = null;
            }
        }
    }
});

export const { loginUser, logoutUser, removeUser } = userSlice.actions;
export default userSlice.reducer;
