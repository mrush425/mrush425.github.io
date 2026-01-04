import React from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import PositionPointsAgainstStats from './PositionPointsAgainstStats';

const ReceivingLosses: React.FC<RecordComponentProps & { minYears?: number }> = (props) => {
  return (
    <PositionPointsAgainstStats
      {...props}
      position="WR"
      metricLabel="WR Points Against"
    />
  );
};

export default ReceivingLosses;
