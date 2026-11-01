import React, { useMemo, useState } from 'react';
import LeagueData from '../../../Interfaces/LeagueData';
import {
  findRosterByUserId,
  isCurrentActiveWeek,
  isPlayoffWeek,
} from '../../../Helper Files/HelperMethods';
import { buildPointBreakdownRows } from './PointBreakdown';

interface PointBreakdownSliderProps {
  data: LeagueData[];
  minYears?: number;
  includeRegularSeason?: boolean;
  includePlayoffs?: boolean;
}

interface BreakdownGame {
  season: string;
  week: number;
  opponent: string;
  score: number;
  opponentScore: number;
  result: 'wins' | 'losses' | 'ties';
}

interface BreakdownRow {
  userId: string;
  teamName: string;
  yearsPlayed: number;
  totalGames: number;
  games: BreakdownGame[];
}

type SortKey = 'teamName' | 'games' | 'wins' | 'losses';

const parseScore = (
  value: string,
  fallback: number,
  minimum: number,
  maximum: number
): number => {
  if (value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
};

const PointBreakdownSlider: React.FC<PointBreakdownSliderProps> = ({
  data,
  minYears = 0,
  includeRegularSeason = true,
  includePlayoffs = false,
}) => {
  const [lowInput, setLowInput] = useState('');
  const [highInput, setHighInput] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('games');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const scoreDomain = useMemo(() => {
    let lowestScore = Infinity;
    let highestScore = 0;
    data.forEach((league) => {
      league.matchupInfo.forEach((weekInfo) => {
        if (isCurrentActiveWeek(league, weekInfo.week)) return;
        weekInfo.matchups.forEach((matchup) => {
          const score = matchup.points ?? 0;
          if (score <= 0) return;
          lowestScore = Math.min(lowestScore, score);
          highestScore = Math.max(highestScore, score);
        });
      });
    });

    return Number.isFinite(lowestScore)
      ? { minimum: lowestScore, maximum: highestScore }
      : { minimum: 0, maximum: 300 };
  }, [data]);
  const maxSliderScore = scoreDomain.maximum;
  const lowScore = parseScore(
    lowInput,
    scoreDomain.minimum,
    scoreDomain.minimum,
    maxSliderScore
  );
  const highScore = parseScore(
    highInput,
    maxSliderScore,
    scoreDomain.minimum,
    maxSliderScore
  );
  const scoreMin = Math.min(lowScore, highScore);
  const scoreMax = Math.max(lowScore, highScore);

  const baseRows = useMemo(
    () =>
      buildPointBreakdownRows(
        data,
        includeRegularSeason,
        includePlayoffs
      ).filter((row) => row.yearsPlayed >= minYears),
    [data, includePlayoffs, includeRegularSeason, minYears]
  );
  const eligibleUserIds = useMemo(
    () => new Set(baseRows.map((row) => row.userId)),
    [baseRows]
  );

  const rows = useMemo(() => {
    const rowByUserId = new Map<string, BreakdownRow>();

    data.forEach((league) => {
      league.users.forEach((user) => {
        if (!eligibleUserIds.has(user.user_id)) return;

        const roster = findRosterByUserId(user.user_id, league.rosters);
        if (!roster) return;

        let row = rowByUserId.get(user.user_id);
        if (!row) {
          const baseRow = baseRows.find(
            (candidate) => candidate.userId === user.user_id
          );
          if (!baseRow) return;
          row = {
            userId: user.user_id,
            teamName: baseRow.teamName,
            yearsPlayed: baseRow.yearsPlayed,
            totalGames: 0,
            games: [],
          };
          rowByUserId.set(user.user_id, row);
        }

        league.matchupInfo.forEach((weekInfo) => {
          if (isCurrentActiveWeek(league, weekInfo.week)) return;

          const playoff = isPlayoffWeek(league, weekInfo.week);
          if (playoff && !includePlayoffs) return;
          if (!playoff && !includeRegularSeason) return;

          const matchup = weekInfo.matchups.find(
            (weekMatchup) => weekMatchup.roster_id === roster.roster_id
          );
          if (!matchup) return;

          const opponent = weekInfo.matchups.find(
            (weekMatchup) =>
              weekMatchup.matchup_id === matchup.matchup_id &&
              weekMatchup.roster_id !== roster.roster_id
          );
          if (!opponent) return;

          const score = matchup.points ?? 0;
          if (score === 0) return;

          const opponentScore = opponent.points ?? 0;
          const result =
            score > opponentScore
              ? 'wins'
              : score < opponentScore
                ? 'losses'
                : 'ties';
          const opponentRoster = league.rosters.find(
            (leagueRoster) => leagueRoster.roster_id === opponent.roster_id
          );
          const opponentUser = league.users.find(
            (leagueUser) => leagueUser.user_id === opponentRoster?.owner_id
          );

          row!.totalGames++;
          if (score >= scoreMin && score <= scoreMax) {
            row!.games.push({
              season: league.season,
              week: weekInfo.week,
              opponent:
                opponentUser?.metadata?.team_name ||
                opponentUser?.display_name ||
                opponentRoster?.owner_id ||
                'Unknown',
              score,
              opponentScore,
              result,
            });
          }
        });

        row.teamName = user.metadata?.team_name || row.teamName;
      });
    });

    return Array.from(rowByUserId.values());
  }, [
    baseRows,
    data,
    eligibleUserIds,
    includePlayoffs,
    includeRegularSeason,
    scoreMax,
    scoreMin,
  ]);

  const sortedRows = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === 'teamName') {
        return a.teamName.localeCompare(b.teamName) * direction;
      }
      const getValue = (row: BreakdownRow) => {
        const count =
          sortKey === 'games'
            ? row.games.length
            : row.games.filter((game) => game.result === sortKey).length;
        const denominator =
          sortKey === 'games' ? row.totalGames : row.games.length;
        return denominator > 0 ? count / denominator : 0;
      };
      return (getValue(a) - getValue(b)) * direction;
    });
  }, [rows, sortDirection, sortKey]);

  const getDisplayedValue = (
    row: BreakdownRow,
    result: 'games' | 'wins' | 'losses'
  ) => {
    const count =
      result === 'games'
        ? row.games.length
        : row.games.filter((game) => game.result === result).length;
    const denominator =
      result === 'games' ? row.totalGames : row.games.length;
    const percentage =
      denominator > 0 ? ((count / denominator) * 100).toFixed(1) : '0.0';
    return `${count} (${percentage}%)`;
  };

  const selectedRow = rows.find((row) => row.userId === selectedUserId);
  const selectedGames = selectedRow
    ? [...selectedRow.games].sort(
        (a, b) =>
          Number(b.season) - Number(a.season) || a.week - b.week
      )
    : [];

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : '';

  const updateLowScore = (value: string) => {
    setLowInput(value);
  };

  const updateHighScore = (value: string) => {
    setHighInput(value);
  };

  const updateLowSlider = (value: string) => {
    setLowInput(value);
    if (Number(value) > highScore) setHighInput(value);
  };

  const updateHighSlider = (value: string) => {
    setHighInput(value);
    if (Number(value) < lowScore) setLowInput(value);
  };

  if (rows.length === 0) {
    return (
      <div className="regular-season-points">
        <div className="notImplementedMessage">
          No point breakdown data available.
        </div>
      </div>
    );
  }

  return (
    <div className="regular-season-points">
      <div className="point-breakdown-slider-controls">
        <label>
          Bottom score
          <input
            type="number"
            min={scoreDomain.minimum}
            max={maxSliderScore}
            step="0.01"
            value={lowInput || lowScore.toFixed(2)}
            onChange={(event) => updateLowScore(event.target.value)}
            onBlur={() => {
              if (lowScore > highScore) setHighInput(lowScore.toString());
            }}
          />
        </label>
        <div className="point-breakdown-slider" aria-label="Score range">
          <div className="point-breakdown-slider-track" />
          <input
            type="range"
            min={scoreDomain.minimum}
            max={maxSliderScore}
            step="0.01"
            aria-label="Bottom score"
            value={scoreMin}
            onChange={(event) => updateLowSlider(event.target.value)}
          />
          <input
            type="range"
            min={scoreDomain.minimum}
            max={maxSliderScore}
            step="0.01"
            aria-label="Top score"
            value={scoreMax}
            onChange={(event) => updateHighSlider(event.target.value)}
          />
        </div>
        <label>
          Top score
          <input
            type="number"
            min={scoreDomain.minimum}
            max={maxSliderScore}
            step="0.01"
            value={highInput || highScore.toFixed(2)}
            onChange={(event) => updateHighScore(event.target.value)}
            onBlur={() => {
              if (highScore < lowScore) setLowInput(highScore.toString());
            }}
          />
        </label>
      </div>

      <div className="point-breakdown-layout point-breakdown-slider-layout">
        <div className="point-breakdown-main point-breakdown-table-scroll">
          <table className="leagueStatsTable regular-season-table point-breakdown-slider-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('teamName')}>
                  Team (Years){sortIndicator('teamName')}
                </th>
                <th
                  className="sortable"
                  onClick={() => toggleSort('games')}
                >
                  {scoreMin.toFixed(2)}-{scoreMax.toFixed(2)}
                  {sortIndicator('games')}
                </th>
                <th className="sortable" onClick={() => toggleSort('wins')}>
                  Wins{sortIndicator('wins')}
                </th>
                <th className="sortable" onClick={() => toggleSort('losses')}>
                  Losses{sortIndicator('losses')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => {
                const isSelected = selectedUserId === row.userId;
                return (
                  <tr
                    key={row.userId}
                    className={`${index % 2 === 0 ? 'even-row' : 'odd-row'}${isSelected ? ' point-breakdown-selected-cell' : ''}`}
                  >
                    <td>{row.teamName} ({row.yearsPlayed})</td>
                    <td>
                      <button
                        type="button"
                        className="point-breakdown-cell-button"
                        aria-label={`${row.teamName}, ${scoreMin.toFixed(2)} to ${scoreMax.toFixed(2)} points inclusive, ${row.games.length} games`}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedUserId(row.userId)}
                      >
                        {getDisplayedValue(row, 'games')}
                      </button>
                    </td>
                    <td>{getDisplayedValue(row, 'wins')}</td>
                    <td>{getDisplayedValue(row, 'losses')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="point-breakdown-details">
          <h3>{selectedRow ? `${selectedRow.teamName} — Game Details` : 'Game Details'}</h3>
          <p>
            {selectedRow
              ? `${selectedGames.length} game${selectedGames.length === 1 ? '' : 's'} from ${scoreMin.toFixed(2)} to ${scoreMax.toFixed(2)} points, inclusive, out of ${selectedRow.totalGames} games`
              : 'Select a value in the table to see the weeks.'}
          </p>
          {selectedRow && (
            <div className="point-breakdown-details-scroll">
              <table className="leagueStatsTable point-breakdown-detail-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Week</th>
                    <th>Opponent</th>
                    <th>Score</th>
                    <th>Opp Score</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGames.length > 0 ? (
                    selectedGames.map((game, index) => (
                      <tr key={`${game.season}-${game.week}-${index}`}>
                        <td>{game.season}</td>
                        <td>{game.week}</td>
                        <td>{game.opponent}</td>
                        <td>{game.score.toFixed(2)}</td>
                        <td>{game.opponentScore.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>No games match this score range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default PointBreakdownSlider;
