import { useMemo, useState } from 'react';
import type { PlaceMatch } from '../types';
import { searchLocalPlaces } from '../utils/geocoder';

type Props = {
  value: PlaceMatch;
  onSelect: (place: PlaceMatch) => void;
};

export function PlaceSearch({ value, onSelect }: Props) {
  const [query, setQuery] = useState(`${value.name} ${value.region}`);
  const [showMatches, setShowMatches] = useState(false);
  const matches = useMemo(() => searchLocalPlaces(query), [query]);
  const alternativeMatches = matches.filter((match) => match.id !== value.id).slice(0, 3);

  return (
    <div className="place-search">
      <label className="field compact-field">
        <span className="field-label">Населенный пункт, район, область</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Например: Козенки Московская область" />
      </label>

      <div className="selected-place compact-selected-place">
        <div>
          <strong>Выбрано: {value.name}</strong>
          <span>{value.region}{value.district ? `, ${value.district}` : ''}</span>
        </div>
        {alternativeMatches.length > 0 ? (
          <button type="button" className="text-button" onClick={() => setShowMatches((current) => !current)}>
            {showMatches ? 'Скрыть варианты' : `Другие варианты: ${alternativeMatches.length}`}
          </button>
        ) : null}
      </div>

      {showMatches && alternativeMatches.length > 0 ? (
        <div className="matches compact-matches">
          {alternativeMatches.map((match) => (
            <button
              key={match.id}
              className="match"
              onClick={() => {
                onSelect(match);
                setQuery(`${match.name} ${match.region}`);
                setShowMatches(false);
              }}
              type="button"
            >
              <strong>{match.name}</strong>
              <span>{match.region}{match.district ? `, ${match.district}` : ''}</span>
            </button>
          ))}
        </div>
      ) : null}

      {matches.length === 0 ? (
        <p className="muted compact-note">Совпадений в локальной базе нет. Для расчетов можно ввести параметры вручную.</p>
      ) : null}
    </div>
  );
}
