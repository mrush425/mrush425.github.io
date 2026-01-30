import React, { useState, useEffect, useMemo, ComponentType } from 'react';
import '../../Stylesheets/League Stylesheets/UnifiedStats.css'; 
import LeagueProps from './LeagueProps';
import LeagueNavBar from '../../Navigation/LeagueNavBar';
import LeagueData from '../../Interfaces/LeagueData'; 
import MostPointsByPosition from './Football Player Stats/MostPointsByPosition'; 
import TopPointsAtEachPosition from './Football Player Stats/TopPointsAtEachPosition';
import MostPointsByPositionBench from './Football Player Stats/MostPointsByPositionBench';
import TopPointsAtEachPositionBench from './Football Player Stats/TopPointsAtEachPositionBench'; 
import JamarcusRusselTop20 from './Football Player Stats/JamarcusRusselTop20';
import BestFirstRoundersTop20 from './Football Player Stats/BestFirstRoundersTop20';

// =========================================================================
// TYPE DEFINITIONS
// =========================================================================

// Interface for the props passed to the nested components
export interface FootballPlayerComponentProps {
    data: LeagueData[];
    minYears?: number; // Optional filter for minimum years played
}

// Define the structure for an item in your dropdown list
export interface FootballPlayerStatItem {
    displayName: string; // The name shown in the dropdown
    Component: ComponentType<FootballPlayerComponentProps>;
}

// =========================================================================
// STAT COMPONENT REGISTRY
// =========================================================================

// Populate the list with the available components.
const FOOTBALL_PLAYER_COMPONENTS: FootballPlayerStatItem[] = [ 
    { displayName: 'Top Points At Each Position', Component: TopPointsAtEachPosition },
    { displayName: 'Most Points By Position', Component: MostPointsByPosition },
    { displayName: 'Top Points At Each Position (Bench)', Component: TopPointsAtEachPositionBench },
    { displayName: 'Most Points By Position (Bench)', Component: MostPointsByPositionBench },
    { displayName: 'Jamarcus Russell (Top 20)', Component: JamarcusRusselTop20 },
    { displayName: 'Best First Rounders (Top 20)', Component: BestFirstRoundersTop20 },
];


const FootballPlayerStats: React.FC<LeagueProps> = ({ data }) => { 
    
    // UI State
    const [isMobile, setIsMobile] = useState(false); 
    const [viewMode, setViewMode] = useState<'table' | 'matchup'>('table'); 
    
    // Navigation State
    const [activeIndex, setActiveIndex] = useState<number>(0);

    // Use FOOTBALL_PLAYER_COMPONENTS directly
    const items = useMemo(() => FOOTBALL_PLAYER_COMPONENTS, []); 

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


    const selectedItem = items[activeIndex];
    const header = selectedItem?.displayName || 'Football Player Stats'; 
    
    // Default component when nothing is loaded
    const SelectedComponent = selectedItem 
        ? selectedItem.Component 
        : () => (
            <div className="notImplementedMessage">
                No football player stats available. Please add components to the FOOTBALL_PLAYER_COMPONENTS list.
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
            </div>
            
            <div className="pointsContainer"> 
                {/* The selected component receives the league data */}
                <SelectedComponent data={data} />
            </div>
        </div>
    );
};

export default FootballPlayerStats;
