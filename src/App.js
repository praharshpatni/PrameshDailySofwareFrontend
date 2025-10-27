import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "./Redux/UserSlice";
import LoginErrorPage from "./Components/LoginPage/LoginErrorPage";
import LoginPage from "./Components/LoginPage/LoginPage";
import Header from "./Components/Header";
import Sidebar from "./Components/Sidebar";
import MainContent from "./Components/MainContent";
import SettingsPage from "./Components/SettingsPage/SettingsPage";
import "./App.css";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

import { setFavicon } from "./Urls/AllData";
import useInactivityLogout from "./hooks/useInactivityLogout";

const MainLayout = React.memo(({ activeModule, setActiveModule, isSidebarPinned, setIsSidebarPinned }) => {
  return (
    <div className="app">
      <Header />
      <div className="layout">
        <Sidebar
          onSelectModule={setActiveModule}
          activeModule={activeModule}
          isPinned={isSidebarPinned}
          setIsPinned={setIsSidebarPinned}
        />
        <MainContent
          activeModule={activeModule}
          isSidebarPinned={isSidebarPinned}
        />
      </div>
    </div>
  );
});

function App() {
  const [activeModule, setActiveModule] = useState("Analysis");
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const location = useLocation();
  const dispatch = useDispatch();
  const allUsers = useSelector((state) => state.user.users);
  const currentUserEmail = useSelector((state) => state.user.currentUser?.email);

  // Add the inactivity logout hook
  useInactivityLogout();

  useEffect(() => {
    if (!currentUserEmail || allUsers.length === 0) return;

    // const currentUser = allUsers.find((user) => user.email === currentUserEmail);
    // const currentUserName = currentUser?.name;

    // console.log("🔐 Logged in user:", currentUser);
    // console.log("📦 current user name:", currentUserName);
    // console.log("📦 allUsers:", allUsers);
  }, [currentUserEmail, allUsers]);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const { email, name } = parsed;

        if (email && name) {
          dispatch(loginUser({ email, name }));
          setIsLoggedIn(true);
        } else {
          console.warn("Invalid session data:", parsed);
          setIsLoggedIn(false);
        }
      } catch (err) {
        console.error("Failed to parse session user:", err);
        setIsLoggedIn(false);
      }
    } else {
      setIsLoggedIn(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (location.pathname.includes("/settings")) {
      setFavicon("/setting.ico");
    } else {
      setFavicon("/PrameshWealth_cropped-removebg-preview.ico");
    }
  }, [location]);

  useEffect(() => {
    const handler = (e) => {
      const key = e.key.toLowerCase();
      if ((e.altKey && e.shiftKey && key === "p") || (e.ctrlKey && key === "b")) {
        e.preventDefault();
        setIsSidebarPinned((prev) => !prev);
      }

      if (e.altKey) {
        switch (key) {
          case "1":
            setActiveModule("Analysis");
            break;
          case "2":
            setActiveModule("Pramesh");
            break;
          case "3":
            setActiveModule("FFL");
            break;
          case "4":
            setActiveModule("FD");
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLoginSuccess = useCallback(
    ({ email, name }) => {
      if (!email || !name) {
        console.error("Cannot store user — missing data:", { email, name });
        return;
      }
      sessionStorage.setItem("user", JSON.stringify({ email, name }));
      dispatch(loginUser({ email, name }));
      setIsLoggedIn(true);
    },
    [dispatch]
  );

  const memoizedMainLayoutProps = useMemo(
    () => ({
      activeModule,
      setActiveModule,
      isSidebarPinned,
      setIsSidebarPinned,
    }),
    [activeModule, isSidebarPinned]
  );

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
        style={{ zIndex: 99999 }}
      />

      <Routes>
        <Route
          path="/"
          element={
            isLoggedIn ? <Navigate to="/main" /> : <LoginPage onLoginSuccess={handleLoginSuccess} />
          }
        />
        <Route path="/login-error" element={<LoginErrorPage />} />
        <Route
          path="/main"
          element={isLoggedIn ? <MainLayout {...memoizedMainLayoutProps} /> : <Navigate to="/" />}
        />
        <Route
          path="/settings"
          element={isLoggedIn ? <SettingsPage /> : <Navigate to="/" />}
        />
      </Routes>

    </>
  );
}

export default React.memo(App);