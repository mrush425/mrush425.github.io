import React, { useState } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import LeagueData from '../../../Interfaces/LeagueData';

// Import your two existing components (adjust paths if needed)
import WaffleRecords from './CombinedWaffleRecords';
import TopWaffleSeasons from './TopWaffleRecords';

// Simple toggle wrapper with two radio buttons to switch views
const WaffleDashboard: React.FC<RecordComponentProps & { minYears?: number }> = ({ data, minYears = 0 }) => {
  const [mode, setMode] = useState<'combined' | 'top'>('combined');

  return (
    <div className="regular-season-records">
      {/* Toggle header */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div className="toggle-group" style={{ display: 'inline-flex', gap: 16, alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              name="waffle-mode"
              value="combined"
              checked={mode === 'combined'}
              onChange={() => setMode('combined')}
            />
            <span>Combined</span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              name="waffle-mode"
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
        <WaffleRecords data={data} minYears={minYears} />
      ) : (
        <TopWaffleSeasons data={data} minYears={minYears} />
      )}
    </div>
  );
};

export default WaffleDashboard;
