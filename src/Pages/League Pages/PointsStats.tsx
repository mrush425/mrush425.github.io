import React, { useState, useEffect, useMemo, ComponentType } from 'react';
import '../../Stylesheets/League Stylesheets/UnifiedStats.css'; 
import LeagueProps from './LeagueProps';
import LeagueNavBar from '../../Navigation/LeagueNavBar';
import LeagueData from '../../Interfaces/LeagueData'; 
// 1. IMPORT THE NEW COMPONENT
import RegularSeasonPoints from './Points Stats/RegularSeasonPoints'; 
import YearlyPointsLeaderboard from './Points Stats/YearlyPointsLeaderboard';
import PlayoffTeamsAveragePoints from './Points Stats/PlayoffTeamsAveragePoints';



// =========================================================================
// TYPE DEFINITIONS: Re-defining PointStatItem and PointComponentProps locally
// =========================================================================

// Interface for the props passed to the nested components
export interface PointComponentProps {
    data: LeagueData[];
    minYears?: number; // Optional filter for minimum years played
}

// Define the structure for an item in your dropdown list
export interface PointStatItem {
    displayName: string; // The name shown in the dropdown
    Component: ComponentType<PointComponentProps>;
}

// =========================================================================
// STAT COMPONENT REGISTRY: Adding RegularSeasonPoints to the list
// =========================================================================

// Populate the list with the available components.
const POINT_COMPONENTS: PointStatItem[] = [ 
    { displayName: 'Average Points Per Game (APG)', Component: RegularSeasonPoints }, 
    { displayName: 'Yearly Average Points Per Game', Component: YearlyPointsLeaderboard },
    { displayName: 'Playoff Teams Average Points', Component: PlayoffTeamsAveragePoints }

];


const PointsStats: React.FC<LeagueProps> = ({ data }) => { 
    
    // UI State
    const [isMobile, setIsMobile] = useState(false); 
    // The viewMode state seems unused in the final JSX, but we keep it
    const [viewMode, setViewMode] = useState<'table' | 'matchup'>('table'); 
    
    // Navigation State
    const [activeIndex, setActiveIndex] = useState<number>(0);

    // FILTER STATE: Default to 3 years
    const [minYears, setMinYears] = useState<number>(3); 

    // Use POINT_COMPONENTS directly
    const items = useMemo(() => POINT_COMPONENTS, []); 

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
        // Sets minYears to 3 if checked, and 0 if unchecked (meaning 1 or more years)
        setMinYears(isChecked ? 3 : 0);
    };


    const selectedItem = items[activeIndex];
    const header = selectedItem?.displayName || 'Points & Stats'; // Renamed header text
    
    // Default component when nothing is loaded
    const SelectedComponent = selectedItem 
        ? selectedItem.Component 
        : () => (
            <div className="notImplementedMessage">
                No points stats available. Please add components to the POINT_COMPONENTS list.
            </div>
        );


    return (
        <div>
            <LeagueNavBar data={data} />
            
            <div className="pointsHeader"> 
                {/* 1. COMPONENT SELECTOR (First element) */}
                <div className="pointsStatsPicker picker-spacing"> 
                    <button
                        className="arrowButton"
                        onClick={() => changeViewByDelta(-1)}
                        disabled={items.length < 2}
                    >
                        &#x2b05;
                    </button>
                    
                    <select
                        className="pointsDropdown" 
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
                
                {/* 2. HEADER (Second element) */}
                <h3>{header}</h3>
                
                {/* 3. FILTER CHECKBOX (NEW POSITION: Third element) */}
                <div className="pointsFilter filter-style"> 
                    <label>
                        <input
                            type="checkbox"
                            checked={minYears === 3}
                            style={{ marginRight: '6px' }} 
                            onChange={(e) => handleFilterChange(e.target.checked)}
                        />
                        Filter teams with fewer than {minYears === 3 ? '3' : '1'} years played
                    </label>
                </div>
                
            </div>
            
            <div className="pointsContainer"> 
                {/* The selected component receives the league data and the minYears filter */}
                <SelectedComponent data={data} minYears={minYears} />
            </div>
        </div>
    );
};

export default PointsStats;