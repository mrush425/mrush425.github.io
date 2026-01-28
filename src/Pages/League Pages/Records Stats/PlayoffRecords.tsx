import React, { useMemo } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';
import { 
    calculatePlayoffRecord, 
    displayRecord, 
    getRecordWinPercentage,
    getPlayoffRecordAgainstLeague 
} from '../../../Helper Files/RecordCalculations';
import { getUserSeasonPlace } from '../../../Helper Files/HelperMethods';

// =========================================================================
// TYPE DEFINITIONS
// =========================================================================

interface TeamPlayoffRecord {
    userId: string;
    teamName: string;
    yearsPlayed: number;
    totalWins: number;
    totalLosses: number;
    totalTies: number;
    winPercentage: string;
    winPercentageValue: number;
    vsLeagueWins: number;
    vsLeagueLosses: number;
    vsLeagueTies: number;
    vsLeagueWinPct: string;
    vsLeagueWinPctValue: number;
    winnersBracketCount: number;
    losersBracketCount: number;
}

interface YearlyPlayoffRecord {
    year: number;
    bracket: string; // "Winners" or "Losers"
    overallRecord: string;
    overallWinPct: string;
    vsAvgRecord: string;
    vsAvgWinPct: string;
}

type SortKey = keyof TeamPlayoffRecord;
interface SortConfig {
    key: SortKey | null;
    direction: 'ascending' | 'descending';
}

interface MaxMinStats {
    yearsPlayed: { max: number; min: number };
    winnersBracketCount: { max: number; min: number };
    winPercentageValue: { max: number; min: number };
    vsLeagueWinPctValue: { max: number; min: number };
}

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

const getPctValue = (pctString: string) => parseFloat(pctString.replace('%', ''));

const buildYearsPlayedMap = (data: LeagueData[]): Map<string, number> => {
    const map = new Map<string, number>();
    data.forEach((league) => {
        league.users.forEach((user) => {
            map.set(user.user_id, (map.get(user.user_id) ?? 0) + 1);
        });
    });
    return map;
};

// =========================================================================
// CORE LOGIC: AGGREGATION
// =========================================================================

const aggregatePlayoffRecords = (data: LeagueData[], minYears: number): TeamPlayoffRecord[] => {
    const yearsPlayedMap = buildYearsPlayedMap(data);
    const allUserIDs = Array.from(yearsPlayedMap.keys());

    const recordsMap = new Map<string, TeamPlayoffRecord>();

    allUserIDs.forEach((userId) => {
        const yearsPlayed = yearsPlayedMap.get(userId) ?? 0;
        if (yearsPlayed < minYears) return;

        let totalWins = 0;
        let totalLosses = 0;
        let totalTies = 0;
        let vsLeagueWins = 0;
        let vsLeagueLosses = 0;
        let vsLeagueTies = 0;
        let winnersBracketCount = 0;
        let losersBracketCount = 0;
        let userName = '';

        data.forEach((league) => {
            const user = league.users.find((u) => u.user_id === userId);
            if (!user) return;

            if (!userName) {
                userName = user.metadata?.team_name || user.display_name || userId.substring(0, 8);
            }

            const [wins, losses, ties] = calculatePlayoffRecord(user, league);
            const [vsWins, vsLosses, vsTies] = getPlayoffRecordAgainstLeague(user, league);

            totalWins += wins;
            totalLosses += losses;
            totalTies += ties;
            vsLeagueWins += vsWins;
            vsLeagueLosses += vsLosses;
            vsLeagueTies += vsTies;

            // Only count bracket if they actually played playoff games
            const gamesPlayed = wins + losses + ties;
            if (gamesPlayed > 0) {
                // Determine bracket based on season place
                const seasonPlace = getUserSeasonPlace(userId, league);
                if (seasonPlace <= 6) {
                    winnersBracketCount++;
                } else {
                    losersBracketCount++;
                }
            }
        });

        const totalGames = totalWins + totalLosses + totalTies;
        const winPercentage = totalGames > 0 ? getRecordWinPercentage(totalWins, totalLosses, totalTies) : '0.00%';
        const winPercentageValue = getPctValue(winPercentage);

        const vsLeagueGames = vsLeagueWins + vsLeagueLosses + vsLeagueTies;
        const vsLeagueWinPct = vsLeagueGames > 0 ? getRecordWinPercentage(vsLeagueWins, vsLeagueLosses, vsLeagueTies) : '0.00%';
        const vsLeagueWinPctValue = getPctValue(vsLeagueWinPct);

        recordsMap.set(userId, {
            userId,
            teamName: userName,
            yearsPlayed,
            totalWins,
            totalLosses,
            totalTies,
            winPercentage,
            winPercentageValue,
            vsLeagueWins,
            vsLeagueLosses,
            vsLeagueTies,
            vsLeagueWinPct,
            vsLeagueWinPctValue,
            winnersBracketCount,
            losersBracketCount
        });
    });

    return Array.from(recordsMap.values());
};

// =========================================================================
// YEARLY BREAKDOWN
// =========================================================================

const getYearlyPlayoffRecords = (userId: string, data: LeagueData[]): YearlyPlayoffRecord[] => {
    const records: YearlyPlayoffRecord[] = [];

    data.forEach((league) => {
        const user = league.users.find((u) => u.user_id === userId);
        if (!user) return;

        const year = parseInt(league.season);
        const [wins, losses, ties] = calculatePlayoffRecord(user, league);
        const [vsWins, vsLosses, vsTies] = getPlayoffRecordAgainstLeague(user, league);
        
        const gamesPlayed = wins + losses + ties;
        
        // Determine bracket based on season place
        const seasonPlace = getUserSeasonPlace(userId, league);
        const bracket = seasonPlace <= 6 ? 'Winners' : 'Losers';

        const overallRecord = gamesPlayed > 0 ? displayRecord(wins, losses, ties) : '-';
        const overallWinPct = gamesPlayed > 0 ? getRecordWinPercentage(wins, losses, ties) : '-';

        const vsAvgGames = vsWins + vsLosses + vsTies;
        const vsAvgRecord = vsAvgGames > 0 ? displayRecord(vsWins, vsLosses, vsTies) : '-';
        const vsAvgWinPct = vsAvgGames > 0 ? getRecordWinPercentage(vsWins, vsLosses, vsTies) : '-';

        records.push({
            year,
            bracket,
            overallRecord,
            overallWinPct,
            vsAvgRecord,
            vsAvgWinPct,
        });
    });

    return records;
};

// =========================================================================
// MAX/MIN CALCULATIONS
// =========================================================================

const calculateMaxMin = (records: TeamPlayoffRecord[]): MaxMinStats => {
    if (records.length === 0) {
        return {
            yearsPlayed: { max: 0, min: 0 },
            winPercentageValue: { max: 0, min: 0 },
            vsLeagueWinPctValue: { max: 0, min: 0 },
            winnersBracketCount: { max: 0, min: 0 },
        };
    }

    return {
        yearsPlayed: {
            max: Math.max(...records.map((r) => r.yearsPlayed)),
            min: Math.min(...records.map((r) => r.yearsPlayed)),
        },
        winPercentageValue: {
            max: Math.max(...records.map((r) => r.winPercentageValue)),
            min: Math.min(...records.map((r) => r.winPercentageValue)),
        },
        vsLeagueWinPctValue: {
            max: Math.max(...records.map((r) => r.vsLeagueWinPctValue)),
            min: Math.min(...records.map((r) => r.vsLeagueWinPctValue)),
        },
        winnersBracketCount: {
            max: Math.max(...records.map((r) => r.winnersBracketCount)),
            min: Math.min(...records.map((r) => r.winnersBracketCount)),
        },
    };
};

// =========================================================================
// COMPONENT
// =========================================================================

// =========================================================================
// YEARLY BREAKDOWN SUB-COMPONENT (RIGHT PANE)
// =========================================================================

interface YearlyPlayoffBreakdownProps {
    data: LeagueData[];
    selectedTeam: TeamPlayoffRecord;
}

const YearlyPlayoffBreakdown: React.FC<YearlyPlayoffBreakdownProps> = ({ data, selectedTeam }) => {
    const yearlyStats = useMemo(() => {
        return getYearlyPlayoffRecords(selectedTeam.userId, data);
    }, [data, selectedTeam.userId]);

    const formatRecordCell = (record: string, winPct: string): string => {
        return `${record} (${winPct})`;
    };

    return (
        <div className="detail-pane">
            <table className="leagueStatsTable detail-table">
                <thead>
                    <tr>
                        <th className="table-col-1">Year</th>
                        <th className="table-col-2">Bracket</th>
                        <th className="table-col-2">Overall</th>
                        <th className="table-col-3">Vs. Avg</th>
                    </tr>
                </thead>
                <tbody>
                    {yearlyStats.map((stat) => (
                        <tr key={stat.year}>
                            <td>{stat.year}</td>
                            <td>{stat.bracket}</td>
                            <td>{stat.overallRecord !== '-' ? formatRecordCell(stat.overallRecord, stat.overallWinPct) : '-'}</td>
                            <td>{stat.vsAvgRecord !== '-' ? formatRecordCell(stat.vsAvgRecord, stat.vsAvgWinPct) : '-'}</td>
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
// MAIN REACT COMPONENT
// =========================================================================

const PlayoffRecords: React.FC<RecordComponentProps> = ({ data, minYears = 0 }) => {
    const [sortConfig, setSortConfig] = React.useState<SortConfig>({
        key: 'winPercentageValue',
        direction: 'descending',
    });
    const [selectedTeam, setSelectedTeam] = React.useState<TeamPlayoffRecord | null>(null);

    const { sortedRecords, maxMinValues } = useMemo(() => {
        const records = aggregatePlayoffRecords(data, minYears);
        
        if (records.length === 0) {
            return { sortedRecords: [], maxMinValues: calculateMaxMin([]) };
        }

        // Calculate max/min
        const maxMinValues = calculateMaxMin(records);

        // Sort records
        const sortableItems = [...records];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];

                if (sortConfig.key === 'teamName') {
                    if (a.teamName < b.teamName) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (a.teamName > b.teamName) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return sortConfig.direction === 'ascending' ? a.yearsPlayed - b.yearsPlayed : b.yearsPlayed - a.yearsPlayed;
                }
                
                if (typeof aValue === 'number' && typeof bValue === 'number') {
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

    React.useEffect(() => {
        if (!selectedTeam && sortedRecords.length > 0) {
            setSelectedTeam(sortedRecords[0]);
        }
    }, [sortedRecords, selectedTeam]);

    const handleSort = (key: SortKey) => {
        let direction: SortConfig['direction'] = 'descending';
        
        if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        }
        
        setSortConfig({ key, direction });
    };

    const handleRowClick = (record: TeamPlayoffRecord) => {
        setSelectedTeam(record);
    };

    const getSortIndicator = (key: SortKey) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' \u25B2' : ' \u25BC';
    };

    const getCellClassName = (key: keyof MaxMinStats, value: number): string => {
        const stats = maxMinValues[key];
        if (!stats) return '';
        const { max, min } = stats;
        
        if (max === min) return '';

        if (value === max) return 'highlight-best';
        if (value === min) return 'highlight-worst';
        
        return '';
    };

    const formatRecordCell = (record: string, winPct: string): string => {
        return `${record} (${winPct})`;
    };

    if (sortedRecords.length === 0) {
        return (
            <div className="regular-season-records">
                <div className="notImplementedMessage">
                    No playoff record data found for the current filter settings (min years: {minYears}).
                </div>
            </div>
        );
    }

    return (
        <div className="regular-season-records">

                                <th onClick={() => handleSort('winnersBracketCount')} className="table-col-2 sortable">
                                    Winners-Losers {getSortIndicator('winnersBracketCount')}
                                </th>
            <div className="two-pane-layout">
                
                {/* -------------------- LEFT PANE: MAIN TABLE -------------------- */}
                <div className="main-table-pane">
                    <table className="leagueStatsTable regular-season-table selectable-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('teamName')} className="table-col-team sortable">
                                    Team (Years) {getSortIndicator('teamName')}
                                </th>
                                
                                <th onClick={() => handleSort('winPercentageValue')} className="table-col-2 sortable">
                                    Overall % {getSortIndicator('winPercentageValue')}
                                </th>
                                
                                <th onClick={() => handleSort('winnersBracketCount')} className="table-col-2 sortable">
                                    Winners-Losers {getSortIndicator('winnersBracketCount')}
                                </th>
                                
                                <th onClick={() => handleSort('vsLeagueWinPctValue')} className="table-col-2 sortable">
                                    Vs. Avg % {getSortIndicator('vsLeagueWinPctValue')}
                                </th>
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
                                        {formatRecordCell(displayRecord(record.totalWins, record.totalLosses, record.totalTies), record.winPercentage)}
                                    </td>
                                    
                                    <td className={getCellClassName('winnersBracketCount', record.winnersBracketCount)}>
                                        {record.winnersBracketCount}-{record.losersBracketCount}
                                    </td>
                                    
                                    <td className={getCellClassName('vsLeagueWinPctValue', record.vsLeagueWinPctValue)}>
                                        {formatRecordCell(displayRecord(record.vsLeagueWins, record.vsLeagueLosses, record.vsLeagueTies), record.vsLeagueWinPct)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* -------------------- RIGHT PANE: YEARLY BREAKDOWN -------------------- */}
                <div className="detail-pane-wrapper">
                    {selectedTeam ? (
                        <YearlyPlayoffBreakdown data={data} selectedTeam={selectedTeam} />
                    ) : (
                        <div className="notImplementedMessage">
                            Select a team from the table to see a yearly playoff breakdown.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayoffRecords;
