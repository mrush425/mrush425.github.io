import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import SidebetMethods, { Sidebet } from '../../Helper Files/SidebetMethods';
import SidebetStat from '../../Interfaces/SidebetStat';

import '../../Stylesheets/YearStylesheets/SidebetStats.css';

interface SidebetStatsProps {
  data: LeagueData;
}

const SidebetStats: React.FC<SidebetStatsProps> = ({ data }) => {
  const sidebets = SidebetMethods.Sidebets(); // Assume this provides the list of sidebets

  // Start with the first sidebet preselected
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [sidebetStats, setSidebetStats] = useState<SidebetStat[]>([]);
  const [header, setHeader] = useState<string>(sidebets[0]?.displayName || '');
  const [description, setDescription] = useState<string>(sidebets[0]?.description || '');
  const [isImplemented, setIsImplemented] = useState<boolean>(true);

  // Fetch stats for the initial sidebet
  useEffect(() => {
    const loadInitialSidebet = async () => {
      const initialSidebet = sidebets[0];
      if (initialSidebet) {
        await handleSidebetChange(0); // Load the first sidebet's stats
      }
    };
    loadInitialSidebet();
  }, []);

  const handleSidebetChange = async (index: number) => {
    const sidebet = sidebets[index];
    try {
      const method = (SidebetMethods as any)[sidebet.methodName]?.bind(SidebetMethods);

      if (method) {
        const result = sidebet.isAsync ? await method(data) : method(data);
        setSidebetStats(result || []);
        setIsImplemented(true);
      } else {
        setSidebetStats([]);
        setIsImplemented(false);
      }
    } catch (error) {
      console.error(`Error executing method ${sidebet.methodName}:`, error);
      setSidebetStats([]);
      setIsImplemented(false);
    }

    setHeader(sidebet.displayName);
    setDescription(sidebet.description);
    setActiveIndex(index);
  };

return (
  <div>
    <YearNavBar data={data} />
    <div className="sidebetPicker">
      <button
        className="arrowButton"
        onClick={() => {
          const newIndex = (activeIndex - 1 + sidebets.length) % sidebets.length;
          setActiveIndex(newIndex);
          handleSidebetChange(newIndex);
        }}
      >
        &#x2b05;
      </button>
      <select
        className="sidebetDropdown"
        value={activeIndex}
        onChange={(e) => handleSidebetChange(Number(e.target.value))}
      >
        {sidebets.map((sidebet, index) => (
          <option key={sidebet.methodName} value={index}>
            {sidebet.displayName}
          </option>
        ))}
      </select>
      <button
        className="arrowButton"
        onClick={() => {
          const newIndex = (activeIndex + 1) % sidebets.length;
          setActiveIndex(newIndex);
          handleSidebetChange(newIndex);
        }}
      >
        &#x27a1;
      </button>
    </div>

    <h2>{header + " " + data.season}</h2>
    <div className="sidebetDescription">{description}</div>
    {!isImplemented ? (
      <div className="notImplementedMessage">Stat not implemented</div>
    ) : (
      <table className="statsTable">
        <thead>
          <tr>
            <th>User</th>
            <th>Stat</th>
          </tr>
        </thead>
        <tbody>
        {sidebetStats.map((sidebetStat) => (
      <tr key={sidebetStat.user?.user_id}>
        <td>{sidebetStat.user?.metadata.team_name}</td>
        <td dangerouslySetInnerHTML={{ __html: sidebetStat.stats_display ?? "" }}></td>
      </tr>
    ))}
        </tbody>
      </table>
    )}
  </div>
);

};

export default SidebetStats;
