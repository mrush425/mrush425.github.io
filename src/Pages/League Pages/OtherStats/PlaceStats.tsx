// PlaceStats.tsx

import React, { useMemo, useState, useEffect } from 'react';
import { OtherComponentProps as PlaceComponentProps } from '../../../Interfaces/OtherStatItem'; // Renamed import for clarity
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';
import SleeperRoster from '../../../Interfaces/SleeperRoster';
import yearTrollData from '../../../Data/yearTrollData.json';

// =========================================================================
// HELPER FUNCTIONS (Place Logic)
// =========================================================================

/**
 * Gets the current year to filter out in-progress seasons.
 */
const getCurrentYear = (): string => {
    // Note: Based on the current time (Oct 2025), this will return "2025"
    return new Date().getFullYear().toString();
};

// Utility to find a user's season place based on W-L-T and fpts.
export function getUserSeasonPlace(user_id: string, data: LeagueData): number {
    const sortedData = data.rosters.slice().sort((a, b) => {
        // Sort: Wins (desc) -> Points (desc)
        return b.settings.wins - a.settings.wins || (b.settings.fpts + b.settings.fpts_decimal) - (a.settings.fpts + a.settings.fpts_decimal);
    });

    return sortedData.findIndex((user) => user.owner_id === user_id) + 1;
}

/**
 * Function to retrieve overall place from yearTrollData.
 * Safely converts the value to a number, handling undefined, null, or empty string ("").
 * @returns {number | undefined} The overall place as a number, or undefined if missing/invalid.
 */
export const getOverallPlace = (userId: string, season: string): number | undefined => {
    
    const yearData = yearTrollData.find(
        (yd: any) => yd.year === Number.parseFloat(season)
    );

    if (!yearData) return undefined;

    const playerData = yearData.data.find(
        (pd: any) => pd.sleeper_id === userId
    );
    
    const placeValue = playerData?.place; 
    
    // 1. Check if the value exists and is not an empty string
    if (placeValue === undefined || placeValue === null) {
        return undefined;
    }

    // 2. Safely convert to number
    const numberValue = Number(placeValue);
    
    // 3. Check if the result is actually a valid number
    if (isNaN(numberValue)) {
        return undefined; 
    }
    
    return numberValue; 
};

// =========================================================================
// TYPE DEFINITIONS
// =========================================================================

// Interface for the aggregated place object to display (Main Table)
interface TeamPlaceStat {
    userId: string;
    teamName: string;
    yearsPlayed: number; 
    totalOverallPlace: number;
    totalSeasonPlace: number; 
    
    avgOverallPlace: string; 
    avgOverallPlaceValue: number;
    
    avgSeasonPlace: string; 
    avgSeasonPlaceValue: number;
}

// Interface for yearly breakdown (Right Pane)
interface YearlyTeamPlace {
    year: number;
    overallPlace: number; // 0 if missing
    seasonPlace: number;
}

// Interface for sorting state
type SortKey = keyof TeamPlaceStat;
interface SortConfig {
    key: SortKey | null;
    direction: 'ascending' | 'descending';
}

// Interface for the Max/Min values structure
interface MaxMinStats {
    yearsPlayed: { max: number; min: number };
    avgOverallPlaceValue: { max: number; min: number };
    avgSeasonPlaceValue: { max: number; min: number };
}

// =========================================================================
// CORE LOGIC: AGGREGATION
// =========================================================================

/**
 * Function to aggregate place data across ALL seasons, ensuring all players are included 
 * in the table, but stats only use completed years.
 */
