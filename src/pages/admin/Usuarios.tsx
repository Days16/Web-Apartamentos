export default function Usuarios() {
  const users = [
    {
      name: 'Propietario',
      email: 'info@apartamentosillapancha.com',
      role: 'Admin',
      apts: 'Todos',
      avatar: 'P',
      lastLogin: 'Hoy, 09:14',
    },
    {
      name: 'Carmen López',
      email: 'carmen@illapancha.com',
      role: 'Manager',
      apts: 'Cantábrico, Ribadeo, Eo',
      avatar: 'C',
      lastLogin: 'Ayer, 18:32',
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between pb-6 mb-8 px-8 pt-8 border-b-2 border-gray-200">
        <div>
          <div className="text-2xl font-bold text-gray-800">Usuarios del panel</div>
        </div>
        <button className="px-4 py-2 bg-[#1a5f6e] text-white rounded font-medium hover:bg-opacity-90 transition-colors">
          + Invitar usuario
        </button>
      </div>

      <div className="px-8 pb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
          {users.map((u, i) => (
            <div
              key={i}
              className="grid grid-cols-[40px_1.5fr_1.5fr_1.5fr_80px_100px_auto] items-center gap-4 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-bold">
                {u.avatar}
              </div>
              <div>
                <div className="font-medium text-sm text-slate-900">{u.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{u.email}</div>
              </div>
              <div className="text-xs text-slate-600">{u.apts}</div>
              <div className="text-xs text-slate-500">Último acceso: {u.lastLogin}</div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider text-center ${u.role === 'Admin' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'}`}
              >
                {u.role}
              </span>
              <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-medium uppercase tracking-wider text-center">
                Activo
              </span>
              <button className="px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-xs font-medium ml-auto">
                Editar
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="font-serif text-xl text-slate-900 mb-4">Roles disponibles</div>
          {[
            {
              role: 'Admin',
              desc: 'Acceso total. Puede configurar pagos, precios, cancelaciones y usuarios.',
              badge: 'bg-blue-100 text-blue-800',
            },
            {
              role: 'Manager',
              desc: 'Puede ver y gestionar reservas, mensajes y el calendario. No puede tocar configuración.',
              badge: 'bg-slate-100 text-slate-800',
            },
          ].map((r, i) => (
            <div
              key={i}
              className={`flex gap-4 py-3 items-start ${i === 0 ? 'border-b border-gray-100' : ''}`}
            >
              <span
                className={`px-2 py-0.5 mt-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${r.badge}`}
              >
                {r.role}
              </span>
              <div className="text-sm text-slate-600 leading-relaxed">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
