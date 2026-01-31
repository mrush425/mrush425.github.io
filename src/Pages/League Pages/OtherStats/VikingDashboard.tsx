import React, { useState } from 'react';
import { OtherComponentProps } from '../../../Interfaces/OtherStatItem';
import LeagueData from '../../../Interfaces/LeagueData';

import CombinedVikingRecords from '../Records Stats/CombinedVikingRecords';
import TopVikingSeasons from '../Records Stats/TopVikingSeasons';

const VikingDashboard: React.FC<OtherComponentProps & { minYears?: number }> = ({ data, minYears = 0 }) => {
  const [mode, setMode] = useState<'combined' | 'top'>('combined');

  return (
    <div className="regular-season-records">
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div className="notImplementedMessage" style={{ textAlign: 'center' }}>
          <b>Scoring:</b> 3 points for wins &lt;1 point difference, 2 points for &lt;5 point difference, 1 point for &lt;10 point difference
        </div>
      </div>

      {/* Toggle header */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div className="toggle-group" style={{ display: 'inline-flex', gap: 16, alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              name="viking-mode"
              value="combined"
              checked={mode === 'combined'}
              onChange={() => setMode('combined')}
            />
            <span>Combined</span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              name="viking-mode"
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
        <CombinedVikingRecords data={data} minYears={minYears} />
      ) : (
        <TopVikingSeasons data={data} minYears={minYears} />
      )}
    </div>
  );
};

export default VikingDashboard;
