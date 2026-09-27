import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import '../../Stylesheets/Begin Year Tools Stylesheets/PostDraftRankings.css';
import LeagueData from '../../Interfaces/LeagueData';
import { getPlayerName } from '../../Helper Files/HelperMethods';
import { getLeagueData } from '../../SleeperApiMethods';
import trollData from '../../Data/trollData.json';
import playerData from '../../Data/players.json';

interface RosterSelections {
  [rosterId: number]: {
    starters: string[];
    bench: string[];
  };
}

interface VoteSelections {
  [ownerId: string]: {
    best: string;
    worst: string;
  };
}

const getTrollName = (ownerId: string, league: LeagueData) =>
  trollData.find((troll) => troll['Sleeper ID'] === ownerId)?.['Troll Name'] ??
  league.users.find((user) => user.user_id === ownerId)?.display_name ??
  'Unknown Troll';

const getTrollNickname = (ownerId: string, league: LeagueData) =>
  trollData.find((troll) => troll['Sleeper ID'] === ownerId)?.Nickname ??
  getTrollName(ownerId, league);

const getPositionLabel = (position: string) => {
  if (position === 'FLEX') return 'FL';
  if (position === 'DEF') return 'D';
  return position;
};

const getPostDraftPlayerName = (playerId: string) => {
  const player = (playerData as unknown as Record<string, { team?: string | null }>)[playerId];
  const isClevelandPlayer = playerId === 'CLE' || player?.team === 'CLE';
  return `${getPlayerName(playerId)}${isClevelandPlayer ? ' 💩' : ''}`;
};

const PostDraftRankings: React.FC = () => {
  const [leagueId, setLeagueId] = useState('');
  const [league, setLeague] = useState<LeagueData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [rosterSelections, setRosterSelections] = useState<RosterSelections>({});
  const [selectedStarters, setSelectedStarters] = useState<Record<number, string | null>>({});
  const [votes, setVotes] = useState<VoteSelections>({});
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    if (!league) {
      setRosterSelections({});
      return;
    }

    setRosterSelections(
      league.rosters.reduce<RosterSelections>((selections, roster) => {
        selections[roster.roster_id] = {
          starters: roster.starters,
          bench: roster.players.filter((playerId) => !roster.starters.includes(playerId)),
        };
        return selections;
      }, {})
    );
  }, [league]);

  const loadLeague = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submittedLeagueId = leagueId.trim();
    if (!submittedLeagueId) return;

    setIsLoading(true);
    setLoadError('');
    setLeague(null);
    setSelectedStarters({});
    setVotes({});
    setIsExportOpen(false);

    try {
      const leagueData = await getLeagueData(submittedLeagueId);
      if (!leagueData[0]) {
        throw new Error('No league data was returned.');
      }
      setLeague(leagueData[0]);
    } catch (error) {
      console.error('Error fetching post-draft league data:', error);
      setLoadError('Unable to load that league. Check the league ID and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectStarter = (rosterId: number, playerId: string) => {
    setSelectedStarters((currentSelections) => ({
      ...currentSelections,
      [rosterId]: currentSelections[rosterId] === playerId ? null : playerId,
    }));
  };

  const swapWithStarter = (rosterId: number, benchPlayerId: string) => {
    setRosterSelections((currentSelections) => {
      const selection = currentSelections[rosterId];
      const starterPlayerId = selectedStarters[rosterId];
      if (!selection || !starterPlayerId) {
        return currentSelections;
      }

      const starterIndex = selection.starters.indexOf(starterPlayerId);
      const benchIndex = selection.bench.indexOf(benchPlayerId);
      if (starterIndex === -1 || benchIndex === -1) {
        return currentSelections;
      }

      return {
        ...currentSelections,
        [rosterId]: {
          starters: selection.starters.map((id, index) => index === starterIndex ? benchPlayerId : id),
          bench: selection.bench.map((id, index) => index === benchIndex ? starterPlayerId : id),
        },
      };
    });
    setSelectedStarters((currentSelections) => ({ ...currentSelections, [rosterId]: null }));
  };

  const updateVote = (ownerId: string, voteType: 'best' | 'worst', value: string) => {
    setVotes((currentVotes) => ({
      ...currentVotes,
      [ownerId]: {
        best: currentVotes[ownerId]?.best ?? '',
        worst: currentVotes[ownerId]?.worst ?? '',
        [voteType]: value,
      },
    }));
  };

  if (!league) {
    return (
      <div className="begin-year-tools-page post-draft-rankings-page">
        <form className="post-draft-league-form" onSubmit={loadLeague}>
          <label htmlFor="post-draft-league-id">League ID</label>
          <input
            id="post-draft-league-id"
            value={leagueId}
            onChange={(event) => setLeagueId(event.target.value)}
            placeholder="Enter league ID"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !leagueId.trim()}>
            {isLoading ? 'Loading...' : 'Load rosters'}
          </button>
        </form>
        {isLoading && <p className="post-draft-status">Loading roster data...</p>}
        {loadError && <p className="post-draft-error" role="alert">{loadError}</p>}
      </div>
    );
  }

  const sortedRosters = [...league.rosters].sort((first, second) =>
    getTrollName(first.owner_id, league).localeCompare(getTrollName(second.owner_id, league))
  );
  const maxRosterRows = Math.max(...sortedRosters.map((roster) => roster.players.length), 0);
  const exportRows = sortedRosters.map((roster) => ({
    ownerId: roster.owner_id,
    trollName: getTrollName(roster.owner_id, league),
    bestTeamVotes: votes[roster.owner_id]?.best ?? '',
    worstTeamVotes: votes[roster.owner_id]?.worst ?? '',
  }));

  return (
    <div className="begin-year-tools-page post-draft-rankings-page">
      <form className="post-draft-league-form" onSubmit={loadLeague}>
        <label htmlFor="post-draft-league-id">League ID</label>
        <input
          id="post-draft-league-id"
          value={leagueId}
          onChange={(event) => setLeagueId(event.target.value)}
          placeholder="Enter league ID"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !leagueId.trim()}>
          {isLoading ? 'Loading...' : 'Load rosters'}
        </button>
      </form>
      {loadError && <p className="post-draft-error" role="alert">{loadError}</p>}
      <div className="post-draft-rankings-header">
        <button className="post-draft-export-button" onClick={() => setIsExportOpen(true)}>Export votes</button>
      </div>
      <div className="post-draft-rankings-grid">
        {sortedRosters.map((roster) => {
          const selection = rosterSelections[roster.roster_id];
          const trollNickname = getTrollNickname(roster.owner_id, league);
          return (
            <section className="post-draft-team" key={roster.roster_id}>
              <h4>{trollNickname}</h4>
              <table>
                <tbody>
                  <tr>
                    <td>
                      <ul>
                        <li className="post-draft-section-label">Starters</li>
                        {selection?.starters.map((playerId, index) => (
                          <li key={playerId}>
                            <button
                              className={selectedStarters[roster.roster_id] === playerId ? 'post-draft-selected-player' : ''}
                              aria-label={`Select ${getPostDraftPlayerName(playerId)} to swap with a bench player`}
                              aria-pressed={selectedStarters[roster.roster_id] === playerId}
                              tabIndex={-1}
                              onClick={() => selectStarter(roster.roster_id, playerId)}
                            >{getPositionLabel(league.roster_positions[index])}</button>
                            <span>{getPostDraftPlayerName(playerId)}</span>
                          </li>
                        ))}
                        <li className="post-draft-section-label">Bench</li>
                        {selection?.bench.map((playerId) => (
                          <li key={playerId}>
                            <button
                              aria-label={`Swap ${getPostDraftPlayerName(playerId)} with the selected starter`}
                              tabIndex={-1}
                              onClick={() => swapWithStarter(roster.roster_id, playerId)}
                            >B</button>
                            <span>{getPostDraftPlayerName(playerId)}</span>
                          </li>
                        ))}
                        {Array.from({
                          length: Math.max(maxRosterRows - (selection?.starters.length ?? 0) - (selection?.bench.length ?? 0), 0),
                        }).map((_, index) => (
                          <li className="post-draft-blank-row" key={`blank-${index}`} aria-hidden="true" />
                        ))}
                      </ul>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="post-draft-votes">
                <label>B<input aria-label={`${trollNickname} best team votes`} value={votes[roster.owner_id]?.best ?? ''} onChange={(event) => updateVote(roster.owner_id, 'best', event.target.value)} /></label>
                <label>W<input aria-label={`${trollNickname} worst team votes`} value={votes[roster.owner_id]?.worst ?? ''} onChange={(event) => updateVote(roster.owner_id, 'worst', event.target.value)} /></label>
              </div>
            </section>
          );
        })}
      </div>
      {isExportOpen &&
        createPortal(
          <div className="post-draft-export-overlay" role="presentation" onMouseDown={() => setIsExportOpen(false)}>
            <section
              className="post-draft-export-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="post-draft-export-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="post-draft-export-modal-header">
                <h2 id="post-draft-export-title">Vote Export Preview</h2>
                <button type="button" onClick={() => setIsExportOpen(false)}>Close</button>
              </div>
              <div className="post-draft-export-table-scroll">
                <table>
                  <thead>
                    <tr><th>Troll Name</th><th>Best Team Votes</th><th>Worst Team Votes</th></tr>
                  </thead>
                  <tbody>
                    {exportRows.map((row) => (
                      <tr key={row.ownerId}>
                        <td>{row.trollName}</td>
                        <td>{row.bestTeamVotes}</td>
                        <td>{row.worstTeamVotes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>,
          document.body
        )}
    </div>
  );
};

export default PostDraftRankings;