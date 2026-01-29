import React, { useMemo } from 'react';
import { OtherComponentProps } from '../../../Interfaces/OtherStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SidebetMethods from '../../../Helper Files/SidebetMethods';

const TopVikingSeasons: React.FC<OtherComponentProps & { minYears?: number }> = ({ data, minYears = 0 }) => {
  const yearStats = useMemo(() => {
    const allYearStats: Array<{
      year: number;
      teamName: string;
      score: number;
      userId: string;
    }> = [];

    data.forEach((league) => {
      const stats = SidebetMethods.Viking(league, true, false);
      
      stats.forEach((stat) => {
        if (stat.user && stat.stat_number !== undefined) {
          allYearStats.push({
            year: Number(league.season),
            teamName: stat.user.metadata?.team_name || 'Unknown',
            score: stat.stat_number,
            userId: stat.user.user_id,
          });
        }
      });
    });

    return allYearStats.sort((a, b) => b.score - a.score);
  }, [data]);

  const yearsPlayedMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((league) => {
      league.users?.forEach((u) => {
        map.set(u.user_id, (map.get(u.user_id) ?? 0) + 1);
      });
    });
    return map;
  }, [data]);

  const filteredStats = useMemo(() => {
    return yearStats.filter((stat) => {
      const yearsPlayed = yearsPlayedMap.get(stat.userId) ?? 0;
      return yearsPlayed >= minYears;
    });
  }, [yearStats, yearsPlayedMap, minYears]);

  if (!data || data.length === 0) {
    return <div className="notImplementedMessage">No league data loaded.</div>;
  }

  return (
    <div className="regular-season-records">
      <table className="leagueStatsTable compact-table">
        <thead>
          <tr>
            <th>Year</th>
            <th>Team</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {filteredStats.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>
                No data available
              </td>
            </tr>
          ) : (
            filteredStats.map((stat, idx) => (
              <tr key={`${stat.year}-${stat.userId}-${idx}`} className={idx % 2 === 0 ? 'even-row' : 'odd-row'}>
                <td>{stat.year}</td>
                <td className="team-name-cell">{stat.teamName}</td>
                <td>{stat.score.toFixed(0)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TopVikingSeasons;
