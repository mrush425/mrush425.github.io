import React, { useState, useEffect, useMemo } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import '../../Stylesheets/YearStylesheets/MoneyCalculator.css';
import yearSidebetsData from '../../Data/yearSidebets.json';
import yearDataJson from '../../Data/yearData.json';
import SidebetMethods, { Sidebet } from '../../Helper Files/SidebetMethods';
import SidebetStat from '../../Interfaces/SidebetStat';
import { getOverallPlace, getBowlWinner } from '../../Helper Files/HelperMethods';
import trollDataJson from '../../Data/trollData.json';

const getTrollName = (userId: string): string => {
  const entry = trollDataJson.find((t) => t['Sleeper ID'] === userId);
  return entry?.['Troll Name'] || `User ${userId.substring(0, 4)}`;
};

// =========================================================================
// TYPES
// =========================================================================

interface MoneyCalcProps {
  data: LeagueData;
}

interface SidebetWin {
  name: string;
  statDisplay: string;
}

interface BowlInfo {
  bowlName: string;
  opponentName: string;
  userScore: string;
  opponentScore: string;
  won: boolean;
}

interface MoneyRow {
  userId: string;
  teamName: string;
  place: number | undefined;
  placementMoney: number;
  sidebetMoney: number;
  sidebetWins: SidebetWin[];
  totalMoney: number;
  bowlInfo: BowlInfo | null;
}

interface TiedSidebet {
  sidebetName: string;
  tiedTeams: string[];
  amount: number;
}

// =========================================================================
// COMPONENT
// =========================================================================

const MoneyCalculator: React.FC<MoneyCalcProps> = ({ data }) => {
  const [moneyRows, setMoneyRows] = useState<MoneyRow[]>([]);
  const [tiedSidebets, setTiedSidebets] = useState<TiedSidebet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string>('place');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleRow = (userId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // Get year config
  const yearConfig = useMemo(() => {
    const entry = yearDataJson.find(
      (e: any) => e.year === Number.parseFloat(data.season)
    );
    return entry?.data?.[0] ?? null;
  }, [data.season]);

  const buyIn = yearConfig?.buy_in ?? 0;
  const sideBetBuyIn = yearConfig?.side_bet_buy_in ?? 0;
  const numPeople = data.users.length;
  const totalPool = numPeople * buyIn;

  // Placement payouts
  const placementPayouts: Record<number, number> = useMemo(() => ({
    1: totalPool * 0.50,
    2: totalPool * 0.25,
    3: totalPool * 0.15,
    4: totalPool * 0.10,
  }), [totalPool]);

  useEffect(() => {
    const calculate = async () => {
      setLoading(true);

      // ── 1. Build sidebet winners map ──
      const sidebetWinsMap = new Map<string, SidebetWin[]>(); // userId -> sidebet wins
      const tied: TiedSidebet[] = [];

      const yearSidebets = yearSidebetsData.find(
        (entry: any) => entry.year === Number.parseFloat(data.season)
      );

      if (yearSidebets) {
        for (const sidebetEntry of yearSidebets.data) {
          const sidebet: Sidebet | undefined = SidebetMethods.Sidebets().find(
            (s) => s.displayName === sidebetEntry.sidebetName
          );

          if (!sidebet) continue;

          let result: SidebetStat[] | undefined;
          try {
            const method = (SidebetMethods as any)[sidebet.methodName]?.bind(SidebetMethods);
            if (!method) continue;

            const isPlayoffOnly = sidebet.methodName === 'BossWhenItCounts';
            const includeRegularSeason = !isPlayoffOnly;
            const includePlayoffs = isPlayoffOnly;

            if (sidebet.isAsync) {
              result = await method(data, includeRegularSeason, includePlayoffs);
            } else {
              result = method(data, includeRegularSeason, includePlayoffs);
            }
          } catch (error) {
            console.error(`Error executing method ${sidebet.methodName}:`, error);
          }

          if (!result || result.length === 0) continue;

          const firstResult = result[0];
          const winnerIds: string[] = [firstResult.user?.user_id ?? ''];

          // Check for ties
          if (firstResult?.stat_number != null) {
            result.slice(1).forEach((res) => {
              if (res.stat_number != null && Math.abs(res.stat_number - firstResult.stat_number!) < 0.0001) {
                winnerIds.push(res.user?.user_id ?? '');
              }
            });
          } else if (firstResult?.stats_record) {
            result.slice(1).forEach((res) => {
              if (
                res.stats_record?.wins === firstResult.stats_record?.wins &&
                res.stats_record?.losses === firstResult.stats_record?.losses
              ) {
                winnerIds.push(res.user?.user_id ?? '');
              }
            });
          }

          if (winnerIds.length > 1) {
            // Tied — no one gets money yet
            const tiedTeams = winnerIds.map((id) => {
              const u = data.users.find((u) => u.user_id === id);
              return getTrollName(id);
            });
            tied.push({
              sidebetName: sidebet.displayName,
              tiedTeams,
              amount: sideBetBuyIn,
            });
          } else {
            // Single winner
            const winnerId = winnerIds[0];
            if (winnerId) {
              const existing = sidebetWinsMap.get(winnerId) || [];
              existing.push({
                name: sidebet.displayName,
                statDisplay: firstResult?.stats_display || 'n/a',
              });
              sidebetWinsMap.set(winnerId, existing);
            }
          }
        }
      }

      // ── 2. Compute bowl results for all users ──
      const PLACE_TO_BOWL: Record<number, string> = {
        1: 'Troll Bowl', 2: 'Troll Bowl',
        3: 'Bengal Bowl', 4: 'Bengal Bowl',
        5: 'Koozie Bowl', 6: 'Koozie Bowl',
        7: 'Toilet Bowl', 8: 'Toilet Bowl',
        9: 'Diarrhea Bowl', 10: 'Diarrhea Bowl',
        11: 'Butler Bowl', 12: 'Butler Bowl',
      };

      // Pre-compute all bowl results
      const bowlResults = new Map<string, { winner: any; loser: any; winString: string }>();
      const bowlNames = ['Troll Bowl', 'Bengal Bowl', 'Koozie Bowl', 'Toilet Bowl', 'Diarrhea Bowl', 'Butler Bowl'];
      bowlNames.forEach((bowl) => {
        const [winner, loser, winString] = getBowlWinner(bowl, data);
        bowlResults.set(bowl, { winner, loser, winString });
      });

      // ── 3. Build money rows ──
      const rows: MoneyRow[] = data.users.map((user) => {
        const userId = user.user_id;
        const teamName = getTrollName(userId);
        const place = getOverallPlace(userId, data.season);

        const placementMoney = place && place <= 4 ? (placementPayouts[place] ?? 0) : 0;
        const wins = sidebetWinsMap.get(userId) || [];
        const sidebetMoney = wins.length * sideBetBuyIn;

        // Bowl info
        let bowlInfo: BowlInfo | null = null;
        if (place != null && PLACE_TO_BOWL[place]) {
          const bowlName = PLACE_TO_BOWL[place];
          const result = bowlResults.get(bowlName);
          if (result && result.winner && result.loser) {
            const isWinner = result.winner.user_id === userId;
            const opponent = isWinner ? result.loser : result.winner;
            // Parse scores from winString: "Team A defeated Team B: 123.45 - 67.89"
            const scoreMatch = result.winString.match(/:\s*([\d.]+)\s*-\s*([\d.]+)/);
            const winnerScore = scoreMatch ? scoreMatch[1] : '?';
            const loserScore = scoreMatch ? scoreMatch[2] : '?';
            bowlInfo = {
              bowlName,
              opponentName: getTrollName(opponent?.user_id || ''),
              userScore: isWinner ? winnerScore : loserScore,
              opponentScore: isWinner ? loserScore : winnerScore,
              won: isWinner,
            };
          }
        }

        return {
          userId,
          teamName,
          place,
          placementMoney,
          sidebetMoney,
          sidebetWins: wins,
          totalMoney: placementMoney + sidebetMoney,
          bowlInfo,
        };
      });

      // Sort by place
      rows.sort((a, b) => {
        const pa = a.place ?? 999;
        const pb = b.place ?? 999;
        return pa - pb;
      });

      setMoneyRows(rows);
      setTiedSidebets(tied);
      setLoading(false);
    };

    calculate();
  }, [data, sideBetBuyIn, placementPayouts]);

  // ── SORTING ──
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'teamName' ? 'asc' : 'desc');
    }
  };

  const sortedRows = useMemo(() => {
    const sorted = [...moneyRows];
    sorted.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      switch (sortColumn) {
        case 'teamName':
          aVal = a.teamName.toLowerCase();
          bVal = b.teamName.toLowerCase();
          break;
        case 'place':
          aVal = a.place ?? 999;
          bVal = b.place ?? 999;
          break;
        case 'placementMoney':
          aVal = a.placementMoney;
          bVal = b.placementMoney;
          break;
        case 'sidebetMoney':
          aVal = a.sidebetMoney;
          bVal = b.sidebetMoney;
          break;
        case 'totalMoney':
          aVal = a.totalMoney;
          bVal = b.totalMoney;
          break;
        default:
          aVal = a.place ?? 999;
          bVal = b.place ?? 999;
      }
      if (sortDirection === 'asc') return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    });
    return sorted;
  }, [moneyRows, sortColumn, sortDirection]);

  const formatMoney = (amount: number) =>
    amount === 0 ? '-' : `$${amount.toFixed(0)}`;

  const getPlaceLabel = (place: number) => {
    switch (place) {
      case 1: return '1st';
      case 2: return '2nd';
      case 3: return '3rd';
      case 4: return '4th';
      default: return `${place}th`;
    }
  };

  if (loading) {
    return (
      <div>
        <YearNavBar data={data} />
        <div className="money-calc-container">
          <div className="money-calc-loading">Calculating payouts...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <YearNavBar data={data} />
      <div className="money-calc-container">
        <h1 className="money-calc-title">Money Calculator</h1>

        {/* Summary cards */}
        <div className="money-summary-cards">
          <div className="money-summary-card">
            <div className="money-summary-label">Buy-In</div>
            <div className="money-summary-value">${buyIn}</div>
          </div>
          <div className="money-summary-card">
            <div className="money-summary-label">Side Bet Buy-In</div>
            <div className="money-summary-value">${sideBetBuyIn}</div>
          </div>
          <div className="money-summary-card">
            <div className="money-summary-label">Total Pool</div>
            <div className="money-summary-value">${totalPool}</div>
          </div>
          <div className="money-summary-card">
            <div className="money-summary-label">Teams</div>
            <div className="money-summary-value">{numPeople}</div>
          </div>
        </div>

        {/* Main payout table */}
        <div className="money-table-section">
          <h2 className="money-section-header">Payouts</h2>
          <div className="horizontal-scroll">
            <table className="money-table">
              <thead>
                <tr>
                  <th className={`sortable ${sortColumn === 'teamName' ? `sorted-${sortDirection}` : ''}`} onClick={() => handleSort('teamName')}>Team</th>
                  <th className={`sortable ${sortColumn === 'place' ? `sorted-${sortDirection}` : ''}`} onClick={() => handleSort('place')}>Place</th>
                  <th className={`sortable ${sortColumn === 'placementMoney' ? `sorted-${sortDirection}` : ''}`} onClick={() => handleSort('placementMoney')}>Placement $</th>
                  <th className={`sortable ${sortColumn === 'sidebetMoney' ? `sorted-${sortDirection}` : ''}`} onClick={() => handleSort('sidebetMoney')}>Sidebet $</th>
                  <th className={`sortable ${sortColumn === 'totalMoney' ? `sorted-${sortDirection}` : ''}`} onClick={() => handleSort('totalMoney')}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const hasMoney = row.totalMoney > 0;
                  const isExpanded = expandedRows.has(row.userId);
                  return (
                    <React.Fragment key={row.userId}>
                      <tr
                        className={`${hasMoney ? 'money-row-highlight' : ''} money-row-clickable ${isExpanded ? 'money-row-expanded' : ''}`}
                        onClick={() => toggleRow(row.userId)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="team-name-cell">
                          {row.teamName}
                        </td>
                        <td>{row.place ?? '-'}</td>
                        <td className={row.placementMoney > 0 ? 'money-positive' : ''}>
                          {formatMoney(row.placementMoney)}
                        </td>
                        <td className={row.sidebetMoney > 0 ? 'money-positive' : ''}>
                          {formatMoney(row.sidebetMoney)}
                        </td>
                        <td className={`money-total ${hasMoney ? 'money-positive' : ''}`}>
                          {formatMoney(row.totalMoney)}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="money-detail-row">
                          <td colSpan={5}>
                            <div className="money-detail-content">
                              {/* Bowl matchup score */}
                              {row.bowlInfo && (
                                <div className={`bowl-matchup-summary ${row.bowlInfo.won ? 'bowl-won' : 'bowl-lost'}`}>
                                  <div className="bowl-matchup-label">{row.bowlInfo.bowlName}</div>
                                  <div className="bowl-matchup-score">
                                    <span className="bowl-team">{row.teamName}</span>
                                    <span className={`bowl-score ${row.bowlInfo.won ? 'money-positive' : ''}`}>{row.bowlInfo.userScore}</span>
                                    <span className="bowl-vs">-</span>
                                    <span className={`bowl-score ${!row.bowlInfo.won ? 'money-positive' : ''}`}>{row.bowlInfo.opponentScore}</span>
                                    <span className="bowl-team">{row.bowlInfo.opponentName}</span>
                                  </div>
                                </div>
                              )}
                              {/* Sidebet / placement detail table */}
                              {(row.sidebetWins.length > 0 || (row.place != null && row.place <= 4)) && (
                                <table className="money-detail-table">
                                  <thead>
                                    <tr>
                                      <th>Source</th>
                                      <th>Details</th>
                                      <th>Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.place != null && row.place <= 4 && (
                                      <tr>
                                        <td>Placement ({getPlaceLabel(row.place)})</td>
                                        <td>Finished {getPlaceLabel(row.place)} place</td>
                                        <td className="money-positive">{formatMoney(row.placementMoney)}</td>
                                      </tr>
                                    )}
                                    {row.sidebetWins.map((win, i) => (
                                      <tr key={i}>
                                        <td>{win.name}</td>
                                        <td dangerouslySetInnerHTML={{ __html: win.statDisplay }} />
                                        <td className="money-positive">{formatMoney(sideBetBuyIn)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tied sidebets section */}
        {tiedSidebets.length > 0 && (
          <div className="money-table-section tied-section">
            <h2 className="money-section-header">⚠️ Tiebreakers Needed</h2>
            <p className="tied-description">
              The following sidebets resulted in a tie. No money has been awarded until a tiebreaker is completed.
            </p>
            <div className="horizontal-scroll">
              <table className="money-table tied-table">
                <thead>
                  <tr>
                    <th>Sidebet</th>
                    <th>Tied Teams</th>
                    <th>Amount Per Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {tiedSidebets.map((t, idx) => (
                    <tr key={idx}>
                      <td>{t.sidebetName}</td>
                      <td>
                        {t.tiedTeams.map((team, ti) => (
                          <div key={ti} className="tied-team-pill">{team}</div>
                        ))}
                      </td>
                      <td className="money-positive">${t.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoneyCalculator;
