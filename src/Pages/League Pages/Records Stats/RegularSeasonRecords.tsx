import React, { useMemo, useState, useEffect } from 'react';
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
            <table className="leagueStatsTable detail-table">
                <thead>
                    <tr>
                        <th className="table-col-1">Year</th>
                        <th className="table-col-2">Overall</th>
                        <th className="table-col-2">Vs. Avg</th>
                        <th className="table-col-2">Vs. Top 50%</th>
                        <th className="table-col-3">Vs. Winners</th>
                    </tr>
                </thead>
                <tbody>
                    {yearlyStats.map((stat) => (
                        <tr key={stat.year}>
                            <td>{stat.year}</td>
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
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileDetail, setShowMobileDetail] = useState(false);

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
        if (isMobile) setShowMobileDetail(true);
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

                if (sortConfig.key === 'teamName') {
                    // Custom sorting for teamName (which will fall back to yearsPlayed if names are equal)
                    if (a.teamName < b.teamName) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (a.teamName > b.teamName) return sortConfig.direction === 'ascending' ? 1 : -1;
                    // If team names are the same, sort by yearsPlayed
                    return sortConfig.direction === 'ascending' ? a.yearsPlayed - b.yearsPlayed : b.yearsPlayed - a.yearsPlayed;
                }
                
                else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    // For all win percentage values, descending is best (highest value is better)
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


    // Removed getSortIndicator for 'yearsPlayed' since it's now part of 'teamName' or implicit.
    const getSortIndicator = (key: SortKey) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' \u25B2' : ' \u25BC';
    };

    const getCellClassName = (key: keyof MaxMinStats, value: number): string => {
        const { max, min } = maxMinValues[key];
        
        if (max === min) return ''; 

        // All win percentages use the same logic: max is best, min is worst
        if (value === max) return 'highlight-best';
        if (value === min) return 'highlight-worst';
        
        return '';
    };
    
    if (sortedRecords.length === 0) {
        return (
            <div className="regular-season-records">
                <div className="notImplementedMessage">
                    No record data found for the current filter settings (min years: {minYears}).
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
                                
                                <th onClick={() => handleSort('winPercentageValue')} className="table-col-2 sortable">
                                    Win % {getSortIndicator('winPercentageValue')}
                                </th>
                                
                                <th onClick={() => handleSort('avgVsLeagueWinPctValue')} className="table-col-2 sortable">
                                    Vs. Avg % {getSortIndicator('avgVsLeagueWinPctValue')}
                                </th>
                                
                                <th onClick={() => handleSort('top50WinPctValue')} className="table-col-2 sortable">
                                    Vs. Top 50% {getSortIndicator('top50WinPctValue')}
                                </th>

                                <th onClick={() => handleSort('vsWinningTeamsWinPctValue')} className="table-col-2 sortable">
                                    Vs. Winners {getSortIndicator('vsWinningTeamsWinPctValue')}
                                </th>

                                {/* REMOVED 'Years' COLUMN */}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRecords.map((record, index) => (
                                <tr 
                                    key={record.userId} 
                                    className={`${selectedTeam?.userId === record.userId ? 'active selected-row' : ''} ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                                    onClick={() => handleRowClick(record)}
                                >
                                    <td className="team-name-cell">{record.teamName} ({record.yearsPlayed})</td>
                                    
                                    <td className={getCellClassName('winPercentageValue', record.winPercentageValue)}>
                                        {formatRecordCell(record.totalWins + '-' + record.totalLosses + (record.totalTies > 0 ? '-' + record.totalTies : ''), record.winPercentage)}
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* -------------------- RIGHT PANE: YEARLY BREAKDOWN -------------------- */}
                <div className={`detail-pane-wrapper ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
                    {selectedTeam ? (
                        <YearlyRecordBreakdown data={data} selectedTeam={selectedTeam} />
                    ) : (
                        <div className="notImplementedMessage">
                            Select a team from the table to see a yearly record breakdown.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RegularSeasonRecords;