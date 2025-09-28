import React, { useMemo, useState } from 'react';
// Corrected import to the RecordComponentProps interface
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem'; 
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';

// CORRECTED IMPORT PATH for RecordCalculations
import {
    getRecordAgainstLeague,
    getRecordInTop50,
    displayRecord,
    getRecordWinPercentage,
    recordAgainstWinningTeams, // <--- NEW IMPORT
} from '../../../Helper Files/RecordCalculations';

// =========================================================================
// UPDATED TYPE DEFINITIONS
// =========================================================================

// Interface for the record object to display
interface TeamRegularSeasonRecord {
    teamName: string;
    yearsPlayed: number; // Number of seasons the user participated in
    totalWins: number;
    totalLosses: number;
    totalTies: number;
    winPercentage: string; 
    winPercentageValue: number; // Numeric value for sorting (Main sort key)
    avgVsLeagueRecord: string; 
    avgVsLeagueWinPct: string;
    avgVsLeagueWinPctValue: number; // Numeric value for sorting
    top50Record: string; 
    top50WinPct: string;
    top50WinPctValue: number; // Numeric value for sorting

    // NEW FIELDS FOR RECORD VS. WINNING TEAMS
    vsWinningTeamsRecord: string; 
    vsWinningTeamsWinPct: string;
    vsWinningTeamsWinPctValue: number; // Numeric value for sorting
}

// Interface for sorting state
type SortKey = keyof TeamRegularSeasonRecord; 
interface SortConfig {
    key: SortKey | null;
    direction: 'ascending' | 'descending';
}

// Interface for the Max/Min values structure
interface MaxMinStats {
    yearsPlayed: { max: number; min: number };
    winPercentageValue: { max: number; min: number };
    avgVsLeagueWinPctValue: { max: number; min: number };
    top50WinPctValue: { max: number; min: number };
    vsWinningTeamsWinPctValue: { max: number; min: number }; // <--- NEW MAX/MIN FIELD
}

// =========================================================================
// MISSING HELPER FUNCTIONS 
// =========================================================================

const getPctValue = (pctString: string) => parseFloat(pctString.replace('%', ''));

/**
 * Helper function to format the record string as "W-L-T (##.##%)"
 */
const formatRecordCell = (record: string, winPct: string): string => {
    return `${record} (${winPct})`;
};

// =========================================================================
// CORE LOGIC
// =========================================================================

