import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { getLeagueData } from '../SleeperApiMethods';
import archivedLeagueData from '../Data/Sleeper Data';
import LeagueData from '../Interfaces/LeagueData';
import App from './App';

jest.mock('../SleeperApiMethods', () => ({
  getLeagueData: jest.fn(),
}));

jest.mock('../Navigation/WebsiteNavbar', () => () => null);
jest.mock('./Year Pages/YearData', () => () => <div>Year page loaded</div>);

const mockedGetLeagueData = getLeagueData as jest.MockedFunction<typeof getLeagueData>;

beforeEach(() => {
  mockedGetLeagueData.mockReset();
  window.history.pushState({}, '', '/');
});

test('loads data before rendering a directly requested year page', async () => {
  let resolveLeagueData: (data: LeagueData[]) => void = () => {};
  mockedGetLeagueData.mockReturnValue(new Promise((resolve) => {
    resolveLeagueData = resolve;
  }));
  window.history.pushState({}, '', '/season/2025');

  render(<App />);

  expect(screen.getByText('Loading League Data...')).toBeInTheDocument();

  await act(async () => {
    resolveLeagueData(archivedLeagueData);
    await Promise.resolve();
  });

  expect(await screen.findByText('Year page loaded')).toBeInTheDocument();
  expect(window.location.pathname).toBe(`/season/${archivedLeagueData[0].season}`);
});

test('shows a retry action when loading fails', async () => {
  mockedGetLeagueData
    .mockRejectedValueOnce(new Error('Network unavailable'))
    .mockResolvedValueOnce([]);

  render(<App />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findByText('League of the Trolls Home Page')).toBeInTheDocument();
  expect(mockedGetLeagueData).toHaveBeenCalledTimes(2);
});
