import React from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import PositionPointsAgainstStats from './PositionPointsAgainstStats';

const KickedInDaBallz: React.FC<RecordComponentProps & { minYears?: number }> = (props) => {
  return (
    <PositionPointsAgainstStats
      {...props}
      position="K"
      metricLabel="Kicker Points Against"
    />
  );
};

export default KickedInDaBallz;
