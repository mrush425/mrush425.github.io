import React, { useMemo } from 'react';
import '../../Stylesheets/League Stylesheets/LeagueHome.css';
import LeagueProps from './LeagueProps';
import LeagueNavBar from '../../Navigation/LeagueNavBar';
import yearTrollData from '../../Data/yearTrollData.json';
import { getUserSeasonPlace } from '../../Helper Files/HelperMethods';
import { getUserLongestStreak } from '../../Helper Files/StreakMethods';

interface WeekScore {
  points: number;
  teamName: string;
  userId: string;
  year: string;
  week: number;
}

interface LeagueWeek {
  avgPoints: number;
  year: string;
  week: number;
}

interface HeadToHead {
  team1Id: string;
  team1Name: string;
  team2Id: string;
  team2Name: string;
  team1Wins: number;
  team2Wins: number;
  team1Points: number;
  team2Points: number;
  totalGames: number;
  winPctDiff: number;
  pointsDiff: number;
}

const LeagueHome: React.FC<LeagueProps> = ({ data }) => {
  // Sort data newest first for current champion/butler
  const sortedData = useMemo(() => 
    [...data].sort((a, b) => parseInt(b.season) - parseInt(a.season)), 
    [data]
  );
  
  // Get most recent completed season
  const currentYear = new Date().getFullYear().toString();
  const mostRecentCompletedSeason = useMemo(() => 
    sortedData.find(d => d.season !== currentYear) || sortedData[0],
    [sortedData, currentYear]
  );

  // Get champion and butler from most recent completed year
  const { champion, butler } = useMemo(() => {
    const year = mostRecentCompletedSeason?.season;
    const yearTroll = (yearTrollData as any[]).find((yd: any) => yd.year === Number(year));
    
    if (!yearTroll) return { champion: null, butler: null };
    
    const championData = yearTroll.data.find((pd: any) => pd.place === 1);
    const butlerData = yearTroll.data.find((pd: any) => pd.place === 12);
    
    return {
      champion: championData ? {
        name: championData.player_name,
        year: year,
        sleeperId: championData.sleeper_id
      } : null,
      butler: butlerData ? {
        name: butlerData.player_name,
        year: year,
        sleeperId: butlerData.sleeper_id
      } : null
    };
  }, [mostRecentCompletedSeason]);

  // Try to load images
  const safeImage = (path: string) => {
    try {
      return require(`../Hall of Fame Pages/${path}`);
    } catch {
      return null;
    }
  };

  const championImage = champion?.year ? safeImage(`Champions/${champion.year}.jpg`) : null;
  const butlerImage = butler?.year ? safeImage(`Butlers/${butler.year}.jpg`) : null;

  // Calculate most and least points in a single week (with bye week logic)
  const { highestWeek, lowestWeek } = useMemo((): { highestWeek: WeekScore | null; lowestWeek: WeekScore | null } => {
    const completedSeasons = data.filter(d => d.season !== currentYear);
    let highest: WeekScore | null = null;
    let lowest: WeekScore | null = null;

    completedSeasons.forEach((league) => {
      if (!league.matchupInfo) return;
      
      const playoffStartWeek = league.settings.playoff_week_start || Infinity;

      league.matchupInfo.forEach((weekInfo) => {
        const isPlayoff = weekInfo.week >= playoffStartWeek;
        
        weekInfo.matchups.forEach((matchup) => {
          const roster = league.rosters.find(r => r.roster_id === matchup.roster_id);
          const user = league.users.find(u => u.user_id === roster?.owner_id);
          if (!roster || !user) return;

          // Check for bye week in playoffs
          if (isPlayoff && weekInfo.week === playoffStartWeek) {
            const seasonPlace = getUserSeasonPlace(user.user_id, league);
            if ([1, 2, 7, 8].includes(seasonPlace)) return; // Skip bye weeks
          }

          // Make sure they actually played (have an opponent)
          const hasOpponent = weekInfo.matchups.some(
            m => m.matchup_id === matchup.matchup_id && m.roster_id !== matchup.roster_id
          );
          if (!hasOpponent) return;

          const points = matchup.points || 0;
          if (points === 0) return; // Skip weeks with no points

          const teamName = user.metadata?.team_name || user.display_name || 'Unknown';

          if (!highest || points > highest.points) {
            highest = { points, teamName, userId: user.user_id, year: league.season, week: weekInfo.week };
          }
          if (!lowest || points < lowest.points) {
            lowest = { points, teamName, userId: user.user_id, year: league.season, week: weekInfo.week };
          }
        });
      });
    });

    return { highestWeek: highest, lowestWeek: lowest };
  }, [data, currentYear]);

  // Calculate best and worst league week (regular season only, by average)
  const { bestLeagueWeek, worstLeagueWeek } = useMemo((): { bestLeagueWeek: LeagueWeek | null; worstLeagueWeek: LeagueWeek | null } => {
    const completedSeasons = data.filter(d => d.season !== currentYear);
    let best: LeagueWeek | null = null;
    let worst: LeagueWeek | null = null;

    completedSeasons.forEach((league) => {
      if (!league.matchupInfo) return;
      
      const playoffStartWeek = league.settings.playoff_week_start || Infinity;

      league.matchupInfo.forEach((weekInfo) => {
        if (weekInfo.week >= playoffStartWeek) return; // Regular season only

        let weekTotal = 0;
        let teamCount = 0;

        weekInfo.matchups.forEach((matchup) => {
          const points = matchup.points || 0;
          if (points > 0) {
            weekTotal += points;
            teamCount++;
          }
        });

        if (teamCount === 0) return;
        const avgPoints = weekTotal / teamCount;

        if (!best || avgPoints > best.avgPoints) {
          best = { avgPoints, year: league.season, week: weekInfo.week };
        }
        if (!worst || avgPoints < worst.avgPoints) {
          worst = { avgPoints, year: league.season, week: weekInfo.week };
        }
      });
    });

    return { bestLeagueWeek: best, worstLeagueWeek: worst };
  }, [data, currentYear]);

  // Calculate head-to-head records for rivalries
  const headToHeadRecords = useMemo(() => {
    const completedSeasons = data.filter(d => d.season !== currentYear);
    const h2h: Record<string, HeadToHead> = {};

    completedSeasons.forEach((league) => {
      if (!league.matchupInfo) return;
      
      const playoffStartWeek = league.settings.playoff_week_start || Infinity;

      league.matchupInfo.forEach((weekInfo) => {
        if (weekInfo.week >= playoffStartWeek) return; // Regular season only for rivalries

        // Group matchups by matchup_id
        const matchupGroups: Record<number, any[]> = {};
        weekInfo.matchups.forEach((m) => {
          if (!matchupGroups[m.matchup_id]) matchupGroups[m.matchup_id] = [];
          matchupGroups[m.matchup_id].push(m);
        });

        Object.values(matchupGroups).forEach((group) => {
          if (group.length !== 2) return;

          const [m1, m2] = group;
          const roster1 = league.rosters.find(r => r.roster_id === m1.roster_id);
          const roster2 = league.rosters.find(r => r.roster_id === m2.roster_id);
          const user1 = league.users.find(u => u.user_id === roster1?.owner_id);
          const user2 = league.users.find(u => u.user_id === roster2?.owner_id);

          if (!user1 || !user2) return;

          // Create consistent key (smaller ID first)
          const [id1, id2] = user1.user_id < user2.user_id 
            ? [user1.user_id, user2.user_id] 
            : [user2.user_id, user1.user_id];
          const [u1, u2] = user1.user_id < user2.user_id ? [user1, user2] : [user2, user1];
          const [match1, match2] = user1.user_id < user2.user_id ? [m1, m2] : [m2, m1];
          
          const key = `${id1}_${id2}`;

          if (!h2h[key]) {
            h2h[key] = {
              team1Id: id1,
              team1Name: u1.metadata?.team_name || u1.display_name || 'Unknown',
              team2Id: id2,
              team2Name: u2.metadata?.team_name || u2.display_name || 'Unknown',
              team1Wins: 0,
              team2Wins: 0,
              team1Points: 0,
              team2Points: 0,
              totalGames: 0,
              winPctDiff: 0,
              pointsDiff: 0
            };
          }

          const pts1 = match1.points || 0;
          const pts2 = match2.points || 0;

          h2h[key].team1Points += pts1;
          h2h[key].team2Points += pts2;
          h2h[key].totalGames++;

          if (pts1 > pts2) h2h[key].team1Wins++;
          else if (pts2 > pts1) h2h[key].team2Wins++;
        });
      });
    });

    // Calculate win percentages and differences
    Object.values(h2h).forEach((record) => {
      const team1WinPct = record.totalGames > 0 ? record.team1Wins / record.totalGames : 0;
      record.winPctDiff = Math.abs(team1WinPct - 0.5);
      record.pointsDiff = Math.abs(record.team1Points - record.team2Points);
    });

    return Object.values(h2h);
  }, [data, currentYear]);

  // Find best rivalry (closest to 50%, min 4 games)
  const bestRivalry = useMemo(() => {
    const eligible = headToHeadRecords.filter(r => r.totalGames >= 4);
    if (eligible.length === 0) return null;

    return eligible.reduce((best, current) => {
      if (current.winPctDiff < best.winPctDiff) return current;
      if (current.winPctDiff === best.winPctDiff && current.pointsDiff < best.pointsDiff) return current;
      return best;
    });
  }, [headToHeadRecords]);

  // Find biggest white whale (most one-sided, min 4 games)
  const biggestWhiteWhale = useMemo(() => {
    const eligible = headToHeadRecords.filter(r => r.totalGames >= 4);
    if (eligible.length === 0) return null;

    return eligible.reduce((worst, current) => {
      if (current.winPctDiff > worst.winPctDiff) return current;
      if (current.winPctDiff === worst.winPctDiff && current.pointsDiff > worst.pointsDiff) return current;
      return worst;
    });
  }, [headToHeadRecords]);

  // Additional fun stats

  // Unique members in league history
  const uniqueMembers = useMemo(() => {
    const allMemberIds = new Set<string>();
    
    (yearTrollData as any[]).forEach((yd: any) => {
      yd.data.forEach((pd: any) => {
        if (pd.sleeper_id) {
          allMemberIds.add(pd.sleeper_id);
        }
      });
    });
    
    return allMemberIds.size;
  }, []);

  // Most championships
  const mostChampionships = useMemo((): { names: string[]; count: number } | null => {
    const championCounts: Record<string, { name: string; count: number }> = {};
    
    (yearTrollData as any[]).forEach((yd: any) => {
      const champ = yd.data.find((pd: any) => pd.place === 1);
      if (champ) {
        const id = champ.sleeper_id;
        if (!championCounts[id]) {
          championCounts[id] = { name: champ.player_name, count: 0 };
        }
        championCounts[id].count++;
      }
    });

    const maxCount = Math.max(...Object.values(championCounts).map(c => c.count), 0);
    if (maxCount === 0) return null;
    
    const leaders = Object.values(championCounts).filter(c => c.count === maxCount);
    return { names: leaders.map(l => l.name), count: maxCount };
  }, []);

  // Most butlers
  const mostButlers = useMemo((): { names: string[]; count: number } | null => {
    const butlerCounts: Record<string, { name: string; count: number }> = {};
    
    (yearTrollData as any[]).forEach((yd: any) => {
      const butl = yd.data.find((pd: any) => pd.place === 12);
      if (butl) {
        const id = butl.sleeper_id;
        if (!butlerCounts[id]) {
          butlerCounts[id] = { name: butl.player_name, count: 0 };
        }
        butlerCounts[id].count++;
      }
    });

    const maxCount = Math.max(...Object.values(butlerCounts).map(c => c.count), 0);
    if (maxCount === 0) return null;
    
    const leaders = Object.values(butlerCounts).filter(c => c.count === maxCount);
    return { names: leaders.map(l => l.name), count: maxCount };
  }, []);

  // Longest win streak in league history
  const longestWinStreaks = useMemo((): { length: number; streaks: { name: string; start: string; end: string }[] } | null => {
    const completedSeasons = data.filter(d => d.season !== currentYear);
    const allStreaks: { length: number; name: string; start: string; end: string }[] = [];

    // Get all unique user IDs
    const allUserIds = new Set<string>();
    completedSeasons.forEach(league => {
      league.users.forEach(u => allUserIds.add(u.user_id));
    });

    allUserIds.forEach(userId => {
      const streaks = getUserLongestStreak(userId, 'win', completedSeasons);
      if (streaks.length > 0) {
        const best = streaks[0];
        // Find user name from most recent appearance
        let userName = 'Unknown';
        for (let i = completedSeasons.length - 1; i >= 0; i--) {
          const user = completedSeasons[i].users.find(u => u.user_id === userId);
          if (user) {
            userName = user.metadata?.team_name || user.display_name || 'Unknown';
            break;
          }
        }
        allStreaks.push({
          length: best.length,
          name: userName,
          start: best.start.label,
          end: best.end.label
        });
      }
    });

    if (allStreaks.length === 0) return null;
    
    const maxLength = Math.max(...allStreaks.map(s => s.length));
    const tiedStreaks = allStreaks.filter(s => s.length === maxLength);
    
    return { length: maxLength, streaks: tiedStreaks };
  }, [data, currentYear]);

  // Total games played
  const totalGames = useMemo(() => {
    const completedSeasons = data.filter(d => d.season !== currentYear);
    let games = 0;
    
    completedSeasons.forEach(league => {
      if (!league.matchupInfo) return;
      league.matchupInfo.forEach(weekInfo => {
        // Each matchup is 2 teams, so divide by 2 to get games
        games += weekInfo.matchups.length / 2;
      });
    });
    
    return Math.floor(games);
  }, [data, currentYear]);

  // Closest game ever
  const closestGame = useMemo((): { margin: number; winner: string; loser: string; score: string; year: string; week: number } | null => {
    const completedSeasons = data.filter(d => d.season !== currentYear);
    let closest: { margin: number; winner: string; loser: string; score: string; year: string; week: number } | null = null;

    completedSeasons.forEach((league) => {
      if (!league.matchupInfo) return;

      league.matchupInfo.forEach((weekInfo) => {
        const matchupGroups: Record<number, any[]> = {};
        weekInfo.matchups.forEach((m) => {
          if (!matchupGroups[m.matchup_id]) matchupGroups[m.matchup_id] = [];
          matchupGroups[m.matchup_id].push(m);
        });

        Object.values(matchupGroups).forEach((group) => {
          if (group.length !== 2) return;
          const [m1, m2] = group;
          const pts1 = m1.points || 0;
          const pts2 = m2.points || 0;
          if (pts1 === 0 || pts2 === 0) return;

          const margin = Math.abs(pts1 - pts2);
          if (margin === 0) return; // Skip ties

          if (!closest || margin < closest.margin) {
            const roster1 = league.rosters.find(r => r.roster_id === m1.roster_id);
            const roster2 = league.rosters.find(r => r.roster_id === m2.roster_id);
            const user1 = league.users.find(u => u.user_id === roster1?.owner_id);
            const user2 = league.users.find(u => u.user_id === roster2?.owner_id);

            const name1 = user1?.metadata?.team_name || user1?.display_name || 'Unknown';
            const name2 = user2?.metadata?.team_name || user2?.display_name || 'Unknown';

            const [winner, loser, winPts, losePts] = pts1 > pts2 
              ? [name1, name2, pts1, pts2] 
              : [name2, name1, pts2, pts1];

            closest = {
              margin: parseFloat(margin.toFixed(2)),
              winner,
              loser,
              score: `${winPts.toFixed(2)} - ${losePts.toFixed(2)}`,
              year: league.season,
              week: weekInfo.week
            };
          }
        });
      });
    });

    return closest;
  }, [data, currentYear]);

  // Biggest blowout
  const biggestBlowout = useMemo((): { margin: number; winner: string; loser: string; score: string; year: string; week: number } | null => {
    const completedSeasons = data.filter(d => d.season !== currentYear);
    let biggest: { margin: number; winner: string; loser: string; score: string; year: string; week: number } | null = null;

    completedSeasons.forEach((league) => {
      if (!league.matchupInfo) return;

      league.matchupInfo.forEach((weekInfo) => {
        const matchupGroups: Record<number, any[]> = {};
        weekInfo.matchups.forEach((m) => {
          if (!matchupGroups[m.matchup_id]) matchupGroups[m.matchup_id] = [];
          matchupGroups[m.matchup_id].push(m);
        });

        Object.values(matchupGroups).forEach((group) => {
          if (group.length !== 2) return;
          const [m1, m2] = group;
          const pts1 = m1.points || 0;
          const pts2 = m2.points || 0;
          if (pts1 === 0 || pts2 === 0) return;

          const margin = Math.abs(pts1 - pts2);

          if (!biggest || margin > biggest.margin) {
            const roster1 = league.rosters.find(r => r.roster_id === m1.roster_id);
            const roster2 = league.rosters.find(r => r.roster_id === m2.roster_id);
            const user1 = league.users.find(u => u.user_id === roster1?.owner_id);
            const user2 = league.users.find(u => u.user_id === roster2?.owner_id);

            const name1 = user1?.metadata?.team_name || user1?.display_name || 'Unknown';
            const name2 = user2?.metadata?.team_name || user2?.display_name || 'Unknown';

            const [winner, loser, winPts, losePts] = pts1 > pts2 
              ? [name1, name2, pts1, pts2] 
              : [name2, name1, pts2, pts1];

            biggest = {
              margin: parseFloat(margin.toFixed(2)),
              winner,
              loser,
              score: `${winPts.toFixed(2)} - ${losePts.toFixed(2)}`,
              year: league.season,
              week: weekInfo.week
            };
          }
        });
      });
    });

    return biggest;
  }, [data, currentYear]);

  // Seasons count
  const seasonsCount = useMemo(() => 
    data.filter(d => d.season !== currentYear).length, 
    [data, currentYear]
  );

  // Worst record to make playoffs & Best record to miss playoffs
  const { worstPlayoffRecord, bestMissedRecord } = useMemo((): {
    worstPlayoffRecord: { wins: number; losses: number; people: string[]; count: number } | null;
    bestMissedRecord: { wins: number; losses: number; people: string[]; count: number } | null;
  } => {
    const completedSeasons = data.filter(d => d.season !== currentYear);
    const playoffRecords: { wins: number; losses: number; name: string }[] = [];
    const missedRecords: { wins: number; losses: number; name: string }[] = [];

    completedSeasons.forEach((league) => {
      if (!league.matchupInfo) return;
      
      const playoffStartWeek = league.settings.playoff_week_start || Infinity;
      
      // Calculate regular season records
      league.users.forEach((user) => {
        const seasonPlace = getUserSeasonPlace(user.user_id, league);
        if (!seasonPlace) return;

        let wins = 0;
        let losses = 0;

        // Count regular season games only
        league.matchupInfo!.forEach((weekInfo) => {
          if (weekInfo.week >= playoffStartWeek) return;

          const roster = league.rosters.find(r => r.owner_id === user.user_id);
          if (!roster) return;

          const userMatchup = weekInfo.matchups.find(m => m.roster_id === roster.roster_id);
          if (!userMatchup) return;

          const opponentMatchup = weekInfo.matchups.find(
            m => m.matchup_id === userMatchup.matchup_id && m.roster_id !== userMatchup.roster_id
          );
          if (!opponentMatchup) return;

          const userPoints = userMatchup.points || 0;
          const oppPoints = opponentMatchup.points || 0;

          if (userPoints > oppPoints) wins++;
          else if (oppPoints > userPoints) losses++;
        });

        const teamName = user.metadata?.team_name || user.display_name || 'Unknown';
        
        if (seasonPlace <= 6) {
          playoffRecords.push({ wins, losses, name: teamName });
        } else {
          missedRecords.push({ wins, losses, name: teamName });
        }
      });
    });

    // Find worst playoff record (lowest win percentage)
    let worstPlayoff: { wins: number; losses: number; people: string[]; count: number } | null = null;
    if (playoffRecords.length > 0) {
      let minWinPct = 1;
      playoffRecords.forEach((record) => {
        const total = record.wins + record.losses;
        if (total === 0) return;
        const winPct = record.wins / total;
        if (winPct < minWinPct) minWinPct = winPct;
      });

      const worstRecords = playoffRecords.filter((record) => {
        const total = record.wins + record.losses;
        return total > 0 && record.wins / total === minWinPct;
      });

      if (worstRecords.length > 0) {
        const uniquePeople = Array.from(new Set(worstRecords.map(r => r.name)));
        worstPlayoff = {
          wins: worstRecords[0].wins,
          losses: worstRecords[0].losses,
          people: uniquePeople,
          count: worstRecords.length
        };
      }
    }

    // Find best missed record (highest win percentage)
    let bestMissed: { wins: number; losses: number; people: string[]; count: number } | null = null;
    if (missedRecords.length > 0) {
      let maxWinPct = 0;
      missedRecords.forEach((record) => {
        const total = record.wins + record.losses;
        if (total === 0) return;
        const winPct = record.wins / total;
        if (winPct > maxWinPct) maxWinPct = winPct;
      });

      const bestRecords = missedRecords.filter((record) => {
        const total = record.wins + record.losses;
        return total > 0 && record.wins / total === maxWinPct;
      });

      if (bestRecords.length > 0) {
        const uniquePeople = Array.from(new Set(bestRecords.map(r => r.name)));
        bestMissed = {
          wins: bestRecords[0].wins,
          losses: bestRecords[0].losses,
          people: uniquePeople,
          count: bestRecords.length
        };
      }
    }

    return { worstPlayoffRecord: worstPlayoff, bestMissedRecord: bestMissed };
  }, [data, currentYear]);

  return (
    <div className="league-home-container">
      <LeagueNavBar data={data} />
      <div className="league-dashboard">
        <h2 className="dashboard-title">🏈 League Dashboard</h2>
        
        {/* Champions Row */}
        <div className="dashboard-section champions-section">
          <div className="champion-card gold-card">
            <div className="champion-badge">👑 Reigning Champion</div>
            {championImage && (
              <div className="champion-image-wrapper">
                <img src={championImage} alt="Champion" className="champion-image" />
              </div>
            )}
            <div className="champion-name">{champion?.name || 'TBD'}</div>
            <div className="champion-year">{champion?.year || ''}</div>
          </div>
          
          <div className="champion-card butler-card">
            <div className="champion-badge">🎩 Current Butler</div>
            {butlerImage && (
              <div className="champion-image-wrapper">
                <img src={butlerImage} alt="Butler" className="champion-image" />
              </div>
            )}
            <div className="champion-name">{butler?.name || 'TBD'}</div>
            <div className="champion-year">{butler?.year || ''}</div>
          </div>
        </div>

        {/* League Overview Stats */}
        <div className="dashboard-section">
          <h3 className="section-header">📊 League Overview</h3>
          <div className="stats-grid overview-grid">
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-value">{seasonsCount}</div>
              <div className="stat-label">Seasons Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🎮</div>
              <div className="stat-value">{totalGames}</div>
              <div className="stat-label">Total Games Played</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👨‍🦲</div>
              <div className="stat-value">{uniqueMembers}</div>
              <div className="stat-label">Unique Members</div>
            </div>
          </div>
        </div>

        {/* Dynasty Stats */}
        <div className="dashboard-section">
          <h3 className="section-header">👑 Dynasty Leaders</h3>
          <div className="stats-grid dynasty-grid">
            {mostChampionships && (
              <div className="stat-card highlight-gold">
                <div className="stat-icon">🏆</div>
                <div className="stat-value">{mostChampionships.count}</div>
                <div className="stat-label">Most Championships</div>
                <div className="stat-detail">{mostChampionships.names.join(', ')}</div>
              </div>
            )}
            {mostButlers && (
              <div className="stat-card highlight-gray">
                <div className="stat-icon">🧹</div>
                <div className="stat-value">{mostButlers.count}</div>
                <div className="stat-label">Most Butler Titles</div>
                <div className="stat-detail">{mostButlers.names.join(', ')}</div>
              </div>
            )}
            {longestWinStreaks && (
              <div className="stat-card highlight-green">
                <div className="stat-icon">🔥</div>
                <div className="stat-value">{longestWinStreaks.length}</div>
                <div className="stat-label">Longest Win Streak</div>
                {longestWinStreaks.streaks.map((streak, idx) => (
                  <div key={idx}>
                    <div className="stat-detail">{streak.name}</div>
                    <div className="stat-subdetail">{streak.start} → {streak.end}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scoring Records */}
        <div className="dashboard-section">
          <h3 className="section-header">📈 Scoring Records</h3>
          <div className="stats-grid scoring-grid">
            {highestWeek && (
              <div className="stat-card highlight-green">
                <div className="stat-icon">⬆️</div>
                <div className="stat-value">{highestWeek.points.toFixed(2)}</div>
                <div className="stat-label">Highest Score Ever</div>
                <div className="stat-detail">{highestWeek.teamName}</div>
                <div className="stat-subdetail">Week {highestWeek.week}, {highestWeek.year}</div>
              </div>
            )}
            {lowestWeek && (
              <div className="stat-card highlight-red">
                <div className="stat-icon">⬇️</div>
                <div className="stat-value">{lowestWeek.points.toFixed(2)}</div>
                <div className="stat-label">Lowest Score Ever</div>
                <div className="stat-detail">{lowestWeek.teamName}</div>
                <div className="stat-subdetail">Week {lowestWeek.week}, {lowestWeek.year}</div>
              </div>
            )}
            {bestLeagueWeek && (
              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-value">{bestLeagueWeek.avgPoints.toFixed(2)}</div>
                <div className="stat-label">Best League Week (Avg)</div>
                <div className="stat-subdetail">Week {bestLeagueWeek.week}, {bestLeagueWeek.year}</div>
              </div>
            )}
            {worstLeagueWeek && (
              <div className="stat-card">
                <div className="stat-icon">📉</div>
                <div className="stat-value">{worstLeagueWeek.avgPoints.toFixed(2)}</div>
                <div className="stat-label">Worst League Week (Avg)</div>
                <div className="stat-subdetail">Week {worstLeagueWeek.week}, {worstLeagueWeek.year}</div>
              </div>
            )}
          </div>
        </div>

        {/* Playoff Records */}
        <div className="dashboard-section">
          <h3 className="section-header">🎯 Playoff Record Extremes</h3>
          <div className="stats-grid matchup-grid">
            {worstPlayoffRecord && (
              <div className="stat-card">
                <div className="stat-icon">😬</div>
                <div className="stat-value">{worstPlayoffRecord.wins}-{worstPlayoffRecord.losses}</div>
                <div className="stat-label">Worst Record to Make Playoffs</div>
                {worstPlayoffRecord.people.length <= 3 ? (
                  <div className="stat-detail">{worstPlayoffRecord.people.join(', ')}</div>
                ) : (
                  <div className="stat-detail">{worstPlayoffRecord.count} times</div>
                )}
              </div>
            )}
            {bestMissedRecord && (
              <div className="stat-card">
                <div className="stat-icon">💔</div>
                <div className="stat-value">{bestMissedRecord.wins}-{bestMissedRecord.losses}</div>
                <div className="stat-label">Best Record to Miss Playoffs</div>
                {bestMissedRecord.people.length <= 3 ? (
                  <div className="stat-detail">{bestMissedRecord.people.join(', ')}</div>
                ) : (
                  <div className="stat-detail">{bestMissedRecord.count} times</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Game Records */}
        <div className="dashboard-section">
          <h3 className="section-header">🎯 Matchup Records</h3>
          <div className="stats-grid matchup-grid">
            {closestGame && (
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-value">{closestGame.margin} pts</div>
                <div className="stat-label">Closest Game Ever</div>
                <div className="stat-detail">{closestGame.winner} def. {closestGame.loser}</div>
                <div className="stat-subdetail">{closestGame.score}</div>
                <div className="stat-subdetail">Week {closestGame.week}, {closestGame.year}</div>
              </div>
            )}
            {biggestBlowout && (
              <div className="stat-card">
                <div className="stat-icon">💥</div>
                <div className="stat-value">{biggestBlowout.margin.toFixed(2)} pts</div>
                <div className="stat-label">Biggest Blowout</div>
                <div className="stat-detail">{biggestBlowout.winner} def. {biggestBlowout.loser}</div>
                <div className="stat-subdetail">{biggestBlowout.score}</div>
                <div className="stat-subdetail">Week {biggestBlowout.week}, {biggestBlowout.year}</div>
              </div>
            )}
          </div>
        </div>

        {/* Rivalries */}
        <div className="dashboard-section">
          <h3 className="section-header">⚔️ Rivalries</h3>
          <div className="stats-grid rivalry-grid">
            {bestRivalry && (
              <div className="stat-card rivalry-card">
                <div className="stat-icon">🤝</div>
                <div className="rivalry-header">Best Rivalry</div>
                <div className="rivalry-teams">
                  <span className="team-name">{bestRivalry.team1Name}</span>
                  <span className="vs">vs</span>
                  <span className="team-name">{bestRivalry.team2Name}</span>
                </div>
                <div className="rivalry-record">
                  {bestRivalry.team1Wins} - {bestRivalry.team2Wins}
                </div>
                <div className="stat-subdetail">{bestRivalry.totalGames} meetings</div>
                <div className="stat-subdetail">
                  {bestRivalry.team1Points > bestRivalry.team2Points 
                    ? `${bestRivalry.team1Name} +${(bestRivalry.team1Points - bestRivalry.team2Points).toFixed(1)} pts`
                    : bestRivalry.team2Points > bestRivalry.team1Points
                    ? `${bestRivalry.team2Name} +${(bestRivalry.team2Points - bestRivalry.team1Points).toFixed(1)} pts`
                    : 'Even on points'}
                </div>
              </div>
            )}
            {biggestWhiteWhale && (
              <div className="stat-card rivalry-card white-whale">
                <div className="stat-icon">🐋</div>
                <div className="rivalry-header">Biggest White Whale</div>
                <div className="rivalry-teams">
                  <span className="team-name">{biggestWhiteWhale.team1Name}</span>
                  <span className="vs">vs</span>
                  <span className="team-name">{biggestWhiteWhale.team2Name}</span>
                </div>
                <div className="rivalry-record">
                  {biggestWhiteWhale.team1Wins} - {biggestWhiteWhale.team2Wins}
                </div>
                <div className="stat-subdetail">{biggestWhiteWhale.totalGames} meetings</div>
                <div className="stat-subdetail">
                  {biggestWhiteWhale.team1Points > biggestWhiteWhale.team2Points 
                    ? `${biggestWhiteWhale.team1Name} +${(biggestWhiteWhale.team1Points - biggestWhiteWhale.team2Points).toFixed(1)} pts`
                    : biggestWhiteWhale.team2Points > biggestWhiteWhale.team1Points
                    ? `${biggestWhiteWhale.team2Name} +${(biggestWhiteWhale.team2Points - biggestWhiteWhale.team1Points).toFixed(1)} pts`
                    : 'Even on points'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeagueHome;
