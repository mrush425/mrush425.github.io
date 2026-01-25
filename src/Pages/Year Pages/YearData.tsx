import React, { useState, useEffect } from 'react'; // Import useEffect
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar'; // Import the YearNavBar component
import '../../Stylesheets/YearStylesheets/YearData.css'; // Create a CSS file for styling
import { 
    displayRecord, 
    getAverageLeagueRecordAtSchedule, 
    getAverageRecordAgainstLeague, 
    getLeagueRecordAtSchedule, 
    getRecordAgainstLeague, 
    getRecordInTop50,
    recordAgainstWinningTeams, // <--- NEW IMPORT
} from '../../Helper Files/RecordCalculations';
import yearSidebetsData from '../../Data/yearSidebets.json';
import SidebetMethods, { Sidebet, YearSidebet } from '../../Helper Files/SidebetMethods';

import SidebetStat from '../../Interfaces/SidebetStat';
import SidebetStats from './SidebetStats';
import { getLast3WeeksAveragePointsMap, getUserSeasonPlace } from '../../Helper Files/HelperMethods';

interface YearDataProps {
    data: LeagueData;
}

// Extend SortKey type to include the new column
type SortKey = 'seasonPlace' | 'wins' | 'fpts' | 'last3Ave' | 'fptsAgainst' | 'winsAgainstEveryone' | 'winsAtSchedule' | 'winsTop50' | 'winsAgainstWinningTeams' | 'default';
type TabType = 'basic' | 'advanced' | 'sidebets';

const YearData: React.FC<YearDataProps> = ({ data }) => {
    // UPDATED: Added 'winsAgainstWinningTeams' to the possible sort keys
    const [sortBy, setSortBy] = useState<SortKey>('default');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [sortedRosters, setSortedRosters] = useState(data.rosters); // Initial state with data.rosters
    const [sidebetsDisplay, setSidebetsDisplay] = useState<SidebetDisplay[]>([]); // State to store sidebets data
    const [activeTab, setActiveTab] = useState<TabType>('sidebets');
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const users = data.users;
    const last3AveragePointsMap = getLast3WeeksAveragePointsMap(data);

    const toggleRowExpanded = (rosterId: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(rosterId)) {
            newExpanded.delete(rosterId);
        } else {
            newExpanded.add(rosterId);
        }
        setExpandedRows(newExpanded);
    };

    // UPDATED: Added 'winsAgainstWinningTeams' to the handleSort parameter type
    const handleSort = (column: 'seasonPlace' | 'wins' | 'fpts' | 'last3Ave' | 'fptsAgainst' | 'winsAgainstEveryone' | 'winsAtSchedule' | 'winsTop50' | 'winsAgainstWinningTeams') => {
        setSortBy(column);
        setSortDirection(sortBy === column ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'desc');
    };

    useEffect(() => {
        const sortedData = data.rosters.slice().sort((a, b) => {
            const userA = users.find((u) => u.user_id === a.owner_id);
            const userB = users.find((u) => u.user_id === b.owner_id);
            if (!userA || !userB) return 0;

            if (sortBy === 'seasonPlace') {
                const placeA = getUserSeasonPlace(userA.user_id, data);
                const placeB = getUserSeasonPlace(userB.user_id, data);
                return sortDirection === 'asc' ? placeA - placeB : placeB - placeA;
            }
            else if (sortBy === 'wins' || sortBy === 'default') {
                return sortDirection === 'asc' ? a.settings.wins - b.settings.wins || a.settings.fpts - b.settings.fpts : b.settings.wins - a.settings.wins || b.settings.fpts - a.settings.fpts;
            } else if (sortBy === 'fpts') {
                const fptsA = parseFloat(`${a.settings.fpts}.${a.settings.fpts_decimal}`);
                const fptsB = parseFloat(`${b.settings.fpts}.${b.settings.fpts_decimal}`);
                return sortDirection === 'asc' ? fptsA - fptsB : fptsB - fptsA;
            }
            else if (sortBy === 'last3Ave') {
                const fptsA = parseFloat(last3AveragePointsMap.get(userA.user_id)?.toFixed(2) ?? "");
                const fptsB = parseFloat(last3AveragePointsMap.get(userB.user_id)?.toFixed(2) ?? "");
                return sortDirection === 'asc' ? fptsA - fptsB : fptsB - fptsA;
            } 
            // NEW SORTING LOGIC
            else if (sortBy === 'winsAgainstWinningTeams') {
                const winsA = recordAgainstWinningTeams(userA, data)[0];
                const winsB = recordAgainstWinningTeams(userB, data)[0];
                return sortDirection === 'asc' ? winsA - winsB : winsB - winsA;
            }
            // END NEW SORTING LOGIC
            else if (sortBy === 'fptsAgainst') {
                const fptsA = parseFloat(`${a.settings.fpts_against}.${a.settings.fpts_against_decimal}`);
                const fptsB = parseFloat(`${b.settings.fpts_against}.${b.settings.fpts_against_decimal}`);
                return sortDirection === 'asc' ? fptsA - fptsB : fptsB - fptsA;
            } else if (sortBy === 'winsAgainstEveryone') {
                const winsA = getRecordAgainstLeague(userA, data)[0];
                const winsB = getRecordAgainstLeague(userB, data)[0];
                return sortDirection === 'asc' ? winsA - winsB : winsB - winsA;
            } else if (sortBy === 'winsAtSchedule') {
                const winsA = getLeagueRecordAtSchedule(userA, data)[0];
                const winsB = getLeagueRecordAtSchedule(userB, data)[0];
                return sortDirection === 'asc' ? winsA - winsB : winsB - winsA;
            } else if (sortBy === 'winsTop50') {
                const winsA = getRecordInTop50(userA, data)[0];
                const winsB = getRecordInTop50(userB, data)[0];
                return sortDirection === 'asc' ? winsA - winsB : winsB - winsA;
            } else {
                return 0;
            }
        });
        setSortedRosters(sortedData);
    }, [data.rosters, sortBy, sortDirection]);

    useEffect(() => {
        // ... (Sidebet fetching logic remains the same) ...
        const fetchSidebetData = async () => {
            const yearData = yearSidebetsData.find((entry) => entry.year === Number.parseFloat(data.season));
        
            const sidebets: SidebetDisplay[] = [];
        
            if (yearData) {
              for (const sidebetEntry of yearData.data) {
                const sidebet: Sidebet | undefined = SidebetMethods.Sidebets().find(
                  (sidebet) => sidebet.displayName === sidebetEntry.sidebetName
                );
        
                if (sidebet) {
                  let result: SidebetStat[] | undefined;
                  try {
                    const method = (SidebetMethods as any)[sidebet.methodName]?.bind(SidebetMethods);
        
                    if (method) {
                      if (sidebet.isAsync) {
                        result = await method(data);
                      } else {
                        result = method(data);
                      }
                    }
                  } catch (error) {
                    console.error(`Error executing method ${sidebet.methodName}:`, error);
                  }
        
                  if (result && result.length > 0) {
                    let sidebetDisplay: SidebetDisplay = {
                      sidebetName: sidebet.displayName,
                      winners: [],
                      statDisplays: [],
                    };
        
                    const firstResult = result[0];
                    sidebetDisplay.winners.push(firstResult?.user?.metadata?.team_name || "n/a");
                    sidebetDisplay.statDisplays.push(firstResult?.stats_display || "n/a");
        
                    if (firstResult?.stat_number) {
                      result.slice(1).forEach((res) => {
                        if (res.stat_number === firstResult.stat_number) {
                          sidebetDisplay.statDisplays.push(res.stats_display || "n/a");
                          sidebetDisplay.winners.push(res?.user?.metadata?.team_name || "n/a");
                        }
                      });
                    } else if (firstResult?.stats_record) {
                      result.slice(1).forEach((res) => {
                        if (
                          res.stats_record?.wins === firstResult.stats_record?.wins &&
                          res.stats_record?.losses === firstResult.stats_record?.losses
                        ) {
                          sidebetDisplay.statDisplays.push(res.stats_display || "n/a");
                          sidebetDisplay.winners.push(res?.user?.metadata?.team_name || "n/a");
                        }
                      });
                    }
        
                    sidebets.push(sidebetDisplay);
                  } else {
                    sidebets.push({
                      sidebetName: sidebet.displayName,
                      winners: ["n/a"],
                      statDisplays: ["n/a"],
                    });
                  }
                }
              }
            }
            setSidebetsDisplay(sidebets);
          };
        
          fetchSidebetData();
    }, [data]);

    // Helper to get the record against winning teams
    const getRecordAgainstWinningTeams = (userId: string) => {
        const user = users.find((u) => u.user_id === userId);
        if (user) {
            return displayRecord(...recordAgainstWinningTeams(user, data));
        }
        return "0-0-0";
    };

    // Helper to format record without ties if ties are 0
    const formatRecordWithoutTies = (recordStr: string): string => {
        const parts = recordStr.split('-');
        if (parts.length === 3 && parts[2] === '0') {
            return `${parts[0]}-${parts[1]}`;
        }
        return recordStr;
    };

    return (
        <div>
            <YearNavBar data={data} />

            <div className="year-data-container">
                <h2 className="year-data-title">{`Season ${data.season}`}</h2>

                {/* Stat Cards Section */}
                <div className="stat-cards-container">
                    {sortedRosters.map((roster) => {
                        const user = users.find((u) => u.user_id === roster.owner_id);
                        if (!user) return null;
                        const wins = roster.settings.wins;
                        const totalGames = wins + roster.settings.losses;
                        const winPct = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0';
                        const recordAgainstEveryone = getRecordAgainstLeague(user, data);
                        const seasonPlace = getUserSeasonPlace(user.user_id, data);
                        
                        return (
                            <div key={roster.roster_id} className="stat-card">
                                <div className="stat-card-header">
                                    <div className="stat-card-title">{user.metadata.team_name}</div>
                                    <div className={`stat-card-place ${seasonPlace <= 6 ? 'playoffs' : 'no-playoffs'}`}>
                                        #{seasonPlace}
                                    </div>
                                </div>
                                
                                <div className="stat-card-grid">
                                    <div className="stat-item">
                                        <div className="stat-label">Record</div>
                                        <div className="stat-value">{wins}-{roster.settings.losses}</div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-label">Win %</div>
                                        <div className="stat-value">{winPct}%</div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{width: `${winPct}%`}}></div>
                                        </div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-label">Points</div>
                                        <div className="stat-value">{roster.settings.fpts}.{roster.settings.fpts_decimal}</div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-label">vs All</div>
                                        <div className="stat-value">{formatRecordWithoutTies(displayRecord(...recordAgainstEveryone))}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Tab Navigation */}
                <div className="tab-navigation">
                    <button className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`} onClick={() => setActiveTab('basic')}>
                        Basic Stats
                    </button>
                    <button className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`} onClick={() => setActiveTab('advanced')}>
                        Advanced Stats
                    </button>
                    <button className={`tab-button ${activeTab === 'sidebets' ? 'active' : ''}`} onClick={() => setActiveTab('sidebets')}>
                        Sidebets
                    </button>
                </div>

                {/* Tables Based on Tab */}
                {(activeTab === 'basic' || activeTab === 'advanced') && (
                    <table className="records-table">
                        <thead>
                            <tr>
                                <th style={{ cursor: 'pointer', width: '50px' }} onClick={() => handleSort('seasonPlace')}>
                                    Place
                                    {sortBy === 'seasonPlace' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
                                </th>
                                <th style={{ width: '150px' }}>Team</th>
                                
                                {activeTab === 'basic' && (
                                    <>
                                        <th style={{ cursor: 'pointer', width: '100px' }} onClick={() => handleSort('wins')}>
                                            Record
                                            {sortBy === 'wins' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
                                        </th>
                                        <th style={{ cursor: 'pointer', width: '100px' }} onClick={() => handleSort('fpts')}>
                                            Points
                                            {sortBy === 'fpts' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
                                        </th>
                                        <th style={{ cursor: 'pointer', width: '100px' }} onClick={() => handleSort('last3Ave')}>
                                            Last 3 Avg
                                            {sortBy === 'last3Ave' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
                                        </th>
                                        <th style={{ cursor: 'pointer', width: '100px' }} onClick={() => handleSort('fptsAgainst')}>
                                            Points Against
                                            {sortBy === 'fptsAgainst' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
                                        </th>
                                    </>
                                )}
                                
                                {activeTab === 'advanced' && (
                                    <>
                                        <th style={{ cursor: 'pointer', width: '150px' }} onClick={() => handleSort('winsAgainstEveryone')}>
                                            vs Everyone
                                            {sortBy === 'winsAgainstEveryone' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
                                        </th>
                                        <th style={{ cursor: 'pointer', width: '150px' }} onClick={() => handleSort('winsAtSchedule')}>
                                            League Schedule
                                            {sortBy === 'winsAtSchedule' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
                                        </th>
                                        <th style={{ cursor: 'pointer', width: '150px' }} onClick={() => handleSort('winsTop50')}>
                                            Top 50%
                                            {sortBy === 'winsTop50' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
                                        </th>
                                        <th style={{ cursor: 'pointer', width: '150px' }} onClick={() => handleSort('winsAgainstWinningTeams')}>
                                            vs Winning Teams
                                            {sortBy === 'winsAgainstWinningTeams' && <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
                                        </th>
                                    </>
                                )}
                                
                                <th style={{ width: '40px' }}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRosters.map((roster, index) => {
                                const user = users.find((u) => u.user_id === roster.owner_id);
                                const seasonPlace = user ? getUserSeasonPlace(user.user_id, data) : null;
                                let recordAgainstEveryone: string = "";
                                let leagueRecordAtSchedule: string = "";
                                let averageRecordAgainstEveryone: string = "";
                                let averageLeagueRecordAtSchedule: string = "";
                                let recordInTop50: string = "";
                                let recordVsWinningTeams: string = "";
                                let className = "";
                                let last3Average = "";

                                if (user && getUserSeasonPlace(user.user_id, data) <= 6) {
                                    className = "playoffs-team";
                                }

                                if (user) {
                                    recordAgainstEveryone = displayRecord(...getRecordAgainstLeague(user, data));
                                    leagueRecordAtSchedule = displayRecord(...getLeagueRecordAtSchedule(user, data));
                                    averageRecordAgainstEveryone = displayRecord(...getAverageRecordAgainstLeague(user, data));
                                    averageLeagueRecordAtSchedule = displayRecord(...getAverageLeagueRecordAtSchedule(user, data));
                                    recordInTop50 = displayRecord(...getRecordInTop50(user, data));
                                    recordVsWinningTeams = getRecordAgainstWinningTeams(user.user_id);
                                    last3Average = last3AveragePointsMap.get(user.user_id)?.toFixed(2) ?? "";
                                }

                                const isExpanded = expandedRows.has(roster.roster_id);

                                return (
                                    <React.Fragment key={roster.roster_id}>
                                        <tr className={className}>
                                            <td>{seasonPlace}</td>
                                            <td>{user?.metadata.team_name}</td>
                                            
                                            {activeTab === 'basic' && (
                                                <>
                                                    <td>{`${roster.settings.wins}-${roster.settings.losses}`}</td>
                                                    <td>{`${roster.settings.fpts}.${roster.settings.fpts_decimal}`}</td>
                                                    <td>{`${last3Average}`}</td>
                                                    <td>{`${roster.settings.fpts_against}.${roster.settings.fpts_against_decimal}`}</td>
                                                </>
                                            )}
                                            
                                            {activeTab === 'advanced' && (
                                                <>
                                                    <td>{`${recordAgainstEveryone} (${averageRecordAgainstEveryone})`}</td>
                                                    <td>{`${leagueRecordAtSchedule} (${averageLeagueRecordAtSchedule})`}</td>
                                                    <td>{`${recordInTop50}`}</td>
                                                    <td>{`${recordVsWinningTeams}`}</td>
                                                </>
                                            )}
                                            
                                            <td className="expand-cell">
                                                <button className="expand-button" onClick={() => toggleRowExpanded(roster.roster_id)}>
                                                    {isExpanded ? '−' : '+'}
                                                </button>
                                            </td>
                                        </tr>
                                        
                                        {isExpanded && (
                                            <tr className="expanded-row">
                                                <td colSpan={activeTab === 'basic' ? 7 : 7} className="expanded-content">
                                                    <div className="expanded-details">
                                                        <div className="detail-column">
                                                            <h4>Record</h4>
                                                            <div>Season: {roster.settings.wins}-{roster.settings.losses}</div>
                                                            <div>vs Everyone: {recordAgainstEveryone} ({averageRecordAgainstEveryone})</div>
                                                            <div>League Schedule: {leagueRecordAtSchedule} ({averageLeagueRecordAtSchedule})</div>
                                                            <div>Top 50%: {recordInTop50}</div>
                                                            <div>vs Winning Teams: {recordVsWinningTeams}</div>
                                                        </div>
                                                        <div className="detail-column">
                                                            <h4>Scoring</h4>
                                                            <div>Total Points: {roster.settings.fpts}.{roster.settings.fpts_decimal}</div>
                                                            <div>Points Against: {roster.settings.fpts_against}.{roster.settings.fpts_against_decimal}</div>
                                                            <div>Last 3 Average: {last3Average}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {activeTab === 'sidebets' && (
                    <div className="sidebets-section">
                        <table className="sidebets-table">
                            <thead>
                                <tr>
                                    <th>Sidebet</th>
                                    <th>Winners</th>
                                    <th>Stats</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sidebetsDisplay.map((sidebet, index) => (
                                    <tr key={index}>
                                        <td>{sidebet.sidebetName}</td>
                                        <td><span className="winner-badge">{sidebet.winners.join(", ")}</span></td>
                                        <td dangerouslySetInnerHTML={{
                                            __html: sidebet.statDisplays.join("<br>"),
                                        }}
                                        ></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};


interface SidebetDisplay {
    sidebetName: string | undefined,
    winners: string[],
    statDisplays: string[]
}

export default YearData;