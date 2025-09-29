import React, { useMemo, useState, useEffect } from 'react';
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
    recordAgainstWinningTeams,
} from '../../../Helper Files/RecordCalculations';

// =========================================================================
// TYPE DEFINITIONS
// =========================================================================

// Interface for the record object to display
interface TeamRegularSeasonRecord {
    userId: string; // ADDED for selection
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

// UPDATED: Interface for yearly breakdown to include all record types
interface YearlyTeamRecord {
    year: number;
    gamesPlayed: number; // Still keeping this field as it might be used internally, but removing from display
    
    overallRecord: string;
    overallWinPct: string;

    avgVsLeagueRecord: string; 
    avgVsLeagueWinPct: string;
    
    top50Record: string; 
    top50WinPct: string;

    vsWinningTeamsRecord: string;
    vsWinningTeamsWinPct: string;
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
    vsWinningTeamsWinPctValue: { max: number; min: number };
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
// CORE LOGIC: AGGREGATION
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
        let totalVsWinningTeamsWins = 0;
        let totalVsWinningTeamsLosses = 0;
        let totalVsWinningTeamsTies = 0;

        let teamName = '';
        let yearsPlayed = 0; 

        data.forEach(league => {
            const userInLeague = league.users.find(u => u.user_id === userId);

            if (userInLeague) {
                yearsPlayed++; 
                teamName = userInLeague.metadata.team_name || `User ${userId.substring(0, 4)}`;

                const roster = league.rosters.find(r => r.owner_id === userId);
                if (roster) {
                    totalWins += roster.settings.wins;
                    totalLosses += roster.settings.losses;
                    totalTies += roster.settings.ties;
                }

                const [avgVsLW, avgVsLL, avgVsLT] = getRecordAgainstLeague(userInLeague, league);
                totalAvgVsLeagueWins += avgVsLW;
                totalAvgVsLeagueLosses += avgVsLL;
                totalAvgVsLeagueTies += avgVsLT;

                const [top50W, top50L, top50T] = getRecordInTop50(userInLeague, league);
                totalTop50Wins += top50W;
                totalTop50Losses += top50L;
                totalTop50Ties += top50T;

                const [vsWW, vsWL, vsWT] = recordAgainstWinningTeams(userInLeague, league);
                totalVsWinningTeamsWins += vsWW;
                totalVsWinningTeamsLosses += vsWL;
                totalVsWinningTeamsTies += vsWT;
            }
        });

        if (teamName && yearsPlayed > 0) {
            const overallPct = getRecordWinPercentage(totalWins, totalLosses, totalTies);
            const avgVsLPct = getRecordWinPercentage(totalAvgVsLeagueWins, totalAvgVsLeagueLosses, totalAvgVsLeagueTies);
            const top50Pct = getRecordWinPercentage(totalTop50Wins, totalTop50Losses, totalTop50Ties);
            const vsWinningTeamsPct = getRecordWinPercentage(totalVsWinningTeamsWins, totalVsWinningTeamsLosses, totalVsWinningTeamsTies);

            results[userId] = {
                userId: userId, // ASSIGNED
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
                
                vsWinningTeamsRecord: displayRecord(totalVsWinningTeamsWins, totalVsWinningTeamsLosses, totalVsWinningTeamsTies),
                vsWinningTeamsWinPct: vsWinningTeamsPct,
                vsWinningTeamsWinPctValue: getPctValue(vsWinningTeamsPct),
            };
        }
    });

    return Object.values(results);
};

// =========================================================================
// CORE LOGIC: YEARLY BREAKDOWN
// =========================================================================

