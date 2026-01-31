import React, { useState, useEffect, useMemo } from 'react';
import '../../Stylesheets/League Stylesheets/UnifiedStats.css';
import LeagueProps from './LeagueProps';
import LeagueNavBar from '../../Navigation/LeagueNavBar';
import LeagueData from '../../Interfaces/LeagueData'; 
import { RecordStatItem } from '../../Interfaces/RecordStatItem'; 
import RegularSeasonRecords from './Records Stats/RegularSeasonRecords';
import PlayoffRecords from './Records Stats/PlayoffRecords';
import WaffleStats from './Records Stats/WaffleStats';
import PlayoffOddsByRecord from './Records Stats/PlayoffOddsByRecord';
import IndividualSeasonRecords from './Records Stats/IndividualSeasonRecords';


// Placeholder for your statistical components
const STAT_COMPONENTS: RecordStatItem[] = [
    { displayName: 'Regular Season Records', Component: RegularSeasonRecords }, 
    { displayName: 'Playoff Records', Component: PlayoffRecords },
    { displayName: 'Individual Season Records', Component: IndividualSeasonRecords },
    { displayName: 'The Waffle', Component: WaffleStats}, 
    { displayName: 'Playoff Odds by Record', Component: PlayoffOddsByRecord },

    // { displayName: 'All-Time Wins', Component: AllTimeWins }, // Example of future components
];


const RecordsStats: React.FC<LeagueProps> = ({ data }) => {
    
    // UI State
    const [isMobile, setIsMobile] = useState(false); 
    const [viewMode, setViewMode] = useState<'table' | 'matchup'>('table'); 
    
    // Navigation State
    const [activeIndex, setActiveIndex] = useState<number>(0);

    // NEW FILTER STATE: Default to 0 years (checkbox unchecked)
    const [minYears, setMinYears] = useState<number>(0); 

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
        setMinYears(isChecked ? 3 : 0);
    };


    const selectedItem = items[activeIndex];
    const header = selectedItem?.displayName || 'Records & Stats';
    
    const SelectedComponent = selectedItem 
        ? selectedItem.Component 
        : () => (
            <div className="notImplementedMessage">
                No records available. Please add components to the STAT_COMPONENTS list.
            </div>
        );


    return (
        <div>
            <LeagueNavBar data={data} />
            
            <div className="recordsHeader"> 
                {/* 1. COMPONENT SELECTOR (First element) */}
                <div className="recordsStatsPicker picker-spacing">
                    <button
                        className="arrowButton"
                        onClick={() => changeViewByDelta(-1)}
                        disabled={items.length < 2}
                    >
                        &#x2b05;
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
                        &#x27a1;
                    </button>
                </div>
                
                {/* 2. FILTER CHECKBOX (Second element) */}
                <div className="recordsFilter filter-style">
                    <label>
                        <input
                            type="checkbox"
                            checked={minYears === 3}
                            style={{ marginRight: '6px' }} 
                            onChange={(e) => handleFilterChange(e.target.checked)}
                        />
                        Filter teams with fewer than 3 years played
                    </label>
                </div>
                
            </div>
            
            <div className="recordsContainer">
                <SelectedComponent data={data} minYears={minYears} />
            </div>
        </div>
    );
};

export default RecordsStats;