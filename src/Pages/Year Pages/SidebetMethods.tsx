import React from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import SidebetStat from '../../Interfaces/SidebetStat';
import MatchupInfo from '../../Interfaces/MatchupInfo';
import SleeperUser from '../../Interfaces/SleeperUser';
import { findUserByRosterId } from '../../Helper Files/HelperMethods';
import sidebetsData from '../../Data/sidebets.json';
import SleeperRoster from '../../Interfaces/SleeperRoster';
import Matchup from '../../Interfaces/Matchup';
import { getLeagueRecordAtSchedule } from '../../Helper Files/RecordCalculations';

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
      if (matchupInfo.week < data.settings.playoff_week_start) {
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
    console.log(orderedSidebets);
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
}

export interface YearSidebet{
  year: string;
  sidebetName: string;
}

export default SidebetMethods;