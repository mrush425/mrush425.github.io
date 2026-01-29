import React, { useState } from 'react';
import { OtherComponentProps } from '../../../Interfaces/OtherStatItem';
import LeagueData from '../../../Interfaces/LeagueData';

import CombinedChargerRecords from '../Records Stats/CombinedChargerRecords';
import TopChargerSeasons from '../Records Stats/TopChargerSeasons';

const ChargerDashboard: React.FC<OtherComponentProps & { minYears?: number }> = ({ data, minYears = 0 }) => {
  const [mode, setMode] = useState<'combined' | 'top'>('combined');

  return (
    <div className="regular-season-records">
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>The Charger</h2>
        <div className="notImplementedMessage" style={{ textAlign: 'center' }}>
          <b>Scoring:</b> 3 points for losses &lt;1 point difference, 2 points for &lt;5 point difference, 1 point for &lt;10 point difference
        </div>
      </div>

      {/* Toggle header */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div className="toggle-group" style={{ display: 'inline-flex', gap: 16, alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              name="charger-mode"
              value="combined"
              checked={mode === 'combined'}
              onChange={() => setMode('combined')}
            />
            <span>Combined</span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              name="charger-mode"
              value="top"
              checked={mode === 'top'}
              onChange={() => setMode('top')}
            />
            <span>Top</span>
          </label>
        </div>
      </div>

      {/* View container */}
      {mode === 'combined' ? (
        <CombinedChargerRecords data={data} minYears={minYears} />
      ) : (
        <TopChargerSeasons data={data} minYears={minYears} />
      )}
    </div>
  );
};

export default ChargerDashboard;
