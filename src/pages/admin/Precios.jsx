import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

const PRIMARY_COLOR = '#1a5f6e';
const SECONDARY_COLOR = '#0f172a';
const LIGHT_BG = '#f5f5f5';

export default function Precios() {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadApartments();
  }, []);

  const loadApartments = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('apartments')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setApartments(data || []);
    } catch (err) {
      console.error('Error loading apartments:', err);
      setError('Error al cargar apartamentos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between pb-6 mb-8 px-8 pt-8 border-b-2 border-gray-200">
        <div>
          <div className="text-2xl font-bold text-gray-800">Precios por temporada</div>
          <div className="text-gray-500 text-sm mt-1">Los precios base y de temporada se gestionan por cada apartamento.</div>
        </div>
        <button className="px-4 py-2 bg-[#1a5f6e] text-white rounded font-medium hover:bg-opacity-90 transition-colors" onClick={() => navigate('/admin')}>Ir a Apartamentos</button>
      </div>

      <div className="px-8 pb-8">
        {error && (
          <div className="bg-red-50 text-red-800 px-5 py-3 rounded-lg mb-4 text-sm border border-red-200">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="font-serif text-[22px] text-slate-900 mb-1.5">
            ¿Cómo gestionar los precios de temporada?
          </div>
          <div className="text-[13px] text-slate-500 mb-5 leading-relaxed">
            Para ofrecer máxima flexibilidad, los precios de temporada (Alta, Baja, Festivos...) se configuran individualmente <b>dentro de la ficha de cada apartamento</b>. <br />
            Ve a la sección <strong>Apartamentos</strong>, haz clic en "Editar" sobre el apartamento que deseas modificar, y navega a la pestaña <strong>🗓️ Temporadas</strong>.
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="font-serif text-xl text-slate-900 mb-4">
            Precios base actuales por apartamento
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-400">Cargando precios...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {apartments.map((a, i) => (
                <div key={i} className="p-5 bg-slate-50 rounded-lg border border-gray-200">
                  <div className="text-[11px] font-semibold text-slate-500 tracking-widest uppercase mb-1.5 line-clamp-1">
                    {a.name}
                  </div>
                  <div className="font-serif text-3xl text-slate-900 font-light">
                    {a.price} €
                  </div>
                  <div className="text-[11px] text-slate-500 mb-3">por noche</div>

                  <button
                    onClick={() => navigate('/admin')}
                    className="w-full bg-transparent border border-[#1a5f6e] text-[#1a5f6e] px-3 py-1.5 rounded text-[11px] font-semibold hover:bg-[#1a5f6e]/5 transition-colors"
                  >
                    Manejar Temporadas
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
