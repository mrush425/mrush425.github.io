import React, { useMemo, useState } from 'react';
import { OtherComponentProps } from '../../../Interfaces/OtherStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SidebetMethods from '../../../Helper Files/SidebetMethods';

const TopVikingSeasons: React.FC<OtherComponentProps & { minYears?: number }> = ({ data, minYears = 0 }) => {
  const [sortColumn, setSortColumn] = useState<string>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

    return allYearStats;
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

  const sortedStats = useMemo(() => {
    const sorted = [...filteredStats];
    sorted.sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';

      switch (sortColumn) {
        case 'year':
          aValue = a.year;
          bValue = b.year;
          break;
        case 'teamName':
          aValue = a.teamName.toLowerCase();
          bValue = b.teamName.toLowerCase();
          break;
        case 'score':
          aValue = a.score;
          bValue = b.score;
          break;
        default:
          aValue = a.score;
          bValue = b.score;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    return sorted;
  }, [filteredStats, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'score' || column === 'year' ? 'desc' : 'asc');
    }
  };

  if (!data || data.length === 0) {
    return <div className="notImplementedMessage">No league data loaded.</div>;
  }

  return (
    <div className="regular-season-records">
      <table className="leagueStatsTable compact-table">
        <thead>
          <tr>
            <th 
              className={`sortable ${sortColumn === 'year' ? `sorted-${sortDirection}` : ''}`}
              onClick={() => handleSort('year')}
            >
              Year
            </th>
            <th 
              className={`sortable ${sortColumn === 'teamName' ? `sorted-${sortDirection}` : ''}`}
              onClick={() => handleSort('teamName')}
            >
              Team
            </th>
            <th 
              className={`sortable ${sortColumn === 'score' ? `sorted-${sortDirection}` : ''}`}
              onClick={() => handleSort('score')}
            >
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedStats.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>
                No data available
              </td>
            </tr>
          ) : (
            sortedStats.map((stat, idx) => (
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
