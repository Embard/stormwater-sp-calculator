import { useMemo, useState } from 'react';
import type { PlaceMatch } from '../types';
import { searchLocalPlaces } from '../utils/geocoder';

type Props = {
  value: PlaceMatch;
  onSelect: (place: PlaceMatch) => void;
};

export function PlaceSearch({ value, onSelect }: Props) {
  const [query, setQuery] = useState(`${value.name} ${value.region}`);
  const matches = useMemo(() => searchLocalPlaces(query), [query]);
  const shownMatches = matches.slice(0, 3);

  return (
    <div className="place-search">
      <label className="field compact-field">
        <span className="field-label">Населенный пункт, район, область</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Например: Козенки Московская область" />
      </label>

      <div className="selected-place">
        <strong>{value.name}</strong>
        <span>{value.region}{value.district ? `, ${value.district}` : ''}</span>
        <small>{value.source === 'local' ? 'локальная база' : value.source}, уверенность {Math.round(value.confidence * 100)}%</small>
      </div>

      <div className="matches compact-matches">
        {shownMatches.length > 0 ? (
          shownMatches.map((match) => (
            <button
              key={match.id}
              className={`match ${match.id === value.id ? 'is-selected' : ''}`}
              onClick={() => onSelect(match)}
              type="button"
            >
              <strong>{match.name}</strong>
              <span>{match.region}{match.district ? `, ${match.district}` : ''}</span>
            </button>
          ))
        ) : (
          <p className="muted compact-note">В локальной базе совпадений нет. Следующий этап — геокодер или выбор точки на карте.</p>
        )}
      </div>
    </div>
  );
}
