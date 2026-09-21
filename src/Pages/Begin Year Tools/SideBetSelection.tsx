import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import sidebetsData from '../../Data/sidebets.json';
import trollData from '../../Data/trollData.json';
import yearTrollData from '../../Data/yearTrollData.json';
import '../../Stylesheets/Begin Year Tools Stylesheets/SideBetSelection.css';

interface Sidebet {
  methodName: string;
  displayName: string;
  description: string;
  independentOf: string[];
  retired: boolean;
}

interface Sponsor {
  player_name: string;
  place: number;
  sleeper_id: string;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

interface ExportRow {
  year: number;
  name: string;
  sidebet: string;
}

const SideBetSelection: React.FC = () => {
  const [selectedSidebets, setSelectedSidebets] = useState<string[]>(Array(12).fill(''));
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const dropdownToggleRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const availableSidebets = (sidebetsData as Sidebet[]).filter((sidebet) => !sidebet.retired);
  const mostRecentCompletedYear = yearTrollData
    .filter(
      (year) =>
        year.data.length >= 12 &&
        year.data.every((sponsor: Sponsor) => Number.isInteger(sponsor.place) && sponsor.place > 0)
    )
    .reduce((latestYear, year) => (year.year > latestYear.year ? year : latestYear));
  const sponsors = mostRecentCompletedYear.data
    .slice()
    .sort((first: Sponsor, second: Sponsor) => first.place - second.place)
    .slice(0, 12) as Sponsor[];
  const sponsorNicknames = new Map(trollData.map((troll) => [troll['Sleeper ID'], troll.Nickname]));
  const selectedMethodNames = new Set(selectedSidebets.filter(Boolean));
  const exportRows: ExportRow[] = sponsors.flatMap((sponsor, index) => {
    const sidebet = availableSidebets.find((item) => item.methodName === selectedSidebets[index]);
    return sidebet
      ? [{ year: new Date().getFullYear(), name: sponsor.player_name, sidebet: sidebet.displayName }]
      : [];
  });

  const handleSidebetChange = (rowIndex: number, methodName: string) => {
    setSelectedSidebets((currentSelections) =>
      currentSelections.map((selection, index) => (index === rowIndex ? methodName : selection))
    );
    setOpenDropdownIndex(null);
    setDropdownPosition(null);
  };

  const isUnavailable = (sidebet: Sidebet) => {
    if (selectedMethodNames.has(sidebet.methodName)) return true;

    return availableSidebets.some(
      (selectedSidebet) =>
        selectedMethodNames.has(selectedSidebet.methodName) &&
        (selectedSidebet.independentOf.includes(sidebet.methodName) ||
          sidebet.independentOf.includes(selectedSidebet.methodName))
    );
  };

  useEffect(() => {
    if (openDropdownIndex === null) return;

    const closeMenuWhenClickingOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const openDropdownToggle = dropdownToggleRefs.current[openDropdownIndex];

      if (!dropdownMenuRef.current?.contains(target) && !openDropdownToggle?.contains(target)) {
        setOpenDropdownIndex(null);
        setDropdownPosition(null);
      }
    };

    document.addEventListener('mousedown', closeMenuWhenClickingOutside);
    return () => document.removeEventListener('mousedown', closeMenuWhenClickingOutside);
  }, [openDropdownIndex]);

  return (
    <main className="begin-year-tools-page sidebet-selection-page">
      <div className="sidebet-selection-layout">
        <section className="sidebet-selection-panel" aria-label="Select side bets">
          <div className="sidebet-table-scroll">
            <table className="sidebet-selection-table">
              <thead>
                <tr>
                  <th>Sponsor</th>
                  <th>Sidebet</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, index) => {
                  const sponsor = sponsors[index];
                  const selectedSidebet = selectedSidebets[index];
                  const sponsorName = sponsor
                    ? sponsorNicknames.get(sponsor.sleeper_id) ?? sponsor.player_name
                    : `Final Place #${index + 1}`;

                  return (
                    <tr key={index}>
                      <td>{sponsor ? `#${sponsor.place} ${sponsorName}` : sponsorName}</td>
                      <td className="sidebet-dropdown-cell">
                        <button
                          type="button"
                          className={`sidebet-dropdown-toggle${selectedSidebet ? '' : ' sidebet-dropdown-placeholder'}`}
                          aria-label={`Sidebet for ${sponsorName}`}
                          aria-expanded={openDropdownIndex === index}
                          aria-haspopup="listbox"
                          ref={(element) => {
                            dropdownToggleRefs.current[index] = element;
                          }}
                          onClick={(event) => {
                            if (openDropdownIndex === index) {
                              setOpenDropdownIndex(null);
                              setDropdownPosition(null);
                              return;
                            }

                            const buttonBounds = event.currentTarget.getBoundingClientRect();
                            setDropdownPosition({
                              top: buttonBounds.bottom + 4,
                              left: buttonBounds.left,
                              width: buttonBounds.width,
                            });
                            setOpenDropdownIndex(index);
                          }}
                        >
                          {availableSidebets.find((sidebet) => sidebet.methodName === selectedSidebet)?.displayName ?? 'Select a sidebet'}
                        </button>
                        {openDropdownIndex === index &&
                          dropdownPosition &&
                          createPortal(
                          <div
                            className="sidebet-dropdown-menu"
                            role="listbox"
                            ref={dropdownMenuRef}
                            style={{
                              top: dropdownPosition.top,
                              left: dropdownPosition.left,
                              width: Math.max(dropdownPosition.width, 420),
                            }}
                          >
                            <button
                              type="button"
                              className="sidebet-dropdown-item"
                              onClick={() => handleSidebetChange(index, '')}
                            >
                              Select a sidebet
                            </button>
                            {availableSidebets
                              .filter(
                                (sidebet) =>
                                  sidebet.methodName === selectedSidebet ||
                                  !isUnavailable(sidebet)
                              )
                              .map((sidebet) => (
                                <button
                                  key={sidebet.methodName}
                                  type="button"
                                  className="sidebet-dropdown-item"
                                  onClick={() => handleSidebetChange(index, sidebet.methodName)}
                                >
                                  {sidebet.displayName}
                                </button>
                              ))}
                          </div>,
                          document.body
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="sidebet-selection-actions">
            <button type="button" className="sidebet-export-button" onClick={() => setIsExportOpen(true)}>
              Export Selection
            </button>
          </div>
        </section>

        <section className="sidebet-selection-panel" aria-label="Available side bets">
          <div className="sidebet-table-scroll">
            <table className="sidebet-catalog-table">
              <thead>
                <tr>
                  <th>Sidebet</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {availableSidebets.filter((sidebet) => !isUnavailable(sidebet)).map((sidebet) => (
                  <tr key={sidebet.methodName}>
                    <td>{sidebet.displayName}</td>
                    <td>{sidebet.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {isExportOpen &&
        createPortal(
          <div className="sidebet-export-overlay" role="presentation" onMouseDown={() => setIsExportOpen(false)}>
            <section
              className="sidebet-export-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="sidebet-export-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="sidebet-export-modal-header">
                <h2 id="sidebet-export-title">Export Preview</h2>
                <button type="button" className="sidebet-export-close" onClick={() => setIsExportOpen(false)}>
                  Close
                </button>
              </div>
              {exportRows.length > 0 ? (
                <div className="sidebet-export-table-scroll">
                  <table className="sidebet-export-table">
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Sidebet</th>
                        <th>Sponsor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exportRows.map((row) => (
                        <tr key={row.name}>
                          <td>{row.year}</td>
                          <td>{row.sidebet}</td>
                          <td>{row.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="sidebet-export-empty">Select at least one sidebet to populate the export.</p>
              )}
            </section>
          </div>,
          document.body
        )}
    </main>
  );
};

export default SideBetSelection;