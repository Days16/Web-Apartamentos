import { useState, useEffect } from 'react';
import { fetchChangelog } from '../../services/supabaseService';
import pkg from '../../../package.json';
import { PanelPageHeader } from '../../components/panel';

interface ChangelogEntry {
  id: string;
  version: string;
  type: string;
  title: string;
  description?: string;
  changes?: string[];
  created_at: string;
}

export default function Changelog() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChangelog() {
      try {
        const data = await fetchChangelog();
        setEntries(data);
      } catch (err) {
        console.error('Error loading changelog:', err);
      } finally {
        setLoading(false);
      }
    }
    loadChangelog();
  }, []);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'feature':
        return { bg: 'bg-green-100', text: 'text-green-700', label: 'Nuevo' };
      case 'fix':
        return { bg: 'bg-red-100', text: 'text-red-700', label: 'Arreglado' };
      case 'improvement':
        return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Mejora' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Update' };
    }
  };

  return (
    <div className="panel-page-content">
      <PanelPageHeader
        title="Changelog"
        subtitle="Novedades y actualizaciones del sistema"
        actions={
          <span className="panel-badge font-mono text-xs">
            v{pkg.version}
          </span>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#82c8bd]"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {entries.length > 0 ? (
            entries.map(entry => {
              const styles = getTypeStyles(entry.type);
              return (
                <div key={entry.id} className="relative pl-8 border-l-2 border-gray-200 py-1">
                  {/* Dot */}
                  <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-white border-4 border-[#82c8bd]"></div>

                  <div className="panel-card hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="text-sm font-bold text-[#82c8bd] font-mono">
                        {entry.version}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${styles.bg} ${styles.text}`}
                      >
                        {styles.label}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(entry.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-800 mb-2">{entry.title}</h3>
                    {entry.description && (
                      <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                        {entry.description}
                      </p>
                    )}

                    {entry.changes && entry.changes.length > 0 && (
                      <ul className="space-y-2">
                        {entry.changes.map((change, i) => (
                          <li key={i} className="flex gap-3 text-sm text-gray-600">
                            <span className="text-[#82c8bd] mt-1">•</span>
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400">
              No hay registros en el changelog todavía.
            </div>
          )}
        </div>
      )}

      <div className="mt-12 text-center">
        <p className="text-gray-400 text-xs italic">
          v{entries[0]?.version || '---'} | Illa Pancha Admin Panel
        </p>
      </div>
    </div>
  );
}
