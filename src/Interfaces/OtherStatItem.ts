// OtherStatItem.ts

import { ComponentType } from 'react';
import LeagueData from './LeagueData'; // Assuming path to your LeagueData interface

// Interface for the props passed to the *nested* statistical components
export interface OtherComponentProps {
    data: LeagueData[]; // The main data prop passed down from the top level
    minYears?: number; // Optional filter for minimum years played
    // You can add more props here if your new stats components need them
}

// Define the structure for an item in your dropdown list/navigation
export interface OtherStatItem {
    displayName: string; // The name shown in the selector
    // ComponentType now uses the correct OtherComponentProps interface
    Component: ComponentType<OtherComponentProps>;
}