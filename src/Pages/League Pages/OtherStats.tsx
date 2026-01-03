// OtherStats.tsx

import React, { useState, useEffect, useMemo } from 'react';
import '../../Stylesheets/League Stylesheets/UnifiedStats.css';
import LeagueProps from './LeagueProps'; 
import LeagueNavBar from '../../Navigation/LeagueNavBar';
import LeagueData from '../../Interfaces/LeagueData'; 
import { OtherStatItem, OtherComponentProps } from '../../Interfaces/OtherStatItem'; 
import DraftPositionVsPlace from './OtherStats/DraftPositionVsPlace';
import DraftChoiceVsPlace from './OtherStats/DraftChoiceVsPlace';


// 1. IMPORT YOUR NEW STATISTIC COMPONENT
import PlaceStats from './OtherStats/PlaceStats'; 
import StreakComponent from './OtherStats/StreakComponent';



// Placeholder for your statistical components
const STAT_COMPONENTS: OtherStatItem[] = [
    // 2. INSERT THE NEW COMPONENT
    { displayName: 'League Placement Stats', Component: PlaceStats },
    { displayName: 'Draft Position vs. Place', Component: DraftPositionVsPlace },
    { displayName: 'Draft Choice vs. Place', Component: DraftChoiceVsPlace },
    { displayName: 'Win/Lose Streaks', Component: StreakComponent },
    
    // Example of future components (using a mock component for now if needed, 
    // otherwise, replace/remove all mock references)
    // { displayName: 'All-Time Awards', Component: MockOtherStatComponent }, 
    // { displayName: 'Playoff History', Component: MockOtherStatComponent }, 
];


const OtherStats: React.FC<LeagueProps> = ({ data }) => {
    
    // UI State
    const [isMobile, setIsMobile] = useState(false); 
    
    // Navigation State
    const [activeIndex, setActiveIndex] = useState<number>(0);

    // FILTER STATE: Default to 3 years
    const [minYears, setMinYears] = useState<number>(3); 

    const items = useMemo(() => STAT_COMPONENTS, []);

    // Screen resize logic
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleViewChange = (index: number) => {
        if (index >= 0 && index < items.length) {
            setActiveIndex(index);
        }
    };

    const changeViewByDelta = (delta: 1 | -1) => {
        if (items.length === 0) return;
        
        let newIndex = (activeIndex + delta);
        if (newIndex < 0) {
            newIndex = items.length - 1; 
        } else if (newIndex >= items.length) {
            newIndex = 0;
        }
        handleViewChange(newIndex);
    };

    // Filter Change Handler
    const handleFilterChange = (isChecked: boolean) => {
        // Sets minYears to 3 if checked, otherwise 1 (meaning all teams)
        setMinYears(isChecked ? 3 : 0); 
    };


    const selectedItem = items[activeIndex];
    const header = selectedItem?.displayName || 'Other Stats';
    
    const SelectedComponent = selectedItem 
        ? selectedItem.Component 
        : () => (
            <div className="notImplementedMessage">
                No stats available. Please add components to the STAT_COMPONENTS list.
            </div>
        );


    return (
        <div>
            <LeagueNavBar data={data} />
            
            <div className="recordsHeader"> 
                {/* 1. COMPONENT SELECTOR */}
                <div className="recordsStatsPicker picker-spacing">
                    <button
                        className="arrowButton"
                        onClick={() => changeViewByDelta(-1)}
                        disabled={items.length < 2}
                    >
                        &#x2b05; {/* Left Arrow */}
                    </button>
                    
                    <select
                        className="recordsDropdown"
                        value={activeIndex}
                        onChange={(e) => handleViewChange(Number(e.target.value))}
                        disabled={items.length === 0}
                    >
                        {items.length === 0 ? (
                            <option value={0}>No Stats Loaded</option>
                        ) : (
                            items.map((item, index) => (
                                <option key={item.displayName} value={index}>
                                    {item.displayName}
                                </option>
                            ))
                        )}
                    </select>
                    
                    <button
                        className="arrowButton"
                        onClick={() => changeViewByDelta(1)}
                        disabled={items.length < 2}
                    >
                        &#x27a1; {/* Right Arrow */}
                    </button>
                </div>
                
                {/* 2. HEADER */}
                <h3>{header}</h3>
                
                {/* 3. FILTER CHECKBOX */}
                <div className="recordsFilter filter-style">
                    <label>
                        <input
                            type="checkbox"
                            checked={minYears === 3}
                            style={{ marginRight: '6px' }} 
                            onChange={(e) => handleFilterChange(e.target.checked)}
                        />
                        Filter teams with fewer than **3** years played
                    </label>
                </div>
                
            </div>
            
            <div className="recordsContainer">
                {/* Render the currently selected stat component, passing data and filter */}
                <SelectedComponent data={data} minYears={minYears} />
            </div>
        </div>
    );
};

export default OtherStats;