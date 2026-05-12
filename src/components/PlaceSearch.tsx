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

  return (
    <section className="card">
      <h2>1. Место строительства</h2>
      <label className="field">
        <span className="field-label">Населенный пункт, район, область</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Например: Козенки Московская область" />
      </label>
      <div className="matches">
        {matches.length > 0 ? (
          matches.map((match) => (
            <button key={match.id} className="match" onClick={() => onSelect(match)} type="button">
              <strong>{match.name}</strong>
              <span>{match.region}{match.district ? `, ${match.district}` : ''}</span>
              <small>локальная база, уверенность {Math.round(match.confidence * 100)}%</small>
            </button>
          ))
        ) : (
          <p className="muted">В локальной базе совпадений нет. Следующий этап — внешний геокодер или выбор точки на карте.</p>
        )}
      </div>
    </section>
  );
}