const getYearlyRecordBreakdown = (data: LeagueData[], userId: string): YearlyTeamRecord[] => {
    const yearlyData: YearlyTeamRecord[] = [];

    data.forEach(league => {
        const userInLeague = league.users.find(u => u.user_id === userId);
        const roster = league.rosters.find(r => r.owner_id === userId);

        if (userInLeague && roster) {
            const year = Number.parseInt(league.season); 
            
            // 1. Overall Record
            const overallW = roster.settings.wins;
            const overallL = roster.settings.losses;
            const overallT = roster.settings.ties;
            const overallPct = getRecordWinPercentage(overallW, overallL, overallT);

            // 2. Vs League Average
            const [avgVsLW, avgVsLL, avgVsLT] = getRecordAgainstLeague(userInLeague, league);
            const avgVsLPct = getRecordWinPercentage(avgVsLW, avgVsLL, avgVsLT);

            // 3. Vs Top 50%
            const [top50W, top50L, top50T] = getRecordInTop50(userInLeague, league);
            const top50Pct = getRecordWinPercentage(top50W, top50L, top50T);

            // 4. Vs Winning Teams
            const [vsWW, vsWL, vsWT] = recordAgainstWinningTeams(userInLeague, league);
            const vsWinningTeamsPct = getRecordWinPercentage(vsWW, vsWL, vsWT);
            
            const games = overallW + overallL + overallT;

            yearlyData.push({
                year: year,
                gamesPlayed: games,
                
                overallRecord: displayRecord(overallW, overallL, overallT),
                overallWinPct: overallPct,

                avgVsLeagueRecord: displayRecord(avgVsLW, avgVsLL, avgVsLT),
                avgVsLeagueWinPct: avgVsLPct,
                
                top50Record: displayRecord(top50W, top50L, top50T),
                top50WinPct: top50Pct,

                vsWinningTeamsRecord: displayRecord(vsWW, vsWL, vsWT),
                vsWinningTeamsWinPct: vsWinningTeamsPct,
            });
        }
    });

    return yearlyData.sort((a, b) => b.year - a.year);
};


// =========================================================================
// YEARLY BREAKDOWN SUB-COMPONENT (RIGHT PANE)
// =========================================================================

interface YearlyRecordBreakdownProps {
    data: LeagueData[];
    selectedTeam: TeamRegularSeasonRecord;
}

const YearlyRecordBreakdown: React.FC<YearlyRecordBreakdownProps> = ({ data, selectedTeam }) => {
    
    const yearlyStats = useMemo(() => {
        return getYearlyRecordBreakdown(data, selectedTeam.userId);
    }, [data, selectedTeam.userId]);

    return (
        <div className="detail-pane">
            <table className="statsTable detail-table">
                <thead>
                    <tr>
                        <th style={{ width: '10%' }}>Year</th>
                        {/* REMOVED: The Games column header */}
                        <th style={{ width: '22%' }}>Overall</th>
                        <th style={{ width: '22%' }}>Vs. Avg</th>
                        <th style={{ width: '22%' }}>Vs. Top 50%</th>
                        <th style={{ width: '24%' }}>Vs. Winners</th>
                    </tr>
                </thead>
                <tbody>
                    {yearlyStats.map((stat) => (
                        <tr key={stat.year}>
                            <td>{stat.year}</td>
                            {/* REMOVED: The Games data cell */}
                            <td>{formatRecordCell(stat.overallRecord, stat.overallWinPct)}</td>
                            <td>{formatRecordCell(stat.avgVsLeagueRecord, stat.avgVsLeagueWinPct)}</td>
                            <td>{formatRecordCell(stat.top50Record, stat.top50WinPct)}</td>
                            <td>{formatRecordCell(stat.vsWinningTeamsRecord, stat.vsWinningTeamsWinPct)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {yearlyStats.length === 0 && (
                <div className="notImplementedMessage">No yearly data available for this team.</div>
            )}
        </div>
    );
};


// =========================================================================
// MAIN REACT COMPONENT (RegularSeasonRecords)
// =========================================================================

const RegularSeasonRecords: React.FC<RecordComponentProps & { minYears?: number }> = ({ data, minYears = 0 }) => {
    
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'winPercentageValue', direction: 'descending' });
    const [selectedTeam, setSelectedTeam] = useState<TeamRegularSeasonRecord | null>(null);

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

    const handleRowClick = (team: TeamRegularSeasonRecord) => {
        setSelectedTeam(prev => (prev?.userId === team.userId ? null : team));
    };

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
                vsWinningTeamsWinPctValue: { max: 0, min: 0 },
            };
            return { sortedRecords: [], maxMinValues: emptyMaxMin };
        }

        // --- 2. Find Max/Min Values for Highlighting ---
        const winPctValues = sortableItems.map(r => r.winPercentageValue);
        const avgVsLWValues = sortableItems.map(r => r.avgVsLeagueWinPctValue);
        const top50WValues = sortableItems.map(r => r.top50WinPctValue);
        const yearsValues = sortableItems.map(r => r.yearsPlayed);
        const vsWinningTeamsValues = sortableItems.map(r => r.vsWinningTeamsWinPctValue);

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
            vsWinningTeamsWinPctValue: { 
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

    const getSortIndicator = (key: SortKey) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' \u25B2' : ' \u25BC';
    };

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
    
    /* Column width allocation (total 7 columns):
    Team Name: 15%
    Overall Record: 18%
    Vs. League Avg: 18%
    Vs. Top 50%: 17%
    Vs. Winners: 17%
    Years: 15%
    Total: 100%
    */

    return (
        <div className="regular-season-records">
            
            <div className="two-pane-layout">
                
                {/* -------------------- LEFT PANE: MAIN TABLE (66%) -------------------- */}
                <div className="main-table-pane">
                    {/* Added overflow-x: auto wrapper for better horizontal viewing on smaller screens */}
                    <div style={{ overflowX: 'auto' }}> 
                        <table className="statsTable regular-season-table selectable-table" style={{ minWidth: '750px' }}>
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('teamName')} style={{ cursor: 'pointer', width: '15%' }}>
                                        Team {getSortIndicator('teamName')}
                                    </th>
                                    
                                    <th onClick={() => handleSort('winPercentageValue')} style={{ cursor: 'pointer', width: '18%' }}>
                                        Overall Record {getSortIndicator('winPercentageValue')}
                                    </th>
                                    
                                    <th onClick={() => handleSort('avgVsLeagueWinPctValue')} style={{ cursor: 'pointer', width: '18%' }}>
                                        Vs. League Avg {getSortIndicator('avgVsLeagueWinPctValue')}
                                    </th>
                                    
                                    <th onClick={() => handleSort('top50WinPctValue')} style={{ cursor: 'pointer', width: '17%' }}>
                                        Vs. Top 50% {getSortIndicator('top50WinPctValue')}
                                    </th>
                                    
                                    <th onClick={() => handleSort('vsWinningTeamsWinPctValue')} style={{ cursor: 'pointer', width: '17%' }}>
                                        Vs. Winners {getSortIndicator('vsWinningTeamsWinPctValue')}
                                    </th>

                                    <th onClick={() => handleSort('yearsPlayed')} style={{ cursor: 'pointer', width: '15%' }}>
                                        Years {getSortIndicator('yearsPlayed')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRecords.map((record, index) => (
                                    <tr 
                                        key={record.userId} 
                                        className={`${selectedTeam?.userId === record.userId ? 'active selected-row' : ''} ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                                        onClick={() => handleRowClick(record)}
                                        style={{ cursor: 'pointer' }}
                                    >
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
                </div>

                {/* -------------------- RIGHT PANE: YEARLY BREAKDOWN (34%) -------------------- */}
                <div className="detail-pane-wrapper">
                    {selectedTeam ? (
                        <YearlyRecordBreakdown data={data} selectedTeam={selectedTeam} />
                    ) : (
                        <div className="notImplementedMessage">
                            Select a team to view its yearly breakdown against winning teams.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RegularSeasonRecords;
