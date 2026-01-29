import React, { useMemo } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SidebetMethods from '../../../Helper Files/SidebetMethods';

const Juggernaut: React.FC<RecordComponentProps & { minYears?: number }> = ({ data, minYears = 0 }) => {
  const yearStats = useMemo(() => {
    const allYearStats: Array<{
      year: number;
      teamName: string;
      points: number;
      week: number;
      opponent: string;
      userId: string;
    }> = [];

    data.forEach((league) => {
      const stats = SidebetMethods.Juggernaut(league, true, false);
      
      stats.forEach((stat) => {
        if (stat.user && stat.stat_number !== undefined) {
          allYearStats.push({
            year: Number(league.season),
            teamName: stat.user.metadata?.team_name || 'Unknown',
            points: stat.stat_number,
            week: 0, // Will be parsed from stats_display
            opponent: '',
            userId: stat.user.user_id,
          });
        }
      });
    });

    return allYearStats.sort((a, b) => b.points - a.points);
  }, [data]);

  // Build years played map for filtering
  const yearsPlayedMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((league) => {
      league.users?.forEach((u) => {
        map.set(u.user_id, (map.get(u.user_id) ?? 0) + 1);
      });
    });
    return map;
  }, [data]);

  // Filter by minYears
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
      <table className="leagueStatsTable">
        <thead>
          <tr>
            <th>Year</th>
            <th>Team</th>
            <th>Points</th>
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
                <td>{stat.points.toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Juggernaut;