// Function to aggregate records across ALL seasons
const aggregateRegularSeasonRecords = (data: LeagueData[]): TeamRegularSeasonRecord[] => {
    const allUserIDs = new Set<string>();
    data.forEach(league => {
        league.users.forEach(user => allUserIDs.add(user.user_id));
    });

    const results: { [userId: string]: TeamRegularSeasonRecord } = {};

    Array.from(allUserIDs).forEach(userId => {
        let totalWins = 0;
        let totalLosses = 0;
        let totalTies = 0;
        let totalAvgVsLeagueWins = 0;
        let totalAvgVsLeagueLosses = 0;
        let totalAvgVsLeagueTies = 0;
        let totalTop50Wins = 0;
        let totalTop50Losses = 0;
        let totalTop50Ties = 0;
        // NEW AGGREGATORS
        let totalVsWinningTeamsWins = 0;
        let totalVsWinningTeamsLosses = 0;
        let totalVsWinningTeamsTies = 0;

        let teamName = '';
        let yearsPlayed = 0; 

        data.forEach(league => {
            const userInLeague = league.users.find(u => u.user_id === userId);

            if (userInLeague) {
                yearsPlayed++; 
                teamName = userInLeague.metadata.team_name;

                const roster = league.rosters.find(r => r.owner_id === userId);
                if (roster) {
                    totalWins += roster.settings.wins;
                    totalLosses += roster.settings.losses;
                    totalTies += roster.settings.ties;
                }

                // Existing Calculations
                const [avgVsLW, avgVsLL, avgVsLT] = getRecordAgainstLeague(userInLeague, league);
                totalAvgVsLeagueWins += avgVsLW;
                totalAvgVsLeagueLosses += avgVsLL;
                totalAvgVsLeagueTies += avgVsLT;

                const [top50W, top50L, top50T] = getRecordInTop50(userInLeague, league);
                totalTop50Wins += top50W;
                totalTop50Losses += top50L;
                totalTop50Ties += top50T;

                // NEW CALCULATION: Record Vs Winning Teams
                const [vsWW, vsWL, vsWT] = recordAgainstWinningTeams(userInLeague, league);
                totalVsWinningTeamsWins += vsWW;
                totalVsWinningTeamsLosses += vsWL;
                totalVsWinningTeamsTies += vsWT;
            }
        });

        if (teamName) {
            const overallPct = getRecordWinPercentage(totalWins, totalLosses, totalTies);
            const avgVsLPct = getRecordWinPercentage(totalAvgVsLeagueWins, totalAvgVsLeagueLosses, totalAvgVsLeagueTies);
            const top50Pct = getRecordWinPercentage(totalTop50Wins, totalTop50Losses, totalTop50Ties);
            // NEW WINNING TEAMS PCT CALCULATION
            const vsWinningTeamsPct = getRecordWinPercentage(totalVsWinningTeamsWins, totalVsWinningTeamsLosses, totalVsWinningTeamsTies);

            results[userId] = {
                teamName: teamName,
                yearsPlayed: yearsPlayed, 
                
                totalWins, totalLosses, totalTies,
                winPercentage: overallPct,
                winPercentageValue: getPctValue(overallPct),
                
                avgVsLeagueRecord: displayRecord(totalAvgVsLeagueWins, totalAvgVsLeagueLosses, totalAvgVsLeagueTies),
                avgVsLeagueWinPct: avgVsLPct,
                avgVsLeagueWinPctValue: getPctValue(avgVsLPct),

                top50Record: displayRecord(totalTop50Wins, totalTop50Losses, totalTop50Ties),
                top50WinPct: top50Pct,
                top50WinPctValue: getPctValue(top50Pct),
                
                // NEW FIELD ASSIGNMENTS
                vsWinningTeamsRecord: displayRecord(totalVsWinningTeamsWins, totalVsWinningTeamsLosses, totalVsWinningTeamsTies),
                vsWinningTeamsWinPct: vsWinningTeamsPct,
                vsWinningTeamsWinPctValue: getPctValue(vsWinningTeamsPct),
            };
        }
    });

    return Object.values(results);
};


// UPDATED: Destructure minYears from props
const RegularSeasonRecords: React.FC<RecordComponentProps & { minYears?: number }> = ({ data, minYears = 0 }) => {
    
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'winPercentageValue', direction: 'descending' });

    const handleSort = (key: SortKey) => {
        let direction: SortConfig['direction'] = 'descending';
        
        if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        } else if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            key = 'winPercentageValue'; 
            direction = 'descending';
        }
        
        setSortConfig({ key, direction });
    };

    // UPDATED: Added minYears as a dependency and applied the filter
    const { sortedRecords, maxMinValues } = useMemo(() => {
        let allItems = aggregateRegularSeasonRecords(data);
        
        // --- 1. Apply Filtering ---
        let sortableItems = allItems.filter(record => record.yearsPlayed >= minYears);

        if (sortableItems.length === 0) {
            const emptyMaxMin: MaxMinStats = {
                yearsPlayed: { max: 0, min: 0 },
                winPercentageValue: { max: 0, min: 0 },
                avgVsLeagueWinPctValue: { max: 0, min: 0 },
                top50WinPctValue: { max: 0, min: 0 },
                vsWinningTeamsWinPctValue: { max: 0, min: 0 }, // <--- NEW
            };
            return { sortedRecords: [], maxMinValues: emptyMaxMin };
        }

        // --- 2. Find Max/Min Values for Highlighting ---
        const winPctValues = sortableItems.map(r => r.winPercentageValue);
        const avgVsLWValues = sortableItems.map(r => r.avgVsLeagueWinPctValue);
        const top50WValues = sortableItems.map(r => r.top50WinPctValue);
        const yearsValues = sortableItems.map(r => r.yearsPlayed);
        const vsWinningTeamsValues = sortableItems.map(r => r.vsWinningTeamsWinPctValue); // <--- NEW

        const maxMinValues: MaxMinStats = {
            winPercentageValue: { 
                max: Math.max(...winPctValues), 
                min: Math.min(...winPctValues) 
            },
            avgVsLeagueWinPctValue: { 
                max: Math.max(...avgVsLWValues), 
                min: Math.min(...avgVsLWValues) 
            },
            top50WinPctValue: { 
                max: Math.max(...top50WValues), 
                min: Math.min(...top50WValues) 
            },
            vsWinningTeamsWinPctValue: { // <--- NEW MAX/MIN CALCULATION
                max: Math.max(...vsWinningTeamsValues), 
                min: Math.min(...vsWinningTeamsValues) 
            },
            yearsPlayed: {
                max: Math.max(...yearsValues),
                min: Math.min(...yearsValues)
            }
        };

        // --- 3. Apply Sorting ---
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    if (sortConfig.direction === 'ascending') return aValue - bValue;
                    return bValue - aValue;
                }
                return 0;
            });
        }
        
        return { sortedRecords: sortableItems, maxMinValues };
    }, [data, sortConfig, minYears]); // minYears is now a dependency

    const getSortIndicator = (key: SortKey) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' \u25B2' : ' \u25BC';
    };

    // UPDATED: Added new key to MaxMinStats check
    const getCellClassName = (key: keyof MaxMinStats, value: number): string => {
        const { max, min } = maxMinValues[key];
        
        if (max === min) return ''; 
        
        if (value === max) return 'highlight-best';
        if (value === min) return 'highlight-worst';
        
        return '';
    };
    
    if (sortedRecords.length === 0) {
        return (
            <div className="regular-season-records">
                <div className="notImplementedMessage">
                    No records found for the current filter settings (min years: {minYears}).
                </div>
            </div>
        );
    }

    // =========================================================================
    // JSX: TABLE HEADERS AND BODY
    // =========================================================================

    return (
        <div className="regular-season-records">
            
            <table className="statsTable regular-season-table">
                <thead>
                    <tr>
                        <th onClick={() => handleSort('teamName')} style={{ cursor: 'pointer' }}>
                            Team {getSortIndicator('teamName')}
                        </th>
                        
                        <th onClick={() => handleSort('winPercentageValue')} style={{ cursor: 'pointer' }}>
                            Record (W-L-T) {getSortIndicator('winPercentageValue')}
                        </th>
                        
                        <th onClick={() => handleSort('avgVsLeagueWinPctValue')} style={{ cursor: 'pointer' }}>
                            Vs All {getSortIndicator('avgVsLeagueWinPctValue')}
                        </th>
                        
                        <th onClick={() => handleSort('top50WinPctValue')} style={{ cursor: 'pointer' }}>
                            In Top 50% {getSortIndicator('top50WinPctValue')}
                        </th>
                        
                        {/* NEW COLUMN */}
                        <th onClick={() => handleSort('vsWinningTeamsWinPctValue')} style={{ cursor: 'pointer' }}>
                            Vs Winning Teams {getSortIndicator('vsWinningTeamsWinPctValue')}
                        </th>

                        <th onClick={() => handleSort('yearsPlayed')} style={{ cursor: 'pointer' }}>
                            Years {getSortIndicator('yearsPlayed')}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sortedRecords.map((record, index) => (
                        <tr key={record.teamName} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                            <td className="team-name-cell">{record.teamName}</td>
                            
                            <td className={getCellClassName('winPercentageValue', record.winPercentageValue)}>
                                {formatRecordCell(
                                    displayRecord(record.totalWins, record.totalLosses, record.totalTies),
                                    record.winPercentage
                                )}
                            </td>
                            
                            <td className={getCellClassName('avgVsLeagueWinPctValue', record.avgVsLeagueWinPctValue)}>
                                {formatRecordCell(record.avgVsLeagueRecord, record.avgVsLeagueWinPct)}
                            </td>
                            
                            <td className={getCellClassName('top50WinPctValue', record.top50WinPctValue)}>
                                {formatRecordCell(record.top50Record, record.top50WinPct)}
                            </td>

                            {/* NEW COLUMN DATA */}
                            <td className={getCellClassName('vsWinningTeamsWinPctValue', record.vsWinningTeamsWinPctValue)}>
                                {formatRecordCell(record.vsWinningTeamsRecord, record.vsWinningTeamsWinPct)}
                            </td>
                            
                            <td>
                                {record.yearsPlayed}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RegularSeasonRecords;
