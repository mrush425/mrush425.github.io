import React from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import PositionPointsAgainstStats from './PositionPointsAgainstStats';

const BlueBalls: React.FC<RecordComponentProps & { minYears?: number }> = (props) => {
  return (
    <PositionPointsAgainstStats
      {...props}
      position="DEF"
      metricLabel="DEF Points Against"
    />
  );
};

export default BlueBalls;
