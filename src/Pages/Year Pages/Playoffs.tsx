import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import SleeperUser from '../../Interfaces/SleeperUser';
import YearNavBar from '../../Navigation/YearNavBar';
import playoffData from '../../Data/playoffs.json'; // Import your trollData.json
import '../../Stylesheets/Year Stylesheets/Playoffs.css';
import PlayoffData, { PlayoffMatchup } from '../../Interfaces/PlayoffData';
import { getScoreStringForWeek } from '../../Helper Files/HelperMethods';


interface PlayoffsProps {
  data: LeagueData;
}


const Playoffs: React.FC<PlayoffsProps> = ({ data }) => {

  const selectedSeasonData: PlayoffData | undefined = playoffData.find(d => d['year'] === data.season)

  const getPlayerInfoForId = (matchupId: string) => {
    const playoffStart = data.settings.playoff_week_start;
    const matchup: PlayoffMatchup | undefined = selectedSeasonData?.playoffMatchups.find(
      (matchup) => matchup.matchupId === matchupId
    );

    if (matchup) {
      // Do something with the found matchup
      const user = data.users.find(u => u.user_id === matchup.user_id);
      if (user) {
        switch (matchupId) {
          //First round people and scores
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9":
          case "10":
          case "11":
          case "12":
            return user.metadata.team_name + " - " + getScoreStringForWeek(user, playoffStart,data);
            break;
          //Second round people and scores
          case "13":
          case "14":
          case "15":
          case "16":
          case "19":
          case "20":
          case "21":
          case "22":
            return user.metadata.team_name + " - " + getScoreStringForWeek(user, playoffStart+1,data);
            break;
          //Koozie Bowl and Butler Bowl combined scores
          case "17":
          case "18":
          case "23":
          case "24":
            let combinedScore=getScoreStringForWeek(user, playoffStart+1,data);
            combinedScore+=getScoreStringForWeek(user, playoffStart+2,data);
            return user.metadata.team_name + " - " + combinedScore;
            break;

          //Championship round people and scores
          case "25":
          case "26":
          case "27":
          case "28":
          case "31":
          case "32":
          case "33":
          case "34":
            return user.metadata.team_name + " " + getScoreStringForWeek(user, playoffStart+2,data);
            break;

          //Pass to get the string for both weeks of the combined bowls
          case "29":
          case "30":
          case "35":
          case "36":
            return "W"+(playoffStart+1)+": "+getScoreStringForWeek(user, playoffStart+1,data) + " - W"+(playoffStart+2)+": "+getScoreStringForWeek(user, playoffStart+2,data);
            break;
        }
        return user.display_name;
      }
      else {
        return "invalid user";
      }
    } else {
      // Handle case when matchup is not found
      return `Matchup with ID ${matchupId} not found.`;
    }
  };


  // Separate method to generate the table
  const generateTable = () => {
    if (!selectedSeasonData) {
      return <div>No playoff data available for the selected season.</div>;
    }

    return (
      <table className='PlayoffTable'>
        <tbody>
          <tr>
            <td key="1" height={"40px"} style={{fontSize: 18}}>Winners Bracket</td>
            <td key="2"></td>
            <td key="3"></td>
            <td key="4" width={"200px"}></td>
            <td key="5"></td>
            <td key="6" style={{fontSize: 18}}>Losers Bracket</td>
            <td key="7"></td>
            <td key="8"></td>
          </tr>
          <tr key="1">
            <td key="1">{getPlayerInfoForId("1")}</td>
            <td key="2"></td>
            <td key="3"></td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6">{getPlayerInfoForId("7")}</td>
            <td key="7"></td>
            <td key="8"></td>
          </tr>
          <tr key="2">
            <td key="1" style={{borderRight: '1px solid', borderTop: '1px solid'}}></td>
            <td key="2">{getPlayerInfoForId("13")}</td>
            <td key="3"></td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6" style={{borderRight: '1px solid', borderTop: '1px solid'}}></td>
            <td key="7">{getPlayerInfoForId("19")}</td>
            <td key="8"></td>
          </tr>
          <tr key="3">
            <td key="1" style={{borderRight: '1px solid', borderBottom: '1px solid'}}>Bye</td>
            <td key="2" style={{borderRight: '1px solid', borderTop: '1px solid'}}></td>
            <td key="3"></td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6" style={{borderRight: '1px solid', borderBottom: '1px solid'}}>Bye</td>
            <td key="7" style={{borderRight: '1px solid', borderTop: '1px solid'}}></td>
            <td key="8"></td>
          </tr>
          <tr key="4">
            <td key="1"></td>
            <td key="2" style={{borderRight: '1px solid'}}></td>
            <td key="3">{getPlayerInfoForId("25")}</td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6"></td>
            <td key="7" style={{borderRight: '1px solid'}}></td>
            <td key="8">{getPlayerInfoForId("31")}</td>
          </tr>
          <tr key="5">
            <td key="1">{getPlayerInfoForId("2")}</td>
            <td key="2" style={{borderRight: '1px solid'}}></td>
            <td key="3" style={{borderRight: '1px solid', borderTop: '1px solid'}}></td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6">{getPlayerInfoForId("8")}</td>
            <td key="7" style={{borderRight: '1px solid'}}></td>
            <td key="8" style={{borderRight: '1px solid', borderTop: '1px solid'}}></td>
          </tr>
          <tr key="6">
            <td key="1" style={{borderRight: '1px solid', borderTop: '1px solid'}}></td>
            <td key="2" style={{borderRight: '1px solid', borderBottom: '1px solid'}}>{getPlayerInfoForId("14")}</td>
            <td key="3" style={{borderRight: '1px solid'}}></td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6" style={{borderRight: '1px solid', borderTop: '1px solid'}}></td>
            <td key="7" style={{borderRight: '1px solid', borderBottom: '1px solid'}}>{getPlayerInfoForId("20")}</td>
            <td key="8" style={{borderRight: '1px solid'}}></td>
          </tr>
          <tr key="7">
            <td key="1" style={{borderRight: '1px solid', borderBottom: '1px solid'}}>{getPlayerInfoForId("3")}</td>
            <td key="2"></td>
            <td key="3" style={{borderRight: '1px solid'}}></td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6" style={{borderRight: '1px solid', borderBottom: '1px solid'}}>{getPlayerInfoForId("9")}</td>
            <td key="7"></td>
            <td key="8" style={{borderRight: '1px solid'}}></td>
          </tr>
          <tr key="8">
            <td key="1"></td>
            <td key="2"></td>
            <td key="3" style={{borderRight: '1px solid'}}>	&#127942; Troll Bowl 	&#127942;</td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6"></td>
            <td key="7"></td>
            <td key="8" style={{borderRight: '1px solid'}}> &#128701; Toilet Bowl &#128701;</td>
          </tr>
          <tr key="9">
            <td key="1">{getPlayerInfoForId("4")}</td>
            <td key="2"></td>
            <td key="3" style={{borderRight: '1px solid'}}></td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6">{getPlayerInfoForId("10")}</td>
            <td key="7"></td>
            <td key="8" style={{borderRight: '1px solid'}}></td>
          </tr>
          <tr key="10">
            <td key="1" style={{borderRight: '1px solid', borderTop: '1px solid'}}></td>
            <td key="2">{getPlayerInfoForId("15")}</td>
            <td key="3" style={{borderRight: '1px solid'}}></td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6" style={{borderRight: '1px solid', borderTop: '1px solid'}}></td>
            <td key="7">{getPlayerInfoForId("21")}</td>
            <td key="8" style={{borderRight: '1px solid'}}></td>
          </tr>
          <tr key="11">
            <td key="1" style={{borderRight: '1px solid', borderBottom: '1px solid'}}>Bye</td>
            <td key="2" style={{borderRight: '1px solid', borderTop: '1px solid'}}></td>
            <td key="3" style={{borderRight: '1px solid'}}></td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6" style={{borderRight: '1px solid', borderBottom: '1px solid'}}>Bye</td>
            <td key="7" style={{borderRight: '1px solid', borderTop: '1px solid'}}></td>
            <td key="8" style={{borderRight: '1px solid'}}></td>
          </tr>
          <tr key="12">
            <td key="1"></td>
            <td key="2" style={{borderRight: '1px solid'}}></td>
            <td key="3" style={{borderRight: '1px solid', borderBottom: '1px solid'}}>{getPlayerInfoForId("26")}</td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6"></td>
            <td key="7" style={{borderRight: '1px solid'}}></td>
            <td key="8" style={{borderRight: '1px solid', borderBottom: '1px solid'}}>{getPlayerInfoForId("32")}</td>
          </tr>
          <tr key="13">
            <td key="1">{getPlayerInfoForId("5")}</td>
            <td key="2" style={{borderRight: '1px solid'}}></td>
            <td key="3"></td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6">{getPlayerInfoForId("11")}</td>
            <td key="7" style={{borderRight: '1px solid'}}></td>
            <td key="8"></td>
          </tr>
          <tr key="14">
            <td key="1" style={{borderRight: '1px solid', borderTop: '1px solid'}}></td>
            <td key="2" style={{borderRight: '1px solid', borderBottom: '1px solid'}}>{getPlayerInfoForId("16")}</td>
            <td key="3"></td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6" style={{borderRight: '1px solid', borderTop: '1px solid'}}></td>
            <td key="7" style={{borderRight: '1px solid', borderBottom: '1px solid'}}>{getPlayerInfoForId("22")}</td>
            <td key="8"></td>
          </tr>
          <tr key="15">
            <td key="1" style={{borderRight: '1px solid', borderBottom: '1px solid'}}>{getPlayerInfoForId("6")}</td>
            <td key="2"></td>
            <td key="3"></td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6" style={{borderRight: '1px solid', borderBottom: '1px solid'}}>{getPlayerInfoForId("12")}</td>
            <td key="7"></td>
            <td key="8"></td>
          </tr>
          <tr key="16">
            <td key="1"></td>
            <td key="2" style={{borderBottom: '1px solid'}}>Koozie Bowl</td>
            <td key="3" style={{borderBottom: '1px solid'}}>Bengal Bowl</td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6"></td>
            <td key="7" style={{borderBottom: '1px solid'}}>Butler Bowl</td>
            <td key="8" style={{borderBottom: '1px solid'}}>Diarrhea Bowl</td>
          </tr>
          <tr key="17">
            <td key="1"></td>
            <td key="2" style={{borderLeft: '1px solid',borderRight: '1px solid'}}>{getPlayerInfoForId("17")}</td>
            <td key="3" style={{borderLeft: '1px solid',borderRight: '1px solid'}}>{getPlayerInfoForId("27")}</td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6"></td>
            <td key="7" style={{borderLeft: '1px solid',borderRight: '1px solid'}}>{getPlayerInfoForId("23")}</td>
            <td key="8" style={{borderLeft: '1px solid',borderRight: '1px solid'}}>{getPlayerInfoForId("33")}</td>
          </tr>
          <tr key="18">
            <td key="1"></td>
            <td key="2" style={{borderLeft: '1px solid',borderRight: '1px solid'}}>{getPlayerInfoForId("29")}</td>
            <td key="3" style={{borderLeft: '1px solid',borderRight: '1px solid'}}></td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6"></td>
            <td key="7" style={{borderLeft: '1px solid',borderRight: '1px solid'}}>{getPlayerInfoForId("35")}</td>
            <td key="8" style={{borderLeft: '1px solid',borderRight: '1px solid'}}></td>
          </tr>
          <tr key="19">
            <td key="1"></td>
            <td key="2" style={{borderLeft: '1px solid',borderRight: '1px solid'}}>{getPlayerInfoForId("18")}</td>
            <td key="3" style={{borderLeft: '1px solid',borderRight: '1px solid'}}>{getPlayerInfoForId("28")}</td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6"></td>
            <td key="7" style={{borderLeft: '1px solid',borderRight: '1px solid'}}>{getPlayerInfoForId("24")}</td>
            <td key="8" style={{borderLeft: '1px solid',borderRight: '1px solid'}}>{getPlayerInfoForId("34")}</td>
          </tr>
          <tr key="20">
            <td key="1"></td>
            <td key="2" style={{borderLeft: '1px solid',borderRight: '1px solid', borderBottom:'1px solid'}}>{getPlayerInfoForId("30")}</td>
            <td key="3" style={{borderLeft: '1px solid',borderRight: '1px solid', borderBottom:'1px solid'}}></td>
            <td key="4"></td>
            <td key="5"></td>
            <td key="6"></td>
            <td key="7" style={{borderLeft: '1px solid',borderRight: '1px solid', borderBottom:'1px solid'}}>{getPlayerInfoForId("36")}</td>
            <td key="8" style={{borderLeft: '1px solid',borderRight: '1px solid', borderBottom:'1px solid'}}></td>
          </tr>
        </tbody>
      </table>
    );
  };


  return (
    <div>
      <YearNavBar data={data} />
      <div className='TableDiv'>
        {generateTable()}
      </div>
    </div>
  );
};

export default Playoffs;