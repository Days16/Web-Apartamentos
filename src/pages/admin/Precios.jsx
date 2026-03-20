import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

const SEASON_TYPES = [
  { id: 'low',      label: 'Baja',         color: 'bg-green-100 text-green-800' },
  { id: 'high',     label: 'Alta',         color: 'bg-red-100 text-red-800' },
  { id: 'christmas', label: 'Navidad',     color: 'bg-yellow-100 text-yellow-800' },
  { id: 'easter',   label: 'Semana Santa', color: 'bg-purple-100 text-purple-800' },
];

function priceRange(prices) {
  if (!prices.length) return null;
  const vals = prices.map(p => Number(p.price)).filter(Boolean);
  if (!vals.length) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return min === max ? `${min} €` : `${min}–${max} €`;
}

export default function Precios() {
  const [apartments, setApartments] = useState([]);
  const [seasonPrices, setSeasonPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      supabase.from('apartments').select('slug, name, price').order('name'),
      supabase.from('season_prices').select('apartment_slug, season_name, price'),
    ]).then(([aRes, sRes]) => {
      if (aRes.error) setError(aRes.error.message);
      else if (sRes.error) setError(sRes.error.message);
      else {
        setApartments(aRes.data || []);
        setSeasonPrices(sRes.data || []);
      }
      setLoading(false);
    });
  }, []);

  return (
    <>
      <div className="flex items-center justify-between pb-6 mb-8 px-8 pt-8 border-b-2 border-gray-200">
        <div>
          <div className="text-2xl font-bold text-gray-800">Comparativa de precios</div>
          <div className="text-gray-500 text-sm mt-1">
            Precio base y por temporada de todos los apartamentos. Edita en{' '}
            <button className="underline text-[#1a5f6e] hover:opacity-80" onClick={() => navigate('/admin')}>
              Apartamentos → Temporadas
            </button>.
          </div>
        </div>
      </div>

      <div className="px-8 pb-8">
        {error && (
          <div className="bg-red-50 text-red-800 px-5 py-3 rounded-lg mb-4 text-sm border border-red-200">{error}</div>
        )}

        {loading ? (
          <div className="p-10 text-center text-gray-400">Cargando precios...</div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 w-48">Apartamento</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">Base</th>
                  {SEASON_TYPES.map(s => (
                    <th key={s.id} className="text-right px-5 py-3 font-semibold text-gray-600">{s.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apartments.map((apt, i) => {
                  const aptSeasons = seasonPrices.filter(sp => sp.apartment_slug === apt.slug);
                  return (
                    <tr key={apt.slug} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-5 py-3 font-medium text-gray-900 border-b border-gray-100">{apt.name}</td>
                      <td className="px-5 py-3 text-right font-mono text-gray-800 border-b border-gray-100">
                        {apt.price ? `${apt.price} €` : <span className="text-gray-300">—</span>}
                      </td>
                      {SEASON_TYPES.map(s => {
                        const matches = aptSeasons.filter(sp => sp.season_name === s.id);
                        const range = priceRange(matches);
                        return (
                          <td key={s.id} className="px-5 py-3 text-right border-b border-gray-100">
                            {range
                              ? <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${s.color}`}>{range}</span>
                              : <span className="text-gray-300">—</span>
                            }
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {apartments.length === 0 && (
              <div className="p-10 text-center text-gray-400">No hay apartamentos activos.</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
