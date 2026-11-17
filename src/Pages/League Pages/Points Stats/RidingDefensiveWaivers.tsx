import React, { useEffect, useMemo, useState } from 'react';
import LeagueData from '../../../Interfaces/LeagueData';
import DraftPick from '../../../Interfaces/DraftPick';
import { getPlayerName, isCurrentActiveWeek } from '../../../Helper Files/HelperMethods';
import { isCurrentIncompleteLeagueSeason } from '../../../Helper Files/PointCalculations';

interface DefensiveStart {
  week: number;
  defense: string;
  points: number;
}

interface DefensiveWaiverRow {
  userId: string;
  teamName: string;
  yearsPlayed: number;
  year: number;
  starts: DefensiveStart[];
  averagePoints: number;
  defensesUsed: number;
  firstDefense?: DraftedDefense;
}

interface DraftedDefense {
  playerId: string;
  round: number;
  pickNo: number;
  defenseDraftNumber: number;
}

interface RidingDefensiveWaiversProps {
  data: LeagueData[];
  minYears?: number;
}

type SortKey =
  | 'teamName'
  | 'year'
  | 'averagePoints'
  | 'defensesUsed'
  | 'firstDefense'
  | 'draftPick'
  | 'defenseDraftNumber';
type SortDirection = 'ascending' | 'descending';

const DRAFT_LEAGUE_ID_OVERRIDES: Record<number, string> = {
  2020: '608357369793056768',
};

const getDraftInfoKey = (year: number, userId: string): string => `${year}:${userId}`;

const getDefenseDisplayName = (playerId: string): string => {
  const playerName = getPlayerName(playerId);
  return `${playerName === 'Unknown' ? playerId : playerName} D/ST`;
};

const fetchFirstDefensesByYear = async (data: LeagueData[]): Promise<Map<string, DraftedDefense>> => {
  const completedSeasons = data.filter((league) => !isCurrentIncompleteLeagueSeason(league));
  const results = await Promise.all(completedSeasons.map(async (league) => {
    const year = Number(league.season);
    let draftId = league.draft_id;

    const draftLeagueId = DRAFT_LEAGUE_ID_OVERRIDES[year];
    if (draftLeagueId) {
      const leagueResponse = await fetch(`https://api.sleeper.app/v1/league/${draftLeagueId}`);
      if (!leagueResponse.ok) {
        throw new Error(`Could not load ${year} draft league (HTTP ${leagueResponse.status}).`);
      }

      const draftLeague: { draft_id?: string } = await leagueResponse.json();
      draftId = draftLeague.draft_id ?? '';
      if (!draftId) {
        throw new Error(`The ${year} draft league did not include a draft ID.`);
      }
    }

    if (!draftId) return { league, picks: [] as DraftPick[] };

    const response = await fetch(`https://api.sleeper.app/v1/draft/${draftId}/picks`);
    if (!response.ok) {
      throw new Error(`Could not load ${league.season} draft picks (HTTP ${response.status}).`);
    }

    const picks: DraftPick[] = await response.json();
    return { league, picks };
  }));
  const firstDefenses = new Map<string, DraftedDefense>();

  results.forEach(({ league, picks }) => {
    const defensePicks = picks
      .filter((pick) => pick.metadata?.position === 'DEF')
      .sort((a, b) => a.pick_no - b.pick_no);
    const defenseDraftNumbers = new Map(
      defensePicks.map((pick, index) => [pick.pick_no, index + 1]),
    );
    const firstPickByUser = new Map<string, DraftPick>();

    defensePicks.forEach((pick) => {
      if (!firstPickByUser.has(pick.picked_by)) firstPickByUser.set(pick.picked_by, pick);
    });

    firstPickByUser.forEach((pick, userId) => {
      firstDefenses.set(getDraftInfoKey(Number(league.season), userId), {
        playerId: pick.player_id,
        round: pick.round,
        pickNo: pick.pick_no,
        defenseDraftNumber: defenseDraftNumbers.get(pick.pick_no) ?? 0,
      });
    });
  });

  return firstDefenses;
};

const buildYearsPlayedMap = (data: LeagueData[]): Map<string, number> => {
  const yearsPlayed = new Map<string, number>();
  data.filter((league) => !isCurrentIncompleteLeagueSeason(league)).forEach((league) => {
    league.users.forEach((user) => {
      yearsPlayed.set(user.user_id, (yearsPlayed.get(user.user_id) ?? 0) + 1);
    });
  });
  return yearsPlayed;
};

const buildDefensiveWaiverRows = (
  data: LeagueData[],
  firstDefenses: Map<string, DraftedDefense>,
): DefensiveWaiverRow[] => {
  const completedSeasons = data.filter((league) => !isCurrentIncompleteLeagueSeason(league));
  const yearsPlayed = buildYearsPlayedMap(completedSeasons);
  const rows: DefensiveWaiverRow[] = [];

  completedSeasons.forEach((league) => {
    const defensiveSlots = league.roster_positions.reduce<number[]>((slots, position, index) => {
      if (position === 'DEF') slots.push(index);
      return slots;
    }, []);
    if (defensiveSlots.length === 0) return;

    league.users.forEach((user) => {
      const roster = league.rosters.find((item) => item.owner_id === user.user_id);
      if (!roster) return;

      const starts: DefensiveStart[] = [];
      league.matchupInfo.forEach((weekInfo) => {
        if (isCurrentActiveWeek(league, weekInfo.week)) return;

        const matchup = weekInfo.matchups.find((item) => item.roster_id === roster.roster_id);
        if (!matchup) return;

        defensiveSlots.forEach((slot) => {
          const defense = matchup.starters[slot];
          if (!defense || defense === '0') return;

          starts.push({
            week: weekInfo.week,
            defense,
            points: matchup.starters_points[slot] ?? matchup.players_points[defense] ?? 0,
          });
        });
      });

      if (starts.length === 0) return;

      const totalPoints = starts.reduce((total, start) => total + start.points, 0);
      rows.push({
        userId: user.user_id,
        teamName: user.metadata?.team_name || `User ${user.user_id.substring(0, 4)}`,
        yearsPlayed: yearsPlayed.get(user.user_id) ?? 0,
        year: Number.parseInt(league.season, 10),
        starts,
        averagePoints: totalPoints / starts.length,
        defensesUsed: new Set(starts.map((start) => start.defense)).size,
        firstDefense: firstDefenses.get(getDraftInfoKey(Number(league.season), user.user_id)),
      });
    });
  });

  return rows;
};

const RidingDefensiveWaivers: React.FC<RidingDefensiveWaiversProps> = ({ data, minYears = 0 }) => {
  const [minimumDefenses, setMinimumDefenses] = useState(8);
  const [selectedRow, setSelectedRow] = useState<DefensiveWaiverRow | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('averagePoints');
  const [sortDirection, setSortDirection] = useState<SortDirection>('descending');
  const [firstDefenses, setFirstDefenses] = useState<Map<string, DraftedDefense>>(() => new Map());
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isDraftLoading, setIsDraftLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsDraftLoading(true);
    setDraftError(null);
    setFirstDefenses(new Map());

    fetchFirstDefensesByYear(data)
      .then((draftInfo) => {
        if (!cancelled) setFirstDefenses(draftInfo);
      })
      .catch((error: unknown) => {
        console.error('Error loading draft details for Riding Defensive Waivers:', error);
        if (!cancelled) {
          setDraftError(error instanceof Error ? error.message : 'Could not load draft details.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsDraftLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data]);

  const allRows = useMemo(
    () => buildDefensiveWaiverRows(data, firstDefenses),
    [data, firstDefenses],
  );
  const maxDefenses = allRows.reduce((max, row) => Math.max(max, row.defensesUsed), 0);
  const sliderMax = Math.max(1, maxDefenses);
  const selectedMinimumDefenses = Math.min(minimumDefenses, sliderMax);

  const rows = useMemo(
    () => {
      const direction = sortDirection === 'ascending' ? 1 : -1;
      return allRows
        .filter((row) => row.yearsPlayed >= minYears && row.defensesUsed >= selectedMinimumDefenses)
        .sort((a, b) => {
          if (sortKey === 'teamName') {
            return a.teamName.localeCompare(b.teamName) * direction
              || (a.yearsPlayed - b.yearsPlayed) * direction;
          }
          if (sortKey === 'firstDefense') {
            const aName = a.firstDefense ? getDefenseDisplayName(a.firstDefense.playerId) : '';
            const bName = b.firstDefense ? getDefenseDisplayName(b.firstDefense.playerId) : '';
            return aName.localeCompare(bName) * direction;
          }
          if (sortKey === 'draftPick') {
            return ((a.firstDefense?.pickNo ?? Number.MAX_SAFE_INTEGER)
              - (b.firstDefense?.pickNo ?? Number.MAX_SAFE_INTEGER)) * direction;
          }
          if (sortKey === 'defenseDraftNumber') {
            return ((a.firstDefense?.defenseDraftNumber ?? Number.MAX_SAFE_INTEGER)
              - (b.firstDefense?.defenseDraftNumber ?? Number.MAX_SAFE_INTEGER)) * direction;
          }
          return (a[sortKey] - b[sortKey]) * direction;
        });
    },
    [allRows, minYears, selectedMinimumDefenses, sortDirection, sortKey],
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'descending' ? 'ascending' : 'descending');
      return;
    }
    setSortKey(key);
    setSortDirection(key === 'teamName' ? 'ascending' : 'descending');
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDirection === 'ascending' ? ' ▲' : ' ▼';
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!selectedRow || !rows.some(
      (row) => row.userId === selectedRow.userId && row.year === selectedRow.year,
    )) {
      setSelectedRow(rows[0] ?? null);
    }
  }, [rows, selectedRow]);

  return (
    <div className="regular-season-points">
      <div className="pointsFilter filter-style">
        <label htmlFor="minimum-distinct-defenses">
          Minimum distinct defenses: {selectedMinimumDefenses}
        </label>
        <input
          id="minimum-distinct-defenses"
          type="range"
          min={1}
          max={sliderMax}
          value={selectedMinimumDefenses}
          onChange={(event) => setMinimumDefenses(Number(event.target.value))}
          aria-label="Minimum distinct defenses"
        />
      </div>

      {rows.length === 0 ? (
        <div className="notImplementedMessage">
          No seasons found with at least {selectedMinimumDefenses} distinct defenses.
        </div>
      ) : (
        <>
          {isMobile && showMobileDetail && (
            <button
              onClick={() => setShowMobileDetail(false)}
              className="mobile-back-button"
            >
              ← Back to List
            </button>
          )}
          <div className="two-pane-layout">
            <div className={`main-table-pane ${isMobile && showMobileDetail ? 'mobile-hidden' : ''}`}>
              <table className="leagueStatsTable regular-season-table selectable-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('teamName')} className="sortable">
                      Team (Years){getSortIndicator('teamName')}
                    </th>
                    <th onClick={() => handleSort('year')} className="sortable">
                      Year{getSortIndicator('year')}
                    </th>
                    <th onClick={() => handleSort('averagePoints')} className="sortable">
                      Avg. Pts By Def{getSortIndicator('averagePoints')}
                    </th>
                    <th onClick={() => handleSort('defensesUsed')} className="sortable">
                      Number of Defenses{getSortIndicator('defensesUsed')}
                    </th>
                    <th onClick={() => handleSort('firstDefense')} className="sortable">
                      First Defense Drafted{getSortIndicator('firstDefense')}
                    </th>
                    <th onClick={() => handleSort('draftPick')} className="sortable">
                      Draft Pick (Round / Overall){getSortIndicator('draftPick')}
                    </th>
                    <th onClick={() => handleSort('defenseDraftNumber')} className="sortable">
                      DEF Draft #{getSortIndicator('defenseDraftNumber')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={`${row.userId}-${row.year}`}
                      className={`${selectedRow?.userId === row.userId && selectedRow.year === row.year
                        ? 'active selected-row'
                        : ''} ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                      onClick={() => {
                        setSelectedRow(row);
                        if (isMobile) setShowMobileDetail(true);
                      }}
                    >
                      <td className="team-name-cell">{row.teamName} ({row.yearsPlayed})</td>
                      <td>{row.year}</td>
                      <td>{row.averagePoints.toFixed(2)}</td>
                      <td>{row.defensesUsed}</td>
                      <td>
                        {row.firstDefense
                          ? getDefenseDisplayName(row.firstDefense.playerId)
                          : isDraftLoading ? 'Loading…' : '—'}
                      </td>
                      <td>
                        {row.firstDefense
                          ? `Round ${row.firstDefense.round}, Pick ${row.firstDefense.pickNo}`
                          : isDraftLoading ? 'Loading…' : '—'}
                      </td>
                      <td>
                        {row.firstDefense
                          ? row.firstDefense.defenseDraftNumber
                          : isDraftLoading ? 'Loading…' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`detail-pane ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
              {selectedRow && (
                <table className="leagueStatsTable detail-table">
                  <thead>
                    <tr>
                      <th>Week</th>
                      <th>Defense</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRow.starts.map((start, index) => {
                      const defenseName = getPlayerName(start.defense);
                      return (
                        <tr key={`${start.week}-${start.defense}-${index}`}>
                          <td>{start.week}</td>
                          <td>{defenseName === 'Unknown' ? `${start.defense} D/ST` : defenseName}</td>
                          <td>{start.points.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          {draftError && (
            <div className="notImplementedMessage" role="alert">
              Draft details unavailable: {draftError}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RidingDefensiveWaivers;
