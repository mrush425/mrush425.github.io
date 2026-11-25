import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import archivedLeagueData from '../../Data/Sleeper Data';
import YearData from './YearData';

jest.mock('../../Navigation/YearNavBar', () => () => null);
jest.mock('../../Data/yearSidebets.json', () => [
    { year: 2025, data: [
        { sidebetName: 'The Belt' },
        { sidebetName: 'Tied Award' },
        { sidebetName: 'Pending Award' },
    ] },
]);
jest.mock('../../Helper Files/SidebetMethods', () => ({
    __esModule: true,
    default: {
        Sidebets: () => [
            { displayName: 'The Belt', methodName: 'belt' },
            { displayName: 'Tied Award', methodName: 'tied' },
            { displayName: 'Pending Award', methodName: 'pending' },
        ],
        belt: () => [{ user: { metadata: { team_name: 'Belt Holder' } }, stats_display: 'Week 1: a matchup' }],
        tied: () => [
            { user: { metadata: { team_name: 'First Winner' } }, stats_display: '12 points', stat_number: 12 },
            { user: { metadata: { team_name: 'Second Winner' } }, stats_display: '12 points', stat_number: 12 },
        ],
        pending: () => [],
    },
}));

test('shows sidebet awards separately from the stats, including ties and Belt history', async () => {
    render(<YearData data={archivedLeagueData[0]} />);

    expect(screen.getByRole('button', { name: 'Basic' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sidebets' })).not.toBeInTheDocument();

    const awards = await screen.findByRole('region', { name: 'Sidebets' });
    expect(awards.compareDocumentPosition(screen.getByRole('heading', { name: 'Team statistics' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(awards).getByText('First Winner')).toBeInTheDocument();
    expect(within(awards).getByText('Second Winner')).toBeInTheDocument();
    expect(within(awards).getByText('To be decided')).toBeInTheDocument();

    const history = within(awards).getByText('View Belt history');
    const details = history.closest('details');
    expect(details).not.toHaveAttribute('open');
    fireEvent.click(history);
    expect(details).toHaveAttribute('open');
    expect(within(awards).getByText('Week 1: a matchup')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(screen.getByText('vs Everyone')).toBeInTheDocument();
    expect(within(awards).getByText('Belt Holder')).toBeInTheDocument();
});
