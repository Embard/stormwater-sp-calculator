import { useMemo, useState } from 'react';
import type { PlaceMatch } from '../types';
import { searchLocalPlaces } from '../utils/geocoder';

type Props = {
  value: PlaceMatch;
  onSelect: (place: PlaceMatch) => void;
};

function manualPlaceFromQuery(query: string): PlaceMatch {
  const trimmed = query.trim() || 'Ручной ввод';
  return {
    id: `manual-${trimmed.toLowerCase().replace(/\s+/g, '-')}`,
    name: trimmed,
    region: 'параметры задать вручную',
    district: undefined,
    lat: 0,
    lon: 0,
    confidence: 0,
    source: 'manual-map'
  };
}

export function PlaceSearch({ value, onSelect }: Props) {
  const [query, setQuery] = useState(`${value.name} ${value.region}`.replace(' параметры задать вручную', ''));
  const [showMatches, setShowMatches] = useState(false);
  const matches = useMemo(() => searchLocalPlaces(query), [query]);
  const alternativeMatches = matches.filter((match) => match.id !== value.id).slice(0, 4);
  const canUseManual = query.trim().length > 1 && matches.length === 0;

  return (
    <div className="place-search">
      <label className="field compact-field">
        <span className="field-label">Населенный пункт, район, область</span>
        <input
          value={query}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Например: Козенки Московская область"
        />
      </label>

      {canUseManual ? (
        <button
          type="button"
          className="secondary-button small-button"
          onClick={() => onSelect(manualPlaceFromQuery(query))}
        >
          Использовать введенное место вручную
        </button>
      ) : null}

      <div className={`selected-place compact-selected-place ${value.source === 'manual-map' ? 'manual-place' : ''}`}>
        <div>
          <strong>{value.name}</strong>
          <span>{value.region}{value.district ? `, ${value.district}` : ''}</span>
        </div>
        {alternativeMatches.length > 0 ? (
          <button type="button" className="text-button" onClick={() => setShowMatches((current) => !current)}>
            {showMatches ? 'Скрыть варианты' : `Другие варианты (${alternativeMatches.length})`}
          </button>
        ) : null}
      </div>

      {value.source === 'manual-map' ? (
        <p className="compact-note warning-note">Для ручного места климатические параметры не подставляются автоматически — проверьте их по ссылкам ниже.</p>
      ) : null}

      {showMatches && alternativeMatches.length > 0 ? (
        <div className="matches compact-matches">
          {alternativeMatches.map((match) => (
            <button
              key={match.id}
              className="match"
              type="button"
              onClick={() => {
                onSelect(match);
                setQuery(`${match.name} ${match.region}`);
                setShowMatches(false);
              }}
            >
              <strong>{match.name}</strong>
              <span>{match.region}{match.district ? `, ${match.district}` : ''}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
