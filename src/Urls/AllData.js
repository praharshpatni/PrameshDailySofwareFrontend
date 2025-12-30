import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// import { MdInfo } from "react-icons/md";
// import { MdCheckCircle } from "react-icons/md";
// import { MdError } from "react-icons/md";

// export const Server_url = "http://localhost:4000";
// export const socket_url = "http://localhost:4000";
// export const Server_url = "http://10.27.55.233:4000";
// export const socket_url = "http://10.27.55.233:4000";
export const Server_url = "http://192.168.0.192:4000";
export const socket_url = "http://192.168.0.192:4000";
// export const Server_url = "http://192.168.0.194:4000";
// export const socket_url = "http://192.168.0.194:4000";
// export const Server_url = "https://dataentry.prameshwealth.com";
// export const socket_url = "https://dataentry.prameshwealth.com";
// export const Server_url = "http://192.168.1.5:4000";
// export const socket_url = "http://192.168.1.5:4000";
// export const Server_url = process.env.REACT_APP_SERVER_URL;
// export const socket_url = process.env.REACT_APP_SOCKET_URL;

// AllData.js
export const emailToRMMap = {
    'vishalvaidya@gmail.com': 'Vishal Vaidya',
    "bhumika@prameshwealth.com": "Bhumika",
    "happy@prameshwealth.com": "Happy",
    "vinayak@prameshwealth.com": "Vinayak Shelar",
    "navneet@prameshwealth.com": "Navneet Mishra"
};

export const unrestricted_adminEmails = ['admin@gmail.com', 'praharsh@prameshwealth.com', 'prachi@prameshwealth.com', "krishna@prameshwealth.com", 'arpita@prameshwealth.com', "shweta@prameshwealth.com"];



// src/utils/setFavicon.js
export const setFavicon = (iconPath) => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
    }
    link.href = iconPath;
};

// ✅ Call this once in the app root (App.js)
export const showInfoToast = (message) => {
    toast.info(message, {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: false,
        // icon: <MdInfo color="#8a6d00" size={20} />, // custom icon color
        style: {
            background: "#fffbe6",
            color: "#8a6d00",
            fontWeight: "500"
        }
    });
};


export const showSuccessToast = (message) => {
    toast.success(message, {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: false,
        style: {
            background: "#e6f4ea",
            color: "#256029",
            fontWeight: "500"
        }
    });
};

export const showErrorToast = (message) => {
    toast.error(message, {
        position: "top-right",
        autoClose: 2500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: false,
        // icon: <MdError color="#991b1b" size={20} />,
        style: {
            background: "#ffe5e5",
            color: "#991b1b",
            fontWeight: "500"
        }
    });
};