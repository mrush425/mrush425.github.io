import React, { useMemo, useState, useEffect } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';
import { calculatePlayoffPoints, calculatePlayoffPointsAgainst } from '../../../Helper Files/PointCalculations';
import { getUserSeasonPlace, getOverallPlace, findRosterByUserId } from '../../../Helper Files/HelperMethods';

// =========================================================================
// TYPE DEFINITIONS
// =========================================================================

interface TeamPlayoffSeasonRow {
    userId: string;
    teamName: string;
    yearsPlayed: number;
    year: number;

    place: number;
    seasonPlace: number;

    points: number;
    games: number;

    avgPointsPerGameValue: number;
    avgPointsPerGameDisplay: string;

    pointsAgainst: number;
    avgPointsAgainstPerGameValue: number;
    avgPointsAgainstPerGameDisplay: string;
}

type SortKey =
    | 'teamName'
    | 'year'
    | 'avgPointsPerGameValue'
    | 'avgPointsAgainstPerGameValue'
    | 'place'
    | 'seasonPlace';

interface SortConfig {
    key: SortKey;
    direction: 'ascending' | 'descending';
}

interface MaxMinPlayoffSeasonStats {
    avgPointsPerGameValue: { max: number; min: number };
    avgPointsAgainstPerGameValue: { max: number; min: number };
}

// =========================================================================
// TYPES FOR WEEKLY BREAKDOWN
// =========================================================================

interface PlayoffWeeklyRow {
    week: number;
    opponentName: string;
    teamPoints: number;
    oppPoints: number;
    isBye: boolean;
}

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

const buildYearsPlayedMap = (data: LeagueData[]): Map<string, number> => {
    const map = new Map<string, number>();

    data.forEach((league) => {
        league.users.forEach((user) => {
            map.set(user.user_id, (map.get(user.user_id) ?? 0) + 1);
        });
    });

    return map;
};

const buildTeamPlayoffSeasonRows = (data: LeagueData[], minYears: number): TeamPlayoffSeasonRow[] => {
    const yearsPlayedMap = buildYearsPlayedMap(data);
    const rows: TeamPlayoffSeasonRow[] = [];

    const allUserIds = Array.from(yearsPlayedMap.keys());

    allUserIds.forEach((userId) => {
        const yearsPlayed = yearsPlayedMap.get(userId) ?? 0;
        if (yearsPlayed < minYears) return;

        data.forEach((league) => {
            const userInLeague = league.users.find((u) => u.user_id === userId);

            if (!userInLeague) return;

            const { points: playoffPoints, gamesPlayed } = calculatePlayoffPoints(userInLeague as SleeperUser, league);
            const { points: playoffPointsAgainst, gamesPlayed: gamesPlayedAgainst } = calculatePlayoffPointsAgainst(userInLeague as SleeperUser, league);

            // Only include if they played playoff games
            if (gamesPlayed <= 0) return;

            const year = Number.parseInt(league.season);

            const teamName =
                userInLeague.metadata.team_name || `User ${userId.substring(0, 4)}`;

            const seasonPlace = getUserSeasonPlace(userInLeague.user_id, league) ?? 0;
            const place = getOverallPlace(userInLeague.user_id, league.season) ?? 0;

            const avgPoints = playoffPoints / gamesPlayed;
            const avgAgainst = playoffPointsAgainst / gamesPlayed;

            const avgPointsRounded = Math.round(avgPoints * 100) / 100;
            const avgAgainstRounded = Math.round(avgAgainst * 100) / 100;

            rows.push({
                userId,
                teamName,
                yearsPlayed,
                year,

                place,
                seasonPlace,

                points: Math.round(playoffPoints * 100) / 100,
                games: gamesPlayed,

                avgPointsPerGameValue: avgPointsRounded,
                avgPointsPerGameDisplay: avgPointsRounded.toFixed(2),

                pointsAgainst: Math.round(playoffPointsAgainst * 100) / 100,
                avgPointsAgainstPerGameValue: avgAgainstRounded,
                avgPointsAgainstPerGameDisplay: avgAgainstRounded.toFixed(2),
            });
        });
    });

    return rows;
};

const getWeeklyPlayoffBreakdown = (data: LeagueData[], userId: string, season: number): PlayoffWeeklyRow[] => {
    const league = data.find((l) => Number.parseInt(l.season) === season);
    if (!league || !league.matchupInfo) return [];

    const roster = findRosterByUserId(userId, league.rosters);
    if (!roster) return [];

    const rosterIdToOwner = new Map<number, string>();
    league.rosters?.forEach((r: any) => {
        if (typeof r?.roster_id === 'number' && r?.owner_id) {
            rosterIdToOwner.set(r.roster_id, r.owner_id);
        }
    });

    const ownerToTeamName = new Map<string, string>();
    league.users?.forEach((u: any) => {
        if (u?.user_id) {
            ownerToTeamName.set(
                u.user_id,
                u?.metadata?.team_name || `User ${String(u?.user_id ?? '').substring(0, 4)}`
            );
        }
    });

    const playoffStartWeek = league.settings?.playoff_week_start || Infinity;
    const out: PlayoffWeeklyRow[] = [];
    
    // Check if user has a bye in the first playoff week (positions 1, 2, 7, 8)
    const seasonPlace = getUserSeasonPlace(userId, league);
    const hasByeInFirstWeek = [1, 2, 7, 8].includes(seasonPlace);

    // Find all playoff weeks - get max week from matchupInfo
    const playoffWeeks: number[] = [];
    league.matchupInfo.forEach((weekBlock: any) => {
        if (weekBlock.week >= playoffStartWeek) {
            if (!playoffWeeks.includes(weekBlock.week)) {
                playoffWeeks.push(weekBlock.week);
            }
        }
    });
    playoffWeeks.sort((a, b) => a - b);

    // Process each playoff week
    playoffWeeks.forEach((week) => {
        // If this is the first playoff week and user has a bye, mark it as bye
        if (hasByeInFirstWeek && week === playoffStartWeek) {
            out.push({
                week,
                opponentName: 'bye',
                teamPoints: 0,
                oppPoints: 0,
                isBye: true,
            });
            return;
        }

        const weekBlock = league.matchupInfo.find((w: any) => w.week === week);
        if (!weekBlock) return;

        const teamMatchup = weekBlock.matchups?.find((m: any) => m.roster_id === roster.roster_id);

        // If team has no matchup entry for this week, it's a bye
        if (!teamMatchup) {
            out.push({
                week,
                opponentName: 'bye',
                teamPoints: 0,
                oppPoints: 0,
                isBye: true,
            });
            return;
        }

        const oppMatchup = weekBlock.matchups?.find(
            (m: any) =>
                m.matchup_id === teamMatchup.matchup_id &&
                m.roster_id !== roster.roster_id
        );

        // Check if it's a bye week (no opponent in same matchup)
        if (!oppMatchup) {
            out.push({
                week,
                opponentName: 'bye',
                teamPoints: teamMatchup.points ?? 0,
                oppPoints: 0,
                isBye: true,
            });
            return;
        }

        const oppOwnerId = rosterIdToOwner.get(oppMatchup.roster_id);
        const opponentName =
            (oppOwnerId && ownerToTeamName.get(oppOwnerId)) || `Roster ${oppMatchup.roster_id}`;

        out.push({
            week,
            opponentName,
            teamPoints: teamMatchup.points ?? 0,
            oppPoints: oppMatchup.points ?? 0,
            isBye: false,
        });
    });

    return out;
};

const fmtPoints = (n: number) => {
    if (n === 0 && typeof n === 'number') return 'bye';
    const s = Number(n ?? 0).toFixed(2);
    return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
};

// =========================================================================
// WEEKLY BREAKDOWN SUB-COMPONENT (RIGHT PANE)
// =========================================================================

interface WeeklyPlayoffBreakdownProps {
    data: LeagueData[];
    selectedRow: TeamPlayoffSeasonRow;
}

const WeeklyPlayoffBreakdown: React.FC<WeeklyPlayoffBreakdownProps> = ({ data, selectedRow }) => {
    const weeklyStats = useMemo(() => {
        return getWeeklyPlayoffBreakdown(data, selectedRow.userId, selectedRow.year);
    }, [data, selectedRow.userId, selectedRow.year]);

    return (
        <div className="detail-pane">
            <div className="table-scroll-container">
                <table className="statsTable detail-table\">
                <thead>
                    <tr>
                        <th className="table-col-1">Week</th>
                        <th className="table-col-2">Opponent</th>
                        <th className="table-col-2">Score</th>
                    </tr>
                </thead>
                <tbody>
                    {weeklyStats.map((r) => (
                        <tr key={`${selectedRow.userId}-${selectedRow.year}-wk${r.week}`} className={r.isBye ? 'bye-week' : ''}>
                            <td>{r.week}</td>
                            <td>{r.isBye ? 'bye' : r.opponentName}</td>
                            <td>
                                {r.isBye
                                    ? 'bye'
                                    : `${fmtPoints(r.teamPoints)}-${fmtPoints(r.oppPoints)}`
                                }
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>

            {weeklyStats.length === 0 && (
                <div className="notImplementedMessage">No playoff matchup data found for this season/team.</div>
            )}
        </div>
    );
};

// =========================================================================
// MAIN COMPONENT
// =========================================================================

const YearlyPlayoffAveragePointsPerGame: React.FC<RecordComponentProps & { minYears?: number }> = ({
    data,
    minYears = 0,
}) => {
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        key: 'avgPointsPerGameValue',
        direction: 'descending',
    });

    const [selectedRow, setSelectedRow] = useState<TeamPlayoffSeasonRow | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileDetail, setShowMobileDetail] = useState(false);

    const { sortedRows, maxMinValues } = useMemo(() => {
        const rows = buildTeamPlayoffSeasonRows(data, minYears);

        if (rows.length === 0) {
            return {
                sortedRows: [] as TeamPlayoffSeasonRow[],
                maxMinValues: {
                    avgPointsPerGameValue: { max: 0, min: 0 },
                    avgPointsAgainstPerGameValue: { max: 0, min: 0 },
                } as MaxMinPlayoffSeasonStats,
            };
        }

        const avgPts = rows.map((r) => r.avgPointsPerGameValue);
        const avgAgainst = rows.map((r) => r.avgPointsAgainstPerGameValue);

        const mm: MaxMinPlayoffSeasonStats = {
            avgPointsPerGameValue: {
                max: Math.max(...avgPts),
                min: Math.min(...avgPts),
            },
            avgPointsAgainstPerGameValue: {
                max: Math.max(...avgAgainst),
                min: Math.min(...avgAgainst),
            },
        };

        const sorted = [...rows].sort((a, b) => {
            const { key, direction } = sortConfig;
            const dir = direction === 'ascending' ? 1 : -1;

            if (key === 'teamName') return a.teamName.localeCompare(b.teamName) * dir;
            if (key === 'year') return (a.year - b.year) * dir;

            const aVal = a[key] as number;
            const bVal = b[key] as number;
            return (aVal - bVal) * dir;
        });

        return { sortedRows: sorted, maxMinValues: mm };
    }, [data, minYears, sortConfig]);

    useEffect(() => {
        if (!selectedRow && sortedRows.length > 0) {
            setSelectedRow(sortedRows[0]);
        }
    }, [sortedRows, selectedRow]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleSort = (key: SortKey) => {
        setSortConfig((prev) => ({
            key,
            direction:
                prev.key === key && prev.direction === 'descending'
                    ? 'ascending'
                    : 'descending',
        }));
    };

    const getSortIndicator = (key: SortKey) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const getCellClassName = (key: keyof MaxMinPlayoffSeasonStats, value: number): string => {
        const { max, min } = maxMinValues[key];
        if (max === min) return '';

        if (key === 'avgPointsPerGameValue') {
            if (value === max) return 'highlight-best';
            if (value === min) return 'highlight-worst';
        }

        if (key === 'avgPointsAgainstPerGameValue') {
            if (value === min) return 'highlight-best';
            if (value === max) return 'highlight-worst';
        }

        return '';
    };

    if (sortedRows.length === 0) {
        return (
            <div className="yearly-playoff-average-points">
                <div className="notImplementedMessage">
                    No playoff data found (min years: {minYears})
                </div>
            </div>
        );
    }

    const handleBackToList = () => {
        setShowMobileDetail(false);
    };

    return (
        <div className="yearly-playoff-average-points">
            {isMobile && showMobileDetail && (
                <button onClick={handleBackToList} className="mobile-back-button">
                    ← Back to List
                </button>
            )}
            <div className="two-pane-layout">
                {/* LEFT TABLE */}
                <div className={`main-table-pane ${isMobile && showMobileDetail ? 'mobile-hidden' : ''}`}>
                    <div className="table-scroll-container">
                        <table className="leagueStatsTable regular-season-table selectable-table\">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('teamName')} className="sortable">
                                    Team (Years) {getSortIndicator('teamName')}
                                </th>

                                <th onClick={() => handleSort('year')} className="sortable">
                                    Year {getSortIndicator('year')}
                                </th>

                                <th onClick={() => handleSort('place')} className="sortable">
                                    Place {getSortIndicator('place')}
                                </th>

                                <th onClick={() => handleSort('seasonPlace')} className="sortable">
                                    Season Place {getSortIndicator('seasonPlace')}
                                </th>

                                <th onClick={() => handleSort('avgPointsPerGameValue')} className="sortable">
                                    Avg. Pts/Game {getSortIndicator('avgPointsPerGameValue')}
                                </th>

                                <th
                                    onClick={() => handleSort('avgPointsAgainstPerGameValue')}
                                    className="sortable"
                                >
                                    Avg. Pts Against {getSortIndicator('avgPointsAgainstPerGameValue')}
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {sortedRows.map((row, index) => (
                                <tr
                                    key={`${row.userId}-${row.year}`}
                                    className={`${selectedRow?.userId === row.userId && selectedRow?.year === row.year
                                        ? 'active selected-row'
                                        : ''
                                        } ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                                    onClick={() => {
                                        const newSelection = (prev: TeamPlayoffSeasonRow | null) =>
                                            prev?.userId === row.userId && prev?.year === row.year ? null : row;
                                        setSelectedRow(newSelection);
                                        if (isMobile) setShowMobileDetail(true);
                                    }}
                                >
                                    <td className="team-name-cell">
                                        {row.teamName} ({row.yearsPlayed})
                                    </td>

                                    <td>{row.year}</td>

                                    <td>{row.place || '-'}</td>

                                    <td>{row.seasonPlace || '-'}</td>

                                    <td
                                        className={getCellClassName('avgPointsPerGameValue', row.avgPointsPerGameValue)}
                                    >
                                        {row.avgPointsPerGameDisplay} ({row.points.toFixed(2)})
                                    </td>

                                    <td
                                        className={getCellClassName(
                                            'avgPointsAgainstPerGameValue',
                                            row.avgPointsAgainstPerGameValue
                                        )}
                                    >
                                        {row.avgPointsAgainstPerGameDisplay} ({row.pointsAgainst.toFixed(2)})
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>

                {/* RIGHT PANE */}
                <div className={`detail-pane-wrapper ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
                    {selectedRow ? (
                        <WeeklyPlayoffBreakdown
                            data={data}
                            selectedRow={selectedRow}
                        />
                    ) : (
                        <div className="notImplementedMessage">
                            Select a season row to see weekly playoff matchups.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default YearlyPlayoffAveragePointsPerGame;