const aggregatePlaceStats = (data: LeagueData[]): TeamPlaceStat[] => {
    
    // 1. Filter out the current season for STAT CALCULATIONS ONLY
    const currentYear = getCurrentYear();
    const completedSeasonData = data.filter(league => league.season !== currentYear);
    
    // FIX: Collect ALL User IDs and names from the unfiltered 'data' array
    const allUserIDs = new Set<string>();
    const userDetails: { [userId: string]: SleeperUser } = {}; 

    data.forEach(league => { // ⬅️ LOOPS OVER ALL SEASONS 
        league.users.forEach(user => {
            allUserIDs.add(user.user_id);
            // Store or update the user object for name retrieval
            userDetails[user.user_id] = user;
        });
    });

    const results: { [userId: string]: TeamPlaceStat } = {};

    // 2. Iterate through ALL users found in step 1
    Array.from(allUserIDs).forEach(userId => {
        
        // Retrieve team name guaranteed from the stored user details
        const user = userDetails[userId];
        if (!user) return;
        
        const teamName = user.metadata.team_name || `User ${userId.substring(0, 4)}`;
        
        let totalYearsPlayed = 0; // Total completed seasons played
        let overallPlaceYears = 0; // Seasons where overallPlace data was available
        let totalOverallPlace = 0;
        let totalSeasonPlace = 0;

        // 3. Calculate stats using ONLY completed seasons
        completedSeasonData.forEach(league => { // ⬅️ LOOPS OVER FILTERED DATA 
            const userInLeague = league.users.find(u => u.user_id === userId);

            if (userInLeague) {
                totalYearsPlayed++; // Count this completed year
                
                // Get Overall Place
                const overallPlace = getOverallPlace(userId, league.season);
                
                if (overallPlace !== undefined) {
                    totalOverallPlace += overallPlace;
                    overallPlaceYears++; 
                }
                
                // Get Season Place
                const seasonPlace = getUserSeasonPlace(userId, league);
                totalSeasonPlace += seasonPlace;
            }
        });

        // Create the record regardless of yearsPlayed (so minYears=0 works)
        const avgOverallPlaceValue = overallPlaceYears > 0 
            ? totalOverallPlace / overallPlaceYears 
            : NaN; 
        
        // Use totalYearsPlayed > 0 check to prevent division by zero for new users
        const avgSeasonPlaceValue = totalYearsPlayed > 0
            ? totalSeasonPlace / totalYearsPlayed
            : NaN;

        results[userId] = {
            userId: userId,
            teamName: teamName,
            yearsPlayed: totalYearsPlayed, 
            totalOverallPlace: totalOverallPlace,
            totalSeasonPlace: totalSeasonPlace,
            
            // Display '-' if NaN
            avgOverallPlace: isNaN(avgOverallPlaceValue) ? '-' : avgOverallPlaceValue.toFixed(2),
            avgOverallPlaceValue: avgOverallPlaceValue,
            
            // Display '-' if NaN
            avgSeasonPlace: isNaN(avgSeasonPlaceValue) ? '-' : avgSeasonPlaceValue.toFixed(2),
            avgSeasonPlaceValue: avgSeasonPlaceValue,
        };
    });
    return Object.values(results);
};

// =========================================================================
// CORE LOGIC: YEARLY BREAKDOWN
// =========================================================================

/**
 * Retrieves yearly place breakdown, excluding the current (incomplete) year.
 */
const getYearlyPlaceBreakdown = (data: LeagueData[], userId: string): YearlyTeamPlace[] => {
    const yearlyData: YearlyTeamPlace[] = [];

    // 1. Filter out the current season
    const currentYear = getCurrentYear();
    const completedSeasonData = data.filter(league => league.season !== currentYear);

    completedSeasonData.forEach(league => { 
        const userInLeague = league.users.find(u => u.user_id === userId);

        if (userInLeague) {
            const year = Number.parseInt(league.season);

            // 1. Overall Place 
            const overallPlace = getOverallPlace(userId, league.season);
            
            // 2. Season Place 
            const seasonPlace = getUserSeasonPlace(userId, league);

            yearlyData.push({
                year: year,
                // Use 0 as a placeholder for missing overallPlace.
                overallPlace: overallPlace !== undefined ? overallPlace : 0, 
                seasonPlace: seasonPlace,
            });
        }
    });

    return yearlyData.sort((a, b) => b.year - a.year); 
};


// =========================================================================
// YEARLY BREAKDOWN SUB-COMPONENT (RIGHT PANE)
// =========================================================================

interface YearlyPlaceBreakdownProps {
    data: LeagueData[];
    selectedTeam: TeamPlaceStat;
}

const YearlyPlaceBreakdown: React.FC<YearlyPlaceBreakdownProps> = ({ data, selectedTeam }) => {
    
    const yearlyStats = useMemo(() => {
        return getYearlyPlaceBreakdown(data, selectedTeam.userId);
    }, [data, selectedTeam.userId]);

    return (
        <div className="detail-pane">
            <h4>Yearly Breakdown for {selectedTeam.teamName}</h4>
            <table className="leagueStatsTable detail-table">
                <thead>
                    <tr>
                        <th className="table-col-1">Year</th>
                        <th className="table-col-2">Overall Place</th>
                        <th className="table-col-3">Season Place</th>
                    </tr>
                </thead>
                <tbody>
                    {yearlyStats.map((stat) => (
                        <tr key={stat.year}>
                            <td>{stat.year}</td>
                            {/* Display '-' if overallPlace is 0 (our flag for missing data) */}
                            <td>{stat.overallPlace === 0 ? '-' : stat.overallPlace}</td> 
                            <td>{stat.seasonPlace}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {yearlyStats.length === 0 && (
                <div className="notImplementedMessage">No yearly place data available for this team.</div>
            )}
        </div>
    );
};


// =========================================================================
// MAIN REACT COMPONENT (PlaceStats)
// =========================================================================

const PlaceStats: React.FC<PlaceComponentProps> = ({ data, minYears = 0 }) => {
    
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'avgOverallPlaceValue', direction: 'ascending' });
    const [selectedTeam, setSelectedTeam] = useState<TeamPlaceStat | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileDetail, setShowMobileDetail] = useState(false);

    const handleSort = (key: SortKey) => {
        let direction: SortConfig['direction'] = 'ascending'; 
        
        if (sortConfig.key === key) {
            if (sortConfig.direction === 'ascending') {
                direction = 'descending';
            } else {
                key = 'avgOverallPlaceValue';
                direction = 'ascending';
            }
        }
        
        setSortConfig({ key, direction });
    };

    const handleRowClick = (team: TeamPlaceStat) => {
        setSelectedTeam(prev => (prev?.userId === team.userId ? null : team));
        if (isMobile) setShowMobileDetail(true);
    };

    const { sortedRecords, maxMinValues } = useMemo(() => {
        let allItems = aggregatePlaceStats(data);
        
        // --- 1. Apply Filtering ---
        let sortableItems = allItems.filter(record => record.yearsPlayed >= minYears);

        if (sortableItems.length === 0) {
            const emptyMaxMin: MaxMinStats = {
                yearsPlayed: { max: 0, min: 0 },
                avgOverallPlaceValue: { max: 0, min: 0 },
                avgSeasonPlaceValue: { max: 0, min: 0 },
            };
            return { sortedRecords: [], maxMinValues: emptyMaxMin };
        }

        // --- 2. Find Max/Min Values for Highlighting ---
        const validOverallPlaceValues = sortableItems.map(r => r.avgOverallPlaceValue).filter(v => !isNaN(v));
        const seasonPlaceValues = sortableItems.map(r => r.avgSeasonPlaceValue).filter(v => !isNaN(v));
        const yearsValues = sortableItems.map(r => r.yearsPlayed);

        const maxMinValues: MaxMinStats = {
            yearsPlayed: {
                max: Math.max(...yearsValues),
                min: Math.min(...yearsValues)
            },
            avgOverallPlaceValue: {
                max: validOverallPlaceValues.length > 0 ? Math.max(...validOverallPlaceValues) : 0,
                min: validOverallPlaceValues.length > 0 ? Math.min(...validOverallPlaceValues) : 0
            },
            avgSeasonPlaceValue: {
                max: seasonPlaceValues.length > 0 ? Math.max(...seasonPlaceValues) : 0,
                min: seasonPlaceValues.length > 0 ? Math.min(...seasonPlaceValues) : 0
            },
        };

        // --- 3. Apply Sorting ---
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];

                if (sortConfig.key === 'teamName') {
                    if (a.teamName < b.teamName) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (a.teamName > b.teamName) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }
                
                else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    // Handle NaN values by treating them as the "worst" (highest number) in ascending sort
                    const aIsNaN = isNaN(aValue);
                    const bIsNaN = isNaN(bValue);

                    if (aIsNaN && bIsNaN) return 0;
                    if (aIsNaN) return sortConfig.direction === 'ascending' ? 1 : -1; // NaN goes to end in ascending
                    if (bIsNaN) return sortConfig.direction === 'ascending' ? -1 : 1; // NaN goes to end in ascending

                    // For valid numbers, sort as usual
                    if (sortConfig.direction === 'ascending') return aValue - bValue; 
                    return bValue - aValue;
                }
                return 0;
            });
        }
        
        if (selectedTeam && !sortableItems.find(t => t.userId === selectedTeam.userId)) {
             setSelectedTeam(null);
        }
        
        return { sortedRecords: sortableItems, maxMinValues };
    }, [data, sortConfig, minYears, selectedTeam]);
    
    useEffect(() => {
        if (!selectedTeam && sortedRecords.length > 0) {
            setSelectedTeam(sortedRecords[0]);
        }
    }, [sortedRecords, selectedTeam]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const getSortIndicator = (key: SortKey) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' \u25B2' : ' \u25BC';
    };

    const getCellClassName = (key: keyof MaxMinStats, value: number): string => {
        const { max, min } = maxMinValues[key];
        
        if (isNaN(value) || max === min) return ''; 
        
        // For place, MIN is BEST, MAX is WORST
        if (value === min) return 'highlight-best';
        if (value === max) return 'highlight-worst';
        
        return '';
    };
    
    if (sortedRecords.length === 0) {
        return (
            <div className="regular-season-records">
                <div className="notImplementedMessage">
                    No place data found for the current filter settings (min years: {minYears}).
                </div>
            </div>
        );
    }

    const handleBackToList = () => {
        setShowMobileDetail(false);
    };

    return (
        <div className="regular-season-records">
            {isMobile && showMobileDetail && (
                <button onClick={handleBackToList} className="mobile-back-button">
                    ← Back to List
                </button>
            )}
            <div className="two-pane-layout">
                
                {/* -------------------- LEFT PANE: MAIN TABLE -------------------- */}
                <div className={`main-table-pane ${isMobile && showMobileDetail ? 'mobile-hidden' : ''}`}>
                    <table className="leagueStatsTable regular-season-table selectable-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('teamName')} className="table-col-team sortable">
                                    Team (Years) {getSortIndicator('teamName')}
                                </th>
                                
                                <th onClick={() => handleSort('avgOverallPlaceValue')} className="table-col-2 sortable">
                                    Avg. Overall Place {getSortIndicator('avgOverallPlaceValue')}
                                </th>
                                
                                <th onClick={() => handleSort('avgSeasonPlaceValue')} className="table-col-2 sortable">
                                    Avg. Season Place {getSortIndicator('avgSeasonPlaceValue')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRecords.map((stat, index) => (
                                <tr 
                                    key={stat.userId} 
                                    className={`${selectedTeam?.userId === stat.userId ? 'active selected-row' : ''} ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                                    onClick={() => handleRowClick(stat)}
                                >
                                    <td className="team-name-cell">{stat.teamName} ({stat.yearsPlayed})</td>
                                    
                                    <td className={getCellClassName('avgOverallPlaceValue', stat.avgOverallPlaceValue)}>
                                        {stat.avgOverallPlace}
                                    </td>
                                    
                                    <td className={getCellClassName('avgSeasonPlaceValue', stat.avgSeasonPlaceValue)}>
                                        {stat.avgSeasonPlace}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* -------------------- RIGHT PANE: YEARLY BREAKDOWN -------------------- */}
                <div className={`detail-pane-wrapper ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
                    {selectedTeam ? (
                        <YearlyPlaceBreakdown data={data} selectedTeam={selectedTeam} />
                    ) : (
                        <div className="notImplementedMessage">
                            Select a team from the table to see a yearly placement breakdown.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlaceStats;