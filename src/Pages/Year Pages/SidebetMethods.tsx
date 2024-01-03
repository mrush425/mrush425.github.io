import React from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import SidebetStat from '../../Interfaces/SidebetStat';
import MatchupInfo from '../../Interfaces/MatchupInfo';
import SleeperUser from '../../Interfaces/SleeperUser';
import { findUserByRosterId } from '../../Helper Files/HelperMethods';

class SidebetMethods {
  static Sidebets(): Sidebet[] {
    return [
      new Sidebet("Heartbreaker", "Heartbreaker"),
      new Sidebet("GetWreckd", "Get Wreck'd"),
      new Sidebet("Blackjack", "Blackjack"),
      new Sidebet("MostPointsAgainst", "FS Team"),
      new Sidebet("HelmentMaster", "Helmet Master"),
      new Sidebet("Juggernaut", "Juggernaut"),
      new Sidebet("Waffle", "The Waffle"),
      new Sidebet("BetterLuckyThanGood", "Better Lucky Than Good")
    ];
  }

  static Heartbreaker(data: LeagueData): SidebetStat[] {
    console.log("here");
    let orderedSidebets: SidebetStat[] = [];
    data.users.map((user) => {
      orderedSidebets.push(this.UserHeartbreaker(data,user));
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
          if(matchup.points<opponentMatchup.points){
            const difference = opponentMatchup.points-matchup.points;
            if(difference<heartbreakerTotal){
              week=matchupInfo.week;
              heartbreakerTotal=difference;
              opponent=(findUserByRosterId(opponentMatchup.roster_id,data)?.metadata.team_name || "");
              points=matchup.points;
              opponentPoints = opponentMatchup.points;
            }
          }
        }
      }
    });
    let sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user=user;
    sidebetStat.stat_number=heartbreakerTotal;
    //sidebetStat.stats_display= heartbreakerTotal.toFixed(2)  + " (" + points + " - " + opponentPoints  + ") " + " Week "+ week + " against " + opponent;
    sidebetStat.stats_display = heartbreakerTotal.toFixed(2) + " during week " + week + " by " + opponent + ": " + points + " - " + opponentPoints;

    return sidebetStat;
  }


  static NewStatTemplate(data: LeagueData): SidebetStat[] {
    let orderedSidebets: SidebetStat[] = [];


    return orderedSidebets;
  }
}

export class Sidebet {
  methodName: string;
  displayName: string;
  constructor(methodName: string, displayName: string) {
    this.methodName = methodName;
    this.displayName = displayName;
  }
};


export default SidebetMethods;