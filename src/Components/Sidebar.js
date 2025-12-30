import './Styles/Sidebar.css';
// import pramesh_logo from "./../Assets/Pramesh Logo.png";
// import pramesh_logo_cropped from "./../Assets/PrameshWealth_cropped-removebg-preview.png";

export default function Sidebar({ onSelectModule, activeModule, isPinned, setIsPinned }) {
    const getTopPosition = () => {
        switch (activeModule) {
            case 'Analysis': return '64px';
            case 'Pramesh': return '128px';
            case 'FFL': return '188px';
            case 'RealValue': return '248px';
            case 'FD': return '307px';
            default: return '0px';
        }
    };

    const togglePin = () => {
        setIsPinned(!isPinned);
    };

    return (
        <aside className={`sidebar ${isPinned ? '' : 'unpinned'}`}>
            <div
                className="pin-toggle"
                onClick={togglePin}
                title="Toggle Sidebar (Alt+Shift+P or Ctrl+B)"
            >
                {isPinned ? (
                    <img src="https://res.cloudinary.com/dasparepg/image/upload/v1752559684/Pramesh_Logo_r7pens.png" alt="Toggle Sidebar" />
                ) : (
                    <img
                        src="https://res.cloudinary.com/dasparepg/image/upload/v1752559685/PrameshWealth_cropped-removebg-preview_zpdmxp.png"
                        alt="Toggle Sidebar"
                        className="cropped_image"
                    />
                )}
            </div>

            <div className="background_part" style={{ top: getTopPosition() }}></div>

            {isPinned ? (
                <>
                    <button
                        onClick={() => onSelectModule('Analysis')}
                        className={`sidebar-item first_button ${activeModule === 'Analysis' ? 'selected' : ''}`}
                        title='Shortcut: alt + 1'
                    >
                        Analysis
                    </button>
                    <button
                        onClick={() => onSelectModule('Pramesh')}
                        className={`sidebar-item ${activeModule === 'Pramesh' ? 'selected' : ''}`}
                        title='Shortcut: alt + 2'
                    >
                        Pramesh
                    </button>
                    <button
                        onClick={() => onSelectModule('FFL')}
                        className={`sidebar-item ${activeModule === 'FFL' ? 'selected' : ''}`}
                        title='Shortcut: alt + 3'
                    >
                        FFL
                    </button>
                    <button
                        onClick={() => onSelectModule('RealValue')}
                        className={`sidebar-item ${activeModule === 'RealValue' ? 'selected' : ''}`}
                        title='Shortcut: alt + 4'
                    >
                        RealValue
                    </button>
                    <button
                        onClick={() => onSelectModule('FD')}
                        className={`sidebar-item ${activeModule === 'FD' ? 'selected' : ''}`}
                        title='Shortcut: alt + 5'
                    >
                        FD
                    </button>
                </>
            ) : (
                <>
                    <div className="unpinned_background_part" style={{ top: getTopPosition() }}></div>

                    <div
                        className={`unpinned_first ${activeModule === 'Analysis' ? 'selected' : ''}`}
                        onClick={() => onSelectModule('Analysis')}
                    >
                        A
                    </div>
                    <div
                        className={`unpinned_second ${activeModule === 'Pramesh' ? 'selected' : ''}`}
                        onClick={() => onSelectModule('Pramesh')}
                    >
                        P
                    </div>
                    <div
                        className={`unpinned_third ${activeModule === 'FFL' ? 'selected' : ''}`}
                        onClick={() => onSelectModule('FFL')}
                    >
                        F
                    </div>
                    <div
                        className={`unpinned_fourth ${activeModule === 'Real Value' ? 'selected' : ''}`}
                        onClick={() => onSelectModule('RealValue')}
                    >
                        RV
                    </div>
                    <div
                        className={`unpinned_fifth ${activeModule === 'FD' ? 'selected' : ''}`}
                        onClick={() => onSelectModule('FD')}
                    >
                        FD
                    </div>
                </>
            )}
        </aside>
    );
}