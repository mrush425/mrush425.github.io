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
    sidebetStat.stats_display = heartbreakerTotal.toFixed(2) + " during week " + week + " by " + opponent + ": " + points + " - " + opponentPoints;

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

  static Juggernaut(data: LeagueData): SidebetStat[] {
    let orderedSidebets: SidebetStat[] = [];
    data.matchupInfo[data.settings.playoff_week_start + 1].matchups.map((matchup: Matchup) => {
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
      sidebetStat.stats_record = {wins: winsSum, losses: lossesSum, ties: tiesSum};
      sidebetStat.stats_display = sidebetStat.DisplayRecord();
      orderedSidebets.push(sidebetStat);
    });


    orderedSidebets.sort((a, b) => (a.stats_record && b.stats_record) ? a.stats_record.wins - b.stats_record.wins: 1000); //low to high
    return orderedSidebets;
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

export default SidebetMethods;