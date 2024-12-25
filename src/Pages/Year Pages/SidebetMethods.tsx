import React from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import SidebetStat from '../../Interfaces/SidebetStat';
import MatchupInfo from '../../Interfaces/MatchupInfo';
import SleeperUser from '../../Interfaces/SleeperUser';
import { findRosterByUserId, findUserByRosterId, getBowlWinner, projectedPointsInWeek } from '../../Helper Files/HelperMethods';
import sidebetsData from '../../Data/sidebets.json';
import yearTrollData from '../../Data/yearTrollData.json';
import SleeperRoster from '../../Interfaces/SleeperRoster';
import Matchup from '../../Interfaces/Matchup';
import { getLeagueRecordAtSchedule } from '../../Helper Files/RecordCalculations';
import NFLStandingEntry from '../../Interfaces/NFLStandingEntry';
import playerData from '../../Data/players.json';
import PlayerYearStats from '../../Interfaces/PlayerYearStats';
import yearData from '../../Data/yearData.json';


class SidebetMethods {
  static Sidebets(): Sidebet[] {
    const sidebets: Sidebet[] = sidebetsData;

    return sidebets;
  }

  static Heartbreaker(data: LeagueData): SidebetStat[] {
    let orderedSidebets: SidebetStat[] = [];
    data.users.map((user) => {
      orderedSidebets.push(this.UserHeartbreaker(data, user));
    });

    orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number) ? a.stat_number - b.stat_number : 100);
    return orderedSidebets;
  }

  static UserHeartbreaker(data: LeagueData, user: SleeperUser): SidebetStat {
    let heartbreakerTotal: number = 200;
    let points: number = 0;
    let opponentPoints: number = 0;
    let week: number = 0;
    let opponent: string = "";

    const rosterId: number = (data.rosters.find(r => r.owner_id === user.user_id)?.roster_id || 0);
    data.matchupInfo.map((matchupInfo: MatchupInfo) => {
      if (matchupInfo.week < data.settings.playoff_week_start) {
        let matchup = matchupInfo.matchups.find(m => m.roster_id === rosterId);
        let opponentMatchup = matchupInfo.matchups.find(m => m.matchup_id === matchup?.matchup_id && m.roster_id !== rosterId);
        if (matchup && opponentMatchup) {
          if (matchup.points < opponentMatchup.points) {
            const difference = opponentMatchup.points - matchup.points;
            if (difference < heartbreakerTotal) {
              week = matchupInfo.week;
              heartbreakerTotal = difference;
              opponent = (findUserByRosterId(opponentMatchup.roster_id, data)?.metadata.team_name || "");
              points = matchup.points;
              opponentPoints = opponentMatchup.points;
            }
          }
        }
      }
    });
    let sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = heartbreakerTotal;
    sidebetStat.stats_display = heartbreakerTotal.toFixed(2) + " during week " + week + " against " + opponent + ": " + points + " - " + opponentPoints;

    return sidebetStat;
  }

  static HelmetMaster(data: LeagueData): SidebetStat[] {
    const helmetStats: SidebetStat[] = data.users
    .map((user) => this.UserHelmetMaster(data, user))
    .filter((stat): stat is SidebetStat => stat !== undefined); // Ensure only valid SidebetStat are included

    // Filter out any undefined results in case some users don't have entries
    const validHelmetStats = helmetStats.filter(
      (stat): stat is SidebetStat => stat !== undefined
    );

    // Sort by stat_number ascending (closest first)
    validHelmetStats.sort((a, b) =>
      a.stat_number !== undefined && b.stat_number !== undefined
        ? a.stat_number - b.stat_number
        : 0
    );

    return validHelmetStats;
  }


  static UserHelmetMaster(data: LeagueData, user: SleeperUser): SidebetStat | undefined {
    const currentSeason = data.season;
    const userSleeperId = user.user_id;
  
    // Find the yearData matching the current season
    const yearData = yearTrollData.find(
      (yd) => yd.year === Number.parseFloat(currentSeason)
    );
  
    if (!yearData) {
      console.warn(
        `No yearTrollData found for season ${currentSeason}.`
      );
      return undefined;
    }
  
    // Find the player's data
    const playerData = yearData.data.find(
      (pd: any) => pd.sleeper_id === userSleeperId
    );
  
    if (!playerData) {
      console.warn(
        `No helmet master data found for user ${user.user_id} in season ${currentSeason}.`
      );
      return undefined;
    }
  
    const helmetMasterTeam: string = playerData.HM_sleeper_id;
    const guessedRecordStr: string = playerData.HM_guessed_record;
  
    // Parse the guessed record with a fallback for ties
    const [guessedWinsStr, guessedLossesStr, guessedTiesStr] = guessedRecordStr.split('-');
    const guessedWins = parseInt(guessedWinsStr, 10);
    const guessedLosses = parseInt(guessedLossesStr, 10);
    const guessedTies = guessedTiesStr ? parseInt(guessedTiesStr, 10) : 0; // Default to 0 ties if not present
  
    if (isNaN(guessedWins) || isNaN(guessedLosses) || isNaN(guessedTies)) {
      console.warn(
        `Invalid guessed record format for user ${user.user_id}: ${guessedRecordStr}.`
      );
      return undefined;
    }
  
    // Calculate guessed win percentage
    const guessedWinPercentage = 
      (guessedWins + 0.5 * guessedTies) / 
      (guessedWins + guessedLosses + guessedTies);
  
    // Find the actual record from nflStandings
    const actualStanding: NFLStandingEntry | undefined = data.nflStandings?.find(
      (standing) =>
        standing.abbreviation.toLowerCase() === helmetMasterTeam.toLowerCase()
    );
  
    if (!actualStanding) {
      console.warn(
        `No NFL standing found for team ${helmetMasterTeam}.`
      );
      return undefined;
    }
  
    const actualWins = actualStanding.wins;
    const actualLosses = actualStanding.losses;
    const actualTies = actualStanding.ties;
    const actualWinPercentage = actualStanding.winPercent; // Already provided in `actualStanding`
  
    // Calculate the absolute difference between guessed and actual win percentages
    const percentageDifference = Math.abs(guessedWinPercentage - actualWinPercentage);
  
    // Format the guessed and actual records without ties if ties are 0
    const guessedRecordDisplay = guessedTies > 0 
      ? `${guessedWins}-${guessedLosses}-${guessedTies}` 
      : `${guessedWins}-${guessedLosses}`;
    const actualRecordDisplay = actualTies > 0 
      ? `${actualWins}-${actualLosses}-${actualTies}` 
      : `${actualWins}-${actualLosses}`;
  
    // Create the SidebetStat object
    const sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = percentageDifference; // Store percentage difference as the stat number
    sidebetStat.stats_display = `${actualStanding.name} (Guessed: ${guessedRecordDisplay} (${(guessedWinPercentage * 100).toFixed(1)}%), Actual: ${actualRecordDisplay} (${(actualWinPercentage * 100).toFixed(1)}%))`;
  
    return sidebetStat;
  }
  
  static MostPointsAgainst(data: LeagueData): SidebetStat[] {
    let orderedSidebets: SidebetStat[] = [];

    data.rosters.map((roster: SleeperRoster) => {
      let sidebetStat: SidebetStat = new SidebetStat();
      sidebetStat.user = data.users.find(u => u.user_id === roster.owner_id);
      sidebetStat.stat_number = roster.settings.fpts_against + roster.settings.fpts_against_decimal;
      sidebetStat.stats_display = (roster.settings.fpts_against + roster.settings.fpts_against_decimal).toFixed(2);
      orderedSidebets.push(sidebetStat);
    });

    orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number) ? b.stat_number - a.stat_number : 100);
    return orderedSidebets;
  }

  static BossWhenItCounts(data: LeagueData): SidebetStat[] {
    if(data.season===data.nflSeasonInfo.season && data.nflSeasonInfo.week<data.settings.playoff_week_start+2){
      return [new SidebetStat()];
    }
    return this.MostPointsInWeek(data,data.settings.playoff_week_start+2);
  }

  static ComingInHot(data: LeagueData): SidebetStat[] {
    return this.MostPointsInWeek(data,1);
  }

  static MostPointsInWeek(data: LeagueData, week: number): SidebetStat[]{
    let orderedSidebets: SidebetStat[] = [];
    data.matchupInfo[week-1].matchups.map((matchup: Matchup) => {
      let sidebetStat: SidebetStat = new SidebetStat();
      sidebetStat.user = findUserByRosterId(matchup.roster_id, data);
      sidebetStat.stat_number = matchup.points;
      sidebetStat.stats_display = matchup.points.toFixed(2);
      orderedSidebets.push(sidebetStat);
    });

    orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number) ? b.stat_number - a.stat_number : 100); //high to low
    return orderedSidebets;
  }

  static Waffle(data: LeagueData): SidebetStat[] {
    let orderedSidebets: SidebetStat[] = [];

    data.users.map((user: SleeperUser) => {
      let winsSum = 0;
      let lossesSum = 0;
      let tiesSum = 0;

      [winsSum, lossesSum, tiesSum] = getLeagueRecordAtSchedule(user, data);

      let sidebetStat: SidebetStat = new SidebetStat();
      sidebetStat.user = user;
      sidebetStat.stats_record = { wins: winsSum, losses: lossesSum, ties: tiesSum };
      sidebetStat.stats_display = sidebetStat.DisplayRecord();
      orderedSidebets.push(sidebetStat);
    });


    orderedSidebets.sort((a, b) => (a.stats_record && b.stats_record) ? a.stats_record.wins - b.stats_record.wins : 1000); //low to high
    return orderedSidebets;
  }

  static BetterLuckyThanGood(data: LeagueData): SidebetStat[] {
    let orderedSidebets: SidebetStat[] = [];
    data.users.map((user) => {
      orderedSidebets.push(this.UserBetterLuckyThanGood(data, user));
    });

    orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number) ? a.stat_number - b.stat_number : 100);
    return orderedSidebets;
  }

  static UserBetterLuckyThanGood(data: LeagueData, user: SleeperUser): SidebetStat {
    let betterLuckyThanGoodTotal: number = 200;
    let points: number = 0;
    let opponentPoints: number = 0;
    let week: number = 0;
    let opponent: string = "";

    const rosterId: number = (data.rosters.find(r => r.owner_id === user.user_id)?.roster_id || 0);
    data.matchupInfo.map((matchupInfo: MatchupInfo) => {
      if (matchupInfo.week < data.settings.playoff_week_start && (data.nflSeasonInfo.season!==data.season || matchupInfo.week!==data.nflSeasonInfo.week)) {
        let matchup = matchupInfo.matchups.find(m => m.roster_id === rosterId);
        let opponentMatchup = matchupInfo.matchups.find(m => m.matchup_id === matchup?.matchup_id && m.roster_id !== rosterId);
        if (matchup && opponentMatchup) {
          if (matchup.points > opponentMatchup.points) {
            if (matchup.points < betterLuckyThanGoodTotal) {
              week = matchupInfo.week;
              betterLuckyThanGoodTotal = matchup.points;
              opponent = (findUserByRosterId(opponentMatchup.roster_id, data)?.metadata.team_name || "");
              points = matchup.points;
              opponentPoints = opponentMatchup.points;
            }
          }
        }
      }
    });
    let sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = betterLuckyThanGoodTotal;
    sidebetStat.stats_display = betterLuckyThanGoodTotal.toFixed(2) + " during week " + week + " against " + opponent + ": " + points + " - " + opponentPoints;

    return sidebetStat;
  }

  static Juggernaut(data: LeagueData): SidebetStat[] {
    let orderedSidebets: SidebetStat[] = [];
    data.users.map((user) => {
      orderedSidebets.push(this.UserJuggernaut(data, user));
    });

    orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number) ? b.stat_number - a.stat_number : 0);
    return orderedSidebets;
  }

  static UserJuggernaut(data: LeagueData, user: SleeperUser): SidebetStat {
    let juggernautTotal: number = 0;
    let points: number = 0;
    let opponentPoints: number = 0;
    let week: number = 0;
    let opponent: string = "";

    const rosterId: number = (data.rosters.find(r => r.owner_id === user.user_id)?.roster_id || 0);
    data.matchupInfo.map((matchupInfo: MatchupInfo) => {
      if (matchupInfo.week < data.settings.playoff_week_start) {
        let matchup = matchupInfo.matchups.find(m => m.roster_id === rosterId);
        let opponentMatchup = matchupInfo.matchups.find(m => m.matchup_id === matchup?.matchup_id && m.roster_id !== rosterId);
        if (matchup && opponentMatchup) {
          if (matchup.points > juggernautTotal) {
            week = matchupInfo.week;
            juggernautTotal = matchup.points;
            opponent = (findUserByRosterId(opponentMatchup.roster_id, data)?.metadata.team_name || "");
            points = matchup.points;
            opponentPoints = opponentMatchup.points;
          }

        }
      }
    });
    let sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = juggernautTotal;
    sidebetStat.stats_display = juggernautTotal.toFixed(2) + " during week " + week + " against " + opponent + ": " + points + " - " + opponentPoints;

    return sidebetStat;
  }

  static MaybeNextTime(data: LeagueData): SidebetStat[] {
    let orderedSidebets: SidebetStat[] = [];
    data.users.map((user) => {
      orderedSidebets.push(this.UserMaybeNextTime(data, user));
    });

    orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number) ? b.stat_number - a.stat_number : 0);
    return orderedSidebets;
  }

  static UserMaybeNextTime(data: LeagueData, user: SleeperUser): SidebetStat {
    let maybeNextTimeTotal: number = 0;
    let points: number = 0;
    let opponentPoints: number = 0;
    let week: number = 0;
    let opponent: string = "";

    const rosterId: number = (data.rosters.find(r => r.owner_id === user.user_id)?.roster_id || 0);
    data.matchupInfo.map((matchupInfo: MatchupInfo) => {
      if (matchupInfo.week < data.settings.playoff_week_start) {
        let matchup = matchupInfo.matchups.find(m => m.roster_id === rosterId);
        let opponentMatchup = matchupInfo.matchups.find(m => m.matchup_id === matchup?.matchup_id && m.roster_id !== rosterId);
        if (matchup && opponentMatchup) {
          if (matchup.points < opponentMatchup.points) {
            if (matchup.points > maybeNextTimeTotal) {
              week = matchupInfo.week;
              maybeNextTimeTotal = matchup.points;
              opponent = (findUserByRosterId(opponentMatchup.roster_id, data)?.metadata.team_name || "");
              points = matchup.points;
              opponentPoints = opponentMatchup.points;
            }
          }
        }
      }
    });
    let sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = maybeNextTimeTotal;
    sidebetStat.stats_display = maybeNextTimeTotal.toFixed(2) + " during week " + week + " against " + opponent + ": " + points + " - " + opponentPoints;

    return sidebetStat;
  }

  static GetWreckd(data: LeagueData): SidebetStat[] {
    let orderedSidebets: SidebetStat[] = [];
    data.users.map((user) => {
      orderedSidebets.push(this.UserGetWreckd(data, user));
    });

    orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number) ? b.stat_number - a.stat_number : 0);
    return orderedSidebets;
  }

  static UserGetWreckd(data: LeagueData, user: SleeperUser): SidebetStat {
    let getWreckdTotal: number = 0;
    let points: number = 0;
    let opponentPoints: number = 0;
    let week: number = 0;
    let opponent: string = "";

    const rosterId: number = (data.rosters.find(r => r.owner_id === user.user_id)?.roster_id || 0);
    data.matchupInfo.map((matchupInfo: MatchupInfo) => {
      if (matchupInfo.week < data.settings.playoff_week_start) {
        let matchup = matchupInfo.matchups.find(m => m.roster_id === rosterId);
        let opponentMatchup = matchupInfo.matchups.find(m => m.matchup_id === matchup?.matchup_id && m.roster_id !== rosterId);
        if (matchup && opponentMatchup) {
          if (matchup.points > opponentMatchup.points) {
            const difference = matchup.points - opponentMatchup.points ;
            if (difference > getWreckdTotal) {
              week = matchupInfo.week;
              getWreckdTotal = difference;
              opponent = (findUserByRosterId(opponentMatchup.roster_id, data)?.metadata.team_name || "");
              points = matchup.points;
              opponentPoints = opponentMatchup.points;
            }
          }
        }
      }
    });
    let sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = getWreckdTotal;
    sidebetStat.stats_display = getWreckdTotal.toFixed(2) + " during week " + week + " against " + opponent + ": " + points + " - " + opponentPoints;

    return sidebetStat;
  }

  static Charger(data: LeagueData): SidebetStat[] {
    let orderedSidebets: SidebetStat[] = [];
    data.users.map((user) => {
      orderedSidebets.push(this.UserCharger(data, user));
    });
    orderedSidebets.sort((a, b) => (b.stat_number || 0) - (a.stat_number || 0));
    return orderedSidebets;
  }

  static UserCharger(data: LeagueData, user: SleeperUser): SidebetStat {
    let chargerTotal: number = 0;
    let weeks10: string = "";
    let weeks5: string ="";
    let weeks1: string="";


    const rosterId: number = (data.rosters.find(r => r.owner_id === user.user_id)?.roster_id || 0);
    data.matchupInfo.map((matchupInfo: MatchupInfo) => {
      if (matchupInfo.week < data.settings.playoff_week_start) {
        let matchup = matchupInfo.matchups.find(m => m.roster_id === rosterId);
        let opponentMatchup = matchupInfo.matchups.find(m => m.matchup_id === matchup?.matchup_id && m.roster_id !== rosterId);
        if (matchup && opponentMatchup) {
          if (matchup.points < opponentMatchup.points) {
            const difference = opponentMatchup.points - matchup.points;
            if (difference < 1) {
              if(weeks1!==""){
                weeks1+=", "
              }
              weeks1 += matchupInfo.week;
              chargerTotal+=3;
            } else if (difference < 5) {
              if(weeks5!==""){
                weeks5+=", "
              }
              weeks5 += matchupInfo.week;
              chargerTotal+=2;
            } else if (difference < 10) {
              if(weeks10!==""){
                weeks10+=", "
              }
              weeks10 += matchupInfo.week;
              chargerTotal++;
            }
          }
        }
      }
    });
    let sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = chargerTotal;
    sidebetStat.stats_display = chargerTotal.toFixed(0);
    if(weeks1!=="" || weeks5!=="" || weeks10!==""){
      sidebetStat.stats_display += " - "
    }
    if(weeks1!==""){
      sidebetStat.stats_display += " <1 week(s): " + weeks1;
    }
    if(weeks5!==""){
      sidebetStat.stats_display += " <5 week(s): " + weeks5;
    }
    if(weeks10!==""){
      sidebetStat.stats_display += " <10 week(s): " + weeks10;
    }

    return sidebetStat;
  }

  static Viking(data: LeagueData): SidebetStat[] {
    let orderedSidebets: SidebetStat[] = [];
    data.users.map((user) => {
      orderedSidebets.push(this.UserViking(data, user));
    });
    //console.log(orderedSidebets);
    orderedSidebets.sort((a, b) => (b.stat_number || 0) - (a.stat_number || 0));
    return orderedSidebets;
  }

  static UserViking(data: LeagueData, user: SleeperUser): SidebetStat {
    let vikingTotal: number = 0;
    let weeks10: string = "";
    let weeks5: string ="";
    let weeks1: string="";


    const rosterId: number = (data.rosters.find(r => r.owner_id === user.user_id)?.roster_id || 0);
    data.matchupInfo.map((matchupInfo: MatchupInfo) => {
      if (matchupInfo.week < data.settings.playoff_week_start) {
        let matchup = matchupInfo.matchups.find(m => m.roster_id === rosterId);
        let opponentMatchup = matchupInfo.matchups.find(m => m.matchup_id === matchup?.matchup_id && m.roster_id !== rosterId);
        if (matchup && opponentMatchup) {
          if (matchup.points > opponentMatchup.points) {
            const difference = matchup.points-opponentMatchup.points;
            if (difference < 1) {
              if(weeks1!==""){
                weeks1+=", "
              }
              weeks1 += matchupInfo.week;
              vikingTotal+=3;
            } else if (difference < 5) {
              if(weeks5!==""){
                weeks5+=", "
              }
              weeks5 += matchupInfo.week;
              vikingTotal+=2;
            } else if (difference < 10) {
              if(weeks10!==""){
                weeks10+=", "
              }
              weeks10 += matchupInfo.week;
              vikingTotal++;
            }
          }
        }
      }
    });
    let sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = vikingTotal;
    sidebetStat.stats_display = vikingTotal.toFixed(0);
    if(weeks1!=="" || weeks5!=="" || weeks10!==""){
      sidebetStat.stats_display += " - "
    }
    if(weeks1!==""){
      sidebetStat.stats_display += " <1 week(s): " + weeks1;
    }
    if(weeks5!==""){
      sidebetStat.stats_display += " <5 week(s): " + weeks5;
    }
    if(weeks10!==""){
      sidebetStat.stats_display += " <10 week(s): " + weeks10;
    }

    return sidebetStat;
  }

  static async JamarcusRussel(data: LeagueData): Promise<SidebetStat[]> {
    // Fetch stats for each user and await all API calls
    const jamarcusStats = await Promise.all(
      data.users.map((user) => this.JamarcusRusselUser(data, user))
    );
  
    // Filter out undefined entries and sort by stat_number ascending
    const validStats = jamarcusStats.filter(
      (stat): stat is SidebetStat => stat !== undefined
    );
  
    validStats.sort((a, b) =>
      a.stat_number !== undefined && b.stat_number !== undefined
        ? a.stat_number - b.stat_number
        : 0
    );
  
    return validStats;
  }
  
  static async JamarcusRusselUser(data: LeagueData,user: SleeperUser): Promise<SidebetStat | undefined> {
    const season = data.season;
    const userSleeperId = user.user_id;
  
    // Find the yearData matching the current season
    const yearData = yearTrollData.find(
      (yd) => yd.year === Number.parseFloat(season)
    );
  
    if (!yearData) {
      console.warn(`No yearTrollData found for season ${season}.`);
      return undefined;
    }
  
    // Find the player's data in yearTrollData
    const playerData = yearData.data.find(
      (pd: any) => pd.sleeper_id === userSleeperId
    );
  
    if (!playerData) {
      console.warn(
        `No data found for user ${userSleeperId} in season ${season}.`
      );
      return undefined;
    }
  
    const playerId = playerData.first_round_draft_pick_sleeper_id;
  
    if (!playerId) {
      console.warn(
        `No first round draft pick ID for user ${userSleeperId} in season ${season}.`
      );
      return undefined;
    }
  
    try {
      // Fetch player stats from the Sleeper API using fetch
      const response = await fetch(
        `https://api.sleeper.com/stats/nfl/player/${playerId}?season_type=regular&season=${season}`
      );
  
      if (!response.ok) {
        console.error(
          `Failed to fetch player stats for player ID ${playerId}: HTTP ${response.status}`
        );
        return undefined;
      }
  
      const playerStat = await response.json();
  
      if (!playerStat || !playerStat.stats?.pts_half_ppr) {
        console.warn(
          `No valid stats found for player ID ${playerId} in season ${season}.`
        );
        return undefined;
      }
  
      const halfPPRPoints = playerStat.stats.pts_half_ppr;
      const playerName = `${playerStat.player.first_name} ${playerStat.player.last_name}`;
  
      // Create the SidebetStat object
      const sidebetStat: SidebetStat = new SidebetStat();
      sidebetStat.user = user;
      sidebetStat.stat_number = halfPPRPoints; // Use half PPR points as stat number
      sidebetStat.stats_display = `${playerName} (Half PPR Points: ${halfPPRPoints})`;
  
      return sidebetStat;
    } catch (error) {
      console.error(
        `Error fetching player stats for user ${userSleeperId} and player ID ${playerId}:`,
        error
      );
      return undefined;
    }
  }

  static async Underperformer(data: LeagueData): Promise<SidebetStat[]> {
        // Fetch stats for each user and await all API calls
        const underperformerStats = await Promise.all(
          data.users.map((user) => this.UserUnderperformer(data, user))
        );
      
        // Filter out undefined entries and sort by stat_number ascending
        const validStats = underperformerStats.filter(
          (stat): stat is SidebetStat => stat !== undefined
        );
      
        validStats.sort((a, b) =>
          a.stat_number !== undefined && b.stat_number !== undefined
            ? a.stat_number - b.stat_number
            : 0
        );
      
        return validStats;
  }

  static async UserUnderperformer(data: LeagueData, user: SleeperUser): Promise<SidebetStat | undefined> {
    let relevantMatchups: MatchupInfo[];
    let currentDifference: number = 0; // Initialize with a default value
    let matchupFound: boolean = false;
    const teamRosterId: number = findRosterByUserId(user.user_id, data.rosters)?.roster_id ?? 0;
    
    if (data.season === data.nflSeasonInfo.season) {
        relevantMatchups = data.matchupInfo.filter(
            (matchup) =>
                matchup.week < data.nflSeasonInfo.week &&
                matchup.week < data.settings.playoff_week_start &&
                matchup.matchups.some((m) => m.roster_id === teamRosterId)
        );
    } else {
        relevantMatchups = data.matchupInfo.filter(
            (matchup) =>
                matchup.week < data.settings.playoff_week_start &&
                matchup.matchups.some((m) => m.roster_id === teamRosterId)
        );
    }

    for (const matchup of relevantMatchups) {
        const teamMatchup: Matchup | undefined = matchup.matchups.find((m) => m.roster_id === teamRosterId);
        if (teamMatchup) {
            matchupFound=true;
            const projectedPoints = await projectedPointsInWeek(user, matchup.week, data);
            currentDifference += teamMatchup.points - projectedPoints;
            if(user.metadata.team_name==="Walrus"){
              console.log(`Week: ${matchup.week}: ${teamMatchup.points} - ${projectedPoints}`);
            }
        }
    }
    
    const sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    if(matchupFound){
      currentDifference=parseFloat((currentDifference).toFixed(2))
      if (currentDifference !== 0) {
        sidebetStat.stat_number = currentDifference;
        if (currentDifference > 0) {
            sidebetStat.stats_display = `${user.metadata.team_name} was above projection by ${currentDifference}`;  
        } else {
            currentDifference = currentDifference * -1;
            sidebetStat.stats_display = `${user.metadata.team_name} was below projection by ${currentDifference}`;  
        }
      } else {
        sidebetStat.stats_display = `Somehow ${user.metadata.team_name} exactly met their projection`;  
      }
    }
    else{
      sidebetStat.stat_number = 0;
      sidebetStat.stats_display = "Something went wrong";
    }


    return sidebetStat;
}

  static SetAndForgetWinner(data: LeagueData): SidebetStat[] {
    let orderedSidebets: SidebetStat[] = [];

    let sidebetStat: SidebetStat = new SidebetStat();
    let winner_user: SleeperUser|undefined; 
    let loser_user: SleeperUser|undefined;

    // Find the data for the current year
    const currentYearData = yearData.find(d => d.year.toString() === data.season);
    if (currentYearData) {
      const leagueData = currentYearData.data[0]; // assuming only one entry per year

      // Get the winner and loser IDs from the json
      const winnerId = leagueData.set_and_forget_winner_id;
      const loserId = leagueData.set_and_forget_loser_id;

      // Find the winner_user and loser_user based on the IDs
      winner_user = data.users.find(user => user.user_id === winnerId);
      loser_user = data.users.find(user => user.user_id === loserId);

      // Set the winner and loser for the sidebet stat
      if(winner_user && loser_user){
      sidebetStat.user = winner_user;
      const winnerPoints = (leagueData.set_and_forget_winner_points === "" || leagueData.set_and_forget_winner_points === undefined)
      ? 0 : Number(leagueData.set_and_forget_winner_points);
      const loserPoints = (leagueData.set_and_forget_loser_points === "" || leagueData.set_and_forget_loser_points === undefined)
      ? 0 : Number(leagueData.set_and_forget_loser_points);
      sidebetStat.stat_number = winnerPoints;
        sidebetStat.stats_display = `${winner_user.metadata.team_name} defeated ${loser_user.metadata.team_name}: 
        ${winnerPoints} - ${loserPoints}`;
      orderedSidebets.push(sidebetStat);
      }     
  }
    return orderedSidebets;
  }

  static ParticipationRibbon(data: LeagueData): SidebetStat[] {
    let orderedSidebets: SidebetStat[] = [];

    const [user1,user2,winnerString] = getBowlWinner("Toilet Bowl",data);
    let sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user=user1;
    sidebetStat.stat_number=7;
    sidebetStat.stats_display=winnerString;
    orderedSidebets.push(sidebetStat);

    return orderedSidebets;
  }

  static UserPointsAgainstByPosition(position: string, user: SleeperUser, data: LeagueData): number {
    let pointsAgainstByPosition: number = 0;
    let teamRosterId = findRosterByUserId(user.user_id, data.rosters)?.roster_id;
    let relevantMatchups;
      if (data.nflSeasonInfo.season === data.season) {
          relevantMatchups = data.matchupInfo.filter(
              (matchup) =>
                  matchup.week < data.nflSeasonInfo.week &&
                  matchup.week < data.settings.playoff_week_start
          );
      }
      else {
          relevantMatchups = data.matchupInfo.filter(
              (matchup) =>
                  matchup.week < data.settings.playoff_week_start 
          );
      }

      relevantMatchups.forEach((matchup) => {
        const teamMatchup: Matchup|undefined = matchup.matchups.find((m) => m.roster_id === teamRosterId);
        const oppMatchup: Matchup|undefined = matchup.matchups.find((m) => m.matchup_id === teamMatchup?.matchup_id && m.roster_id !== teamMatchup?.roster_id);

        if (teamMatchup && oppMatchup) {
          for (let i = 0; i < oppMatchup.starters.length; i++) {
              const playerId = oppMatchup.starters[i];

              // Check if playerId exists in playerData
              if (playerId in playerData) {
                const player = (playerData as Record<string, any>)[playerId];
                const fantasyPositions: string[] = player.fantasy_positions || [];
                  if (fantasyPositions.includes(position)) {
                      pointsAgainstByPosition += oppMatchup.starters_points[i];
                  }
              }
          }
      }
    });
    return pointsAgainstByPosition;
  }

  static SortedPointsAgainstByPosition(position: string, data: LeagueData): SidebetStat[]{
    let orderedSidebets: SidebetStat[] = [];

    data.rosters.map((roster: SleeperRoster) => {
      let sidebetStat: SidebetStat = new SidebetStat();
      sidebetStat.user = data.users.find(u => u.user_id === roster.owner_id);
      if(sidebetStat.user){
        sidebetStat.stat_number = this.UserPointsAgainstByPosition(position,sidebetStat.user,data);
        sidebetStat.stats_display = (sidebetStat.stat_number).toFixed(2);
        orderedSidebets.push(sidebetStat);
      }
    });

    orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number) ? b.stat_number - a.stat_number : 100);
    return orderedSidebets;
  }

  static ConnarEffect(data: LeagueData): SidebetStat[] {
    return this.SortedPointsAgainstByPosition("QB", data);
  }

  static GetRunOver(data: LeagueData): SidebetStat[] {
    return this.SortedPointsAgainstByPosition("RB", data);
  }

  static ReceivingLosses(data: LeagueData): SidebetStat[] {
    return this.SortedPointsAgainstByPosition("WR", data);
  }

  static KilledByATightEnd(data: LeagueData): SidebetStat[] {
    return this.SortedPointsAgainstByPosition("TE", data);
  }

  static KickedInDaBallz(data: LeagueData): SidebetStat[] {
    return this.SortedPointsAgainstByPosition("K", data);
  }

  static BlueBalls(data: LeagueData): SidebetStat[] {
    return this.SortedPointsAgainstByPosition("DEF", data);
  }

  static async BestBadReceiver(data: LeagueData): Promise<SidebetStat[]> {
    // Fetch stats for each user and await all API calls
    const badReceiverStats = await Promise.all(
      data.users.map((user) => this.UserBestBadReceiver(data, user))
    );
  
    // Filter out undefined entries and sort by stat_number ascending
    const validStats = badReceiverStats.filter(
      (stat): stat is SidebetStat => stat !== undefined
    );
  
    validStats.sort((a, b) =>
      a.stat_number !== undefined && b.stat_number !== undefined
        ? b.stat_number - a.stat_number
        : 0
    );
  
    return validStats;
  }

  static async UserBestBadReceiver(data: LeagueData, user: SleeperUser): Promise<SidebetStat | undefined> {
    const currentSeason = data.season;
    const userSleeperId = user.user_id;
  
    // Find the yearData matching the current season
    const yearData = yearTrollData.find(
      (yd) => yd.year === Number.parseFloat(currentSeason)
    );
  
    if (!yearData) {
      console.warn(
        `No yearTrollData found for season ${currentSeason}.`
      );
      return undefined;
    }
  
    // Find the player's data
    const playerData = yearData.data.find(
      (pd: any) => pd.sleeper_id === userSleeperId
    );
  
    if (!playerData) {
      console.warn(
        `No helmet master data found for user ${user.user_id} in season ${currentSeason}.`
      );
      return undefined;
    }
  
    const receiverId: string = playerData.HM_4th_string_sleeper_id.toString();
    if (receiverId === "") return undefined;
  
    // Fetch the player's stats from the Sleeper API
    const apiUrl = `https://api.sleeper.com/stats/nfl/player/${receiverId}?season_type=regular&season=${currentSeason}`;
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`Failed to fetch player stats: ${response.statusText}`);
        return undefined;
      }
  
      const playerYearStats: PlayerYearStats = await response.json();
      const points = playerYearStats.stats.pts_half_ppr;
  
      let sidebetStat: SidebetStat = new SidebetStat();
      sidebetStat.user = user;
      sidebetStat.stat_number = points || 0; // Default to 0 if points are undefined
      sidebetStat.stats_display = `${playerYearStats.player.first_name} ${playerYearStats.player.last_name} with ${points} half-PPR points`;
  
      return sidebetStat;
    } catch (error) {
      console.error("Error fetching player stats");
      return undefined;
    }
  }

  static NewStatTemplate(data: LeagueData): SidebetStat[] {
    let orderedSidebets: SidebetStat[] = [];


    //let sidebetStat: SidebetStat = new SidebetStat();
    //sidebetStat.user = 
    //sidebetStat.stat_number = 
    //sidebetStat.stats_display = 
    //orderedSidebets.push(sidebetStat);

    //orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number) ? b.stat_number - a.stat_number : 0); //high to low
    //orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number) ? a.stat_number - b.stat_number : 1000); //low to high
    // orderedSidebets.sort((a, b) => (a.stats_record && b.stats_record) ? b.stats_record.wins - a.stats_record.wins: 0); //high to low
    // orderedSidebets.sort((a, b) => (a.stats_record && b.stats_record) ? a.stats_record.wins - b.stats_record.wins: 1000); //low to high
    return orderedSidebets;
  }
}

export interface Sidebet {
  methodName: string;
  displayName: string;
  description: string;
  isAsync: boolean;
}

export interface YearSidebet {
  year: number;
  data: { sidebetName: string }[];
}

export default SidebetMethods;