import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../../Stylesheets/Begin Year Tools Stylesheets/SuperSmashBros.css';
import trollData from '../../Data/trollData.json';
import superSmashData from '../../Data/superSmash.json';
import yearTrollData from '../../Data/yearTrollData.json';
import { SmashCharacter, smashCharacters } from './smashCharacters';

interface Troll {
  'Troll Name': string;
  Nickname: string;
  'Sleeper ID': string;
}

interface MatchSlot {
  trollId: string;
  character: SmashCharacter | null;
  place: string;
}

interface ExportMatchRow {
  name: string;
  round: number;
  position: number;
  pool: string;
  character: string;
  place: string;
}

interface OverallPlaceRow {
  name: string;
  place: string;
}

const allTrolls = trollData as Troll[];
const characterPlaces = superSmashData
  .flatMap((year) => year.data)
  .reduce<Record<string, number[]>>((places, matchup) => {
    if (matchup.Character && typeof matchup.Place === 'number') {
      places[matchup.Character] = [...(places[matchup.Character] ?? []), matchup.Place];
    }
    return places;
  }, {});
const trollPlaces = superSmashData
  .flatMap((year) => year.data)
  .reduce<Record<string, number[]>>((places, matchup) => {
    if (matchup.Player && typeof matchup.Place === 'number') {
      places[matchup.Player] = [...(places[matchup.Player] ?? []), matchup.Place];
    }
    return places;
  }, {});
const positionPlaces = superSmashData
  .flatMap((year) => year.data)
  .reduce<Record<string, number[]>>((places, matchup) => {
    if (typeof matchup.Position === 'number' && typeof matchup.Place === 'number') {
      const position = String(matchup.Position);
      places[position] = [...(places[position] ?? []), matchup.Place];
    }
    return places;
  }, {});
const priorYear = yearTrollData[yearTrollData.length - 1];
const defaultTrollIds = priorYear.data
  .map((troll) => troll.sleeper_id)
  .filter((trollId) => allTrolls.some((troll) => troll['Sleeper ID'] === trollId))
  .slice(0, 12);

const emptySlots = (count: number): MatchSlot[] =>
  Array.from({ length: count }, () => ({ trollId: '', character: null, place: '' }));

const shuffle = <T,>(items: T[]) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
};

const SuperSmashBros: React.FC = () => {
  const [selectedTrollIds, setSelectedTrollIds] = useState(defaultTrollIds);
  const [matches, setMatches] = useState<MatchSlot[][]>([emptySlots(6), emptySlots(6), emptySlots(6), emptySlots(6)]);
  const [isTrollPickerOpen, setIsTrollPickerOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<{ section: number; slot: number } | null>(null);
  const [searchText, setSearchText] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const firstRoundSlots = matches.slice(0, 2).flat();
  const firstRoundComplete = firstRoundSlots.length === 12 && firstRoundSlots.every((slot) => slot.trollId && slot.place);
  const visibleCharacters = smashCharacters.filter((character) =>
    character.name.toLowerCase().includes(searchText.toLowerCase())
  );

  useEffect(() => {
    if (isPickerOpen) {
      searchInputRef.current?.focus();
    }
  }, [isPickerOpen]);

  const toggleTroll = (trollId: string) => {
    setSelectedTrollIds((currentIds) => {
      if (currentIds.includes(trollId)) return currentIds.filter((id) => id !== trollId);
      return currentIds.length < 12 ? [...currentIds, trollId] : currentIds;
    });
  };

  const randomizeMatch = () => {
    if (selectedTrollIds.length !== 12) return;
    const randomized = shuffle(selectedTrollIds);
    setMatches((currentMatches) => [
      randomized.slice(0, 6).map((trollId) => ({ trollId, character: null, place: '' })),
      randomized.slice(6, 12).map((trollId) => ({ trollId, character: null, place: '' })),
      currentMatches[2],
      currentMatches[3],
    ]);
  };

  const randomizeSecondRound = () => {
    if (!firstRoundComplete) return;
    const losers = firstRoundSlots
      .filter((slot) => Number(slot.place) > 3)
      .map((slot) => ({ ...slot, character: null, place: '' }));
    const winners = firstRoundSlots
      .filter((slot) => Number(slot.place) <= 3)
      .map((slot) => ({ ...slot, character: null, place: '' }));
    setMatches((currentMatches) => [
      currentMatches[0],
      currentMatches[1],
      shuffle(losers),
      shuffle(winners),
    ]);
  };

  const openPicker = (section: number, slot: number) => {
    setPickerSlot({ section, slot });
    setSearchText('');
    setIsPickerOpen(true);
  };

  const selectCharacter = (character: SmashCharacter) => {
    if (!pickerSlot) return;
    setMatches((currentMatches) => currentMatches.map((match, sectionIndex) =>
      sectionIndex === pickerSlot.section
        ? match.map((slot, slotIndex) => slotIndex === pickerSlot.slot ? { ...slot, character } : slot)
        : match
    ));
    setIsPickerOpen(false);
    setPickerSlot(null);
  };

  const updatePlace = (section: number, slot: number, place: string) => {
    setMatches((currentMatches) => currentMatches.map((match, sectionIndex) =>
      sectionIndex === section
        ? match.map((matchSlot, slotIndex) => slotIndex === slot ? { ...matchSlot, place } : matchSlot)
        : match
    ));
  };

  const getTroll = (trollId: string) => allTrolls.find((troll) => troll['Sleeper ID'] === trollId);

  const getTrollAverage = (trollId: string) => {
    const troll = getTroll(trollId);
    const places = troll ? trollPlaces[troll['Troll Name']] : undefined;
    if (!places?.length) return '-';
    const average = places.reduce((total, place) => total + place, 0) / places.length;
    return Number.isInteger(average) ? String(average) : average.toFixed(2).replace(/0+$/, '');
  };

  const getPositionAverage = (position: number) => {
    const places = positionPlaces[String(position)];
    if (!places?.length) return '-';
    const average = places.reduce((total, place) => total + place, 0) / places.length;
    return Number.isInteger(average) ? String(average) : average.toFixed(2).replace(/0+$/, '');
  };

  const getMatchExportRows = (): ExportMatchRow[] => matches.flatMap((match, sectionIndex) => {
    const round = sectionIndex < 2 ? 1 : 2;
    const pool = ['A', 'B', 'L', 'W'][sectionIndex];
    return match
      .filter((slot) => slot.trollId)
      .map((slot, slotIndex) => ({
        name: getTroll(slot.trollId)?.['Troll Name'] ?? '---',
        round,
        position: slotIndex + 1,
        pool,
        character: slot.character?.name ?? '---',
        place: slot.place || '---',
      }));
  });

  const getOverallPlaceRows = (): OverallPlaceRow[] => {
    const winners = matches[3]
      .filter((slot) => slot.trollId && slot.place)
      .sort((first, second) => Number(first.place) - Number(second.place))
      .map((slot, index) => ({ name: getTroll(slot.trollId)?.['Troll Name'] ?? '---', place: String(index + 1) }));
    const losers = matches[2]
      .filter((slot) => slot.trollId && slot.place)
      .sort((first, second) => Number(first.place) - Number(second.place))
      .map((slot, index) => ({ name: getTroll(slot.trollId)?.['Troll Name'] ?? '---', place: String(index + 7) }));
    return [...winners, ...losers].sort((first, second) => first.name.localeCompare(second.name));
  };

  const getCharacterAverage = (characterName: string) => {
    const places = characterPlaces[characterName];
    if (!places?.length) return '-';
    const average = places.reduce((total, place) => total + place, 0) / places.length;
    return Number.isInteger(average) ? String(average) : average.toFixed(2).replace(/0+$/, '');
  };

  const getCharacterUseCount = (characterName: string) => characterPlaces[characterName]?.length ?? 0;

  return (
    <main className="begin-year-tools-page super-smash-bros-page">
      <section className="smash-match-controls" aria-label="Match participants">
        <span className="smash-troll-selector-label">Trolls in this year</span>
        <div className="smash-troll-picker">
          <button type="button" className="smash-troll-picker-button" onClick={() => setIsTrollPickerOpen((isOpen) => !isOpen)}>
            Select trolls ({selectedTrollIds.length}/12)
          </button>
          {isTrollPickerOpen && (
            <div className="smash-troll-picker-popup">
              {allTrolls.map((troll) => (
                <label key={troll['Sleeper ID']}>
                  <input
                    type="checkbox"
                    checked={selectedTrollIds.includes(troll['Sleeper ID'])}
                    onChange={() => toggleTroll(troll['Sleeper ID'])}
                  />
                  {troll['Troll Name']}
                </label>
              ))}
              <button type="button" onClick={() => setIsTrollPickerOpen(false)}>Done</button>
            </div>
          )}
        </div>
        <button type="button" className="smash-randomize-button" disabled={selectedTrollIds.length !== 12} onClick={randomizeMatch}>Randomize 1st round</button>
        <button type="button" className="smash-export-button" onClick={() => setIsExportOpen(true)}>Export</button>
      </section>

      <div className="smash-match-grid">
        {matches.map((match, sectionIndex) => (
          <React.Fragment key={sectionIndex}>
          <section className="smash-match-section" aria-label={`Match section ${sectionIndex + 1}`}>
            <h2>{sectionIndex === 2 ? 'Losers' : sectionIndex === 3 ? 'Winners' : `Match ${sectionIndex + 1}`}</h2>
            <div className="smash-match-slots">
              {match.map((slot, slotIndex) => (
                <article className="smash-match-slot" key={slotIndex}>
                  <span className="smash-cpu-label">CPU {slotIndex + 1} ({getPositionAverage(slotIndex + 1)})</span>
                  <button type="button" className="smash-fighter-box" onClick={() => openPicker(sectionIndex, slotIndex)}>
                    {slot.character ? <img src={slot.character.image} alt={slot.character.name} /> : <span aria-hidden="true" />}
                  </button>
                  <span className="smash-character-name">
                    {slot.character ? `${slot.character.name} (${getCharacterAverage(slot.character.name)}, x${getCharacterUseCount(slot.character.name)})` : '---'}
                  </span>
                  <strong>{getTroll(slot.trollId)?.Nickname ?? '---'} ({getTrollAverage(slot.trollId)})</strong>
                  <label>Place<select value={slot.place} onChange={(event) => updatePlace(sectionIndex, slotIndex, event.target.value)}><option value="">---</option>{Array.from({ length: 6 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
                </article>
              ))}
            </div>
          </section>
          {sectionIndex === 1 && (
            <button
              type="button"
              className="smash-randomize-button"
              disabled={!firstRoundComplete}
              onClick={randomizeSecondRound}
            >
              Randomize 2nd round
            </button>
          )}
          </React.Fragment>
        ))}
      </div>

      {isPickerOpen && createPortal(
        <div className="smash-picker-overlay" role="presentation" onMouseDown={() => setIsPickerOpen(false)}>
          <section className="smash-picker-modal" role="dialog" aria-modal="true" aria-labelledby="smash-picker-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="smash-picker-header"><h2 id="smash-picker-title">Choose your character</h2><button type="button" className="smash-picker-close" onClick={() => setIsPickerOpen(false)}>Close</button></header>
            <input ref={searchInputRef} className="smash-character-search" aria-label="Search characters" placeholder="Search characters" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
            <div className="smash-character-grid">
              {visibleCharacters.map((character) => <article className="smash-character-card" key={character.name}><img src={character.image} alt={character.name} /><h3>{character.name}</h3><button type="button" onClick={() => selectCharacter(character)}>Select</button></article>)}
            </div>
          </section>
        </div>,
        document.body
      )}

      {isExportOpen && createPortal(
        <div className="smash-export-overlay" role="presentation" onMouseDown={() => setIsExportOpen(false)}>
          <section className="smash-export-modal" role="dialog" aria-modal="true" aria-labelledby="smash-export-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="smash-export-header">
              <h2 id="smash-export-title">Super Smash Bros. Export</h2>
              <button type="button" onClick={() => setIsExportOpen(false)}>Close</button>
            </header>
            <h3>Match Results</h3>
            <div className="smash-export-table-scroll">
              <table>
                <thead><tr><th>Name</th><th>Round</th><th>Position</th><th>Pool</th><th>Character</th><th>Place</th></tr></thead>
                <tbody>
                  {getMatchExportRows().map((row, index) => <tr key={`${row.pool}-${row.position}-${index}`}><td>{row.name}</td><td>{row.round}</td><td>{row.position}</td><td>{row.pool}</td><td>{row.character}</td><td>{row.place}</td></tr>)}
                </tbody>
              </table>
            </div>
            <h3>Overall Places</h3>
            <div className="smash-export-table-scroll smash-overall-place-table">
              <table>
                <thead><tr><th>Troll Name</th><th>Overall Place</th></tr></thead>
                <tbody>
                  {getOverallPlaceRows().map((row) => <tr key={row.name}><td>{row.name}</td><td>{row.place}</td></tr>)}
                </tbody>
              </table>
            </div>
          </section>
        </div>,
        document.body
      )}
    </main>
  );
};

export default SuperSmashBros;
