import React, { useState, useEffect, useMemo, ComponentType } from 'react';
import '../../Stylesheets/League Stylesheets/UnifiedStats.css'; 
import LeagueProps from './LeagueProps';
import LeagueNavBar from '../../Navigation/LeagueNavBar';
import LeagueData from '../../Interfaces/LeagueData'; 
// 1. IMPORT THE NEW COMPONENT
import RegularSeasonPoints from './Points Stats/RegularSeasonPoints'; 
import YearlyPointsLeaderboard from './Points Stats/YearlyPointsLeaderboard';
import PlayoffTeamsAveragePoints from './Points Stats/PlayoffTeamsAveragePoints';
import PlayoffAveragePointsPerGame from './Points Stats/PlayoffAveragePointsPerGame';
import YearlyPlayoffAveragePointsPerGame from './Points Stats/YearlyPlayoffAveragePointsPerGame';
import WeeklyPointsLeaderboard from './Points Stats/WeeklyPointsLeaderboard';
import Heartbreaker from './Points Stats/Heartbreaker';
import GetWreckd from './Points Stats/GetWreckd';
import BetterLuckyThanGood from './Points Stats/BetterLuckyThanGood';
import BeingABossWhenItCounts from './Points Stats/BeingABossWhenItCounts';
import ComingInHot from './Points Stats/ComingInHot';
import MaybeNextTime from './Points Stats/MaybeNextTime';
import KickedInDaBallz from './Points Stats/KickedInDaBallz';
import ConnarEffect from './Points Stats/ConnarEffect';
import GetRunOver from './Points Stats/GetRunOver';
import ReceivingLosses from './Points Stats/ReceivingLosses';
import KilledByATightEnd from './Points Stats/KilledByATightEnd';
import BlueBalls from './Points Stats/BlueBalls';
import WeeklyScoreAverages from './Points Stats/WeeklyScoreAverages';



// =========================================================================
// TYPE DEFINITIONS: Re-defining PointStatItem and PointComponentProps locally
// =========================================================================

// Interface for the props passed to the nested components
export interface PointComponentProps {
    data: LeagueData[];
    minYears?: number; // Optional filter for minimum years played
    includeRegularSeason?: boolean; // Optional filter for including regular season weeks
    includePlayoffs?: boolean; // Optional filter for including playoff weeks
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
    { displayName: 'Playoff Average Points Per Game', Component: PlayoffAveragePointsPerGame },
    { displayName: 'Yearly Playoff Average Points Per Game', Component: YearlyPlayoffAveragePointsPerGame },
    { displayName: 'Playoff Teams Average Points', Component: PlayoffTeamsAveragePoints },
    { displayName: 'Weekly Points Leaderboard', Component: WeeklyPointsLeaderboard }, // Example placeholder
    { displayName: 'Weekly Score Averages', Component: WeeklyScoreAverages },
    { displayName: 'Heartbreaker', Component: Heartbreaker },
    { displayName: 'GetWreckd', Component: GetWreckd }, 
    { displayName: 'Better Lucky Than Good', Component: BetterLuckyThanGood },
    { displayName: 'Being a Boss When it Counts', Component: BeingABossWhenItCounts },
    { displayName: 'Coming in Hot', Component: ComingInHot},
    { displayName: 'Maybe Next Time', Component: MaybeNextTime},
    { displayName: 'Kicked In Da Ballz', Component: KickedInDaBallz},
    { displayName: 'Connar Effect' , Component: ConnarEffect },
    { displayName: 'Get Run Over', Component: GetRunOver },
    { displayName: 'Receiving Losses', Component: ReceivingLosses },
    { displayName: 'Killed By a Tight End', Component: KilledByATightEnd },
    { displayName: 'Blue Balls', Component: BlueBalls },
];


const PointsStats: React.FC<LeagueProps> = ({ data }) => { 
    
    // UI State
    const [isMobile, setIsMobile] = useState(false); 
    // The viewMode state seems unused in the final JSX, but we keep it
    const [viewMode, setViewMode] = useState<'table' | 'matchup'>('table'); 
    
    // Navigation State
    const [activeIndex, setActiveIndex] = useState<number>(0);

    // FILTER STATE: Default to 0 years (checkbox unchecked)
    const [minYears, setMinYears] = useState<number>(0);
    const [includeRegularSeason, setIncludeRegularSeason] = useState<boolean>(true);
    const [includePlayoffs, setIncludePlayoffs] = useState<boolean>(false); 

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

    // Reset filters when component changes
    useEffect(() => {
        const selectedDisplayName = items[activeIndex]?.displayName;
        
        // "Being a Boss When it Counts" is playoffs-only
        if (selectedDisplayName === 'Being a Boss When it Counts') {
            setIncludeRegularSeason(false);
            setIncludePlayoffs(true);
        } else {
            // Default for most stats: regular season only
            setIncludeRegularSeason(true);
            setIncludePlayoffs(false);
        }
    }, [activeIndex, items]);

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
                
                {/* 2. FILTER CHECKBOXES (Second element) */}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    {selectedItem?.displayName !== 'Weekly Score Averages' &&
                     selectedItem?.displayName !== 'Playoff Teams Average Points' && (
                    <div className="pointsFilter filter-style"> 
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
                    )}
                    {selectedItem?.displayName !== 'Weekly Score Averages' &&
                     selectedItem?.displayName !== 'Playoff Teams Average Points' &&
                    (selectedItem?.displayName.includes('Weekly') || 
                      selectedItem?.displayName === 'Heartbreaker' ||
                      selectedItem?.displayName === 'GetWreckd' ||
                      selectedItem?.displayName === 'Better Lucky Than Good' ||
                      selectedItem?.displayName === 'Maybe Next Time' ||
                      selectedItem?.displayName === 'Kicked In Da Ballz' ||
                      selectedItem?.displayName === 'Connar Effect' ||
                      selectedItem?.displayName === 'Get Run Over' ||
                      selectedItem?.displayName === 'Receiving Losses' ||
                      selectedItem?.displayName === 'Killed By a Tight End' ||
                      selectedItem?.displayName === 'Blue Balls') && (
                        <>
                            <div className="pointsFilter filter-style"> 
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={includeRegularSeason}
                                        style={{ marginRight: '6px' }} 
                                        onChange={(e) => setIncludeRegularSeason(e.target.checked)}
                                    />
                                    Include Regular Season
                                </label>
                            </div>
                            <div className="pointsFilter filter-style"> 
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={includePlayoffs}
                                        style={{ marginRight: '6px' }} 
                                        onChange={(e) => setIncludePlayoffs(e.target.checked)}
                                    />
                                    Include Playoffs
                                </label>
                            </div>
                        </>
                    )}
                </div>
                
            </div>
            
            <div className="pointsContainer"> 
                {/* The selected component receives the league data and the filter props */}
                <SelectedComponent data={data} minYears={minYears} includeRegularSeason={includeRegularSeason} includePlayoffs={includePlayoffs} />
            </div>
        </div>
    );
};

export default PointsStats;