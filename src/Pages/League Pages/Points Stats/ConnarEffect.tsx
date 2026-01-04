import React from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import PositionPointsAgainstStats from './PositionPointsAgainstStats';

const ConnarEffect: React.FC<RecordComponentProps & { minYears?: number }> = (props) => {
  return (
    <PositionPointsAgainstStats
      {...props}
      position="QB"
      metricLabel="QB Points Against"
    />
  );
};

export default ConnarEffect;
