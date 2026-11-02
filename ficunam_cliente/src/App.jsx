import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_URL = (import.meta.env.VITE_API_URL || 'https://ficunam-cortesias.onrender.com').replace(/\/$/, '');

const CATEGORIAS = [
  'Invitado Especial',
  'Prensa / Medios',
  'Jurado / Talento',
  'Patrocinador / Aliado',
  'Comunidad UNAM',
  'Público General'
];

export default function App() {
  // Detectar ruta actual sin depender estrictamente de configuración externa de Router
  const pathname = window.location.pathname;
  const isConfirmRoute = pathname.startsWith('/confirmar/');
  const confirmToken = isConfirmRoute ? pathname.split('/confirmar/')[1]?.split('/')[0] : null;
  const isPublicRouteInitial = pathname.startsWith('/solicitar');

  // Modos de vista: 'admin' | 'publico' | 'confirmar'
  const [modoVista, setModoVista] = useState(
    isConfirmRoute ? 'confirmar' : isPublicRouteInitial ? 'publico' : 'admin'
  );

  // ==========================================
  // ESTADO 1: AUTENTICACIÓN ADMIN (Punto 6)
  // ==========================================
  const [autenticado, setAutenticado] = useState(
    localStorage.getItem('ficunam_admin_auth') === 'true'
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // ==========================================
  // ESTADO 2: DATOS PRINCIPALES
  // ==========================================
  const [salas, setSalas] = useState([]);
  const [screenings, setScreenings] = useState([]);
  const [courtesies, setCourtesies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cortesias'); // 'cortesias' | 'solicitudes' | 'funciones' | 'resumen'

  // ==========================================
  // ESTADO 3: FORMULARIO DE NUEVA FUNCIÓN / EVENTO (Puntos 2, 3 y 4)
  // ==========================================
  const [nuevaFuncion, setNuevaFuncion] = useState({
    tipo: 'pelicula',
    pelicula: '',
    director: '',
    sala: 'julio-bracho',
    fecha: '',
    hora: '',
    fechaLimiteConfirmacion: '',
    limiteCortesias: 50
  });

  // Modal para agregar Sala Extra (Punto 4)
  const [mostrarModalSala, setMostrarModalSala] = useState(false);
  const [nuevaSalaData, setNuevaSalaData] = useState({ nombre: '', sede: 'CCU UNAM', capacidad: 100 });

  // ==========================================
  // ESTADO 4: FORMULARIO DE NUEVA CORTESÍA (ADMIN)
  // ==========================================
  const [nuevaCortesia, setNuevaCortesia] = useState({
    nombre: '',
    correo: '',
    empresa: '',
    categoria: 'Invitado Especial',
    screeningId: ''
  });
  const [enviandoCortesia, setEnviandoCortesia] = useState(false);
  const [mensajeSistema, setMensajeSistema] = useState(null);

  // ==========================================
  // ESTADO 5: FORMULARIO PÚBLICO DE SOLICITUD (Punto 1)
  // ==========================================
  const [solicitudPublica, setSolicitudPublica] = useState({
    nombre: '',
    correo: '',
    empresa: '',
    screeningId: ''
  });
  const [solicitudEnviadaExito, setSolicitudEnviadaExito] = useState(false);
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);

  // ==========================================
  // ESTADO 6: VISTA DE CONFIRMACIÓN POR TOKEN
  // ==========================================
  const [datosConfirmacion, setDatosConfirmacion] = useState(null);
  const [errorConfirmacion, setErrorConfirmacion] = useState('');
  const [procesandoConfirmacion, setProcesandoConfirmacion] = useState(false);

  // ==========================================
  // CARGA INICIAL DE DATOS
  // ==========================================
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resSalas, resScreenings, resCourtesies] = await Promise.all([
        fetch(`${API_URL}/api/salas`),
        fetch(`${API_URL}/api/screenings`),
        fetch(`${API_URL}/api/courtesies`)
      ]);

      const dataSalas = await resSalas.json();
      const dataScreenings = await resScreenings.json();
      const dataCourtesies = await resCourtesies.json();

      if (Array.isArray(dataSalas)) setSalas(dataSalas);
      if (Array.isArray(dataScreenings)) {
        setScreenings(dataScreenings);
        if (dataScreenings.length > 0 && !nuevaCortesia.screeningId) {
          setNuevaCortesia(prev => ({ ...prev, screeningId: dataScreenings[0]._id }));
          setSolicitudPublica(prev => ({ ...prev, screeningId: dataScreenings[0]._id }));
        }
      }
      if (Array.isArray(dataCourtesies)) setCourtesies(dataCourtesies);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (modoVista === 'confirmar' && confirmToken) {
      fetch(`${API_URL}/api/confirm/${confirmToken}`)
        .then(r => r.json())
        .then(data => {
          if (data.error) setErrorConfirmacion(data.error);
          else setDatosConfirmacion(data);
        })
        .catch(() => setErrorConfirmacion('No se pudo conectar con el servidor.'));
    } else {
      cargarDatos();
    }
  }, [modoVista, confirmToken]);

  // ==========================================
  // LISTAS FILTRADAS Y CÁLCULO DE LÍMITE (Puntos 1 y 2)
  // ==========================================
  const cortesiasAprobadas = useMemo(
    () => courtesies.filter(c => c.estadoSolicitud !== 'solicitud_pendiente'),
    [courtesies]
  );

  const solicitudesPendientes = useMemo(
    () => courtesies.filter(c => c.estadoSolicitud === 'solicitud_pendiente'),
    [courtesies]
  );

  const funcionSeleccionadaAdmin = useMemo(
    () => screenings.find(s => s._id === nuevaCortesia.screeningId),
    [screenings, nuevaCortesia.screeningId]
  );

  const conteoPorFuncion = useMemo(() => {
    const mapa = {};
    cortesiasAprobadas.forEach(c => {
      const sId = c.screeningId?._id || c.screeningId;
      if (sId) mapa[sId] = (mapa[sId] || 0) + 1;
    });
    return mapa;
  }, [cortesiasAprobadas]);

  const cupoActualSeleccionada = funcionSeleccionadaAdmin
    ? (conteoPorFuncion[funcionSeleccionadaAdmin._id] || 0)
    : 0;
  const limiteSeleccionada = funcionSeleccionadaAdmin?.limiteCortesias || 50;
  const limiteAlcanzado = funcionSeleccionadaAdmin && cupoActualSeleccionada >= limiteSeleccionada;

  const obtenerNombreSala = (salaId) => {
    const encontrada = salas.find(s => s.id === salaId || s.nombre === salaId);
    return encontrada ? encontrada.nombre : salaId;
  };

  // ==========================================
  // MANEJADORES DE ACCIONES
  // ==========================================

  // 1. Login Admin (Punto 6)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        localStorage.setItem('ficunam_admin_auth', 'true');
        setAutenticado(true);
      } else {
        setLoginError('Contraseña incorrecta. Intenta de nuevo.');
      }
    } catch {
      setLoginError('Error de conexión con el servidor.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ficunam_admin_auth');
    setAutenticado(false);
    setPasswordInput('');
  };

  // 2. Crear Sala Extra (Punto 4)
  const handleCrearSalaExtra = async (e) => {
    e.preventDefault();
    if (!nuevaSalaData.nombre.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/venues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaSalaData)
      });
      const creada = await res.json();
      if (res.ok) {
        await cargarDatos();
        setNuevaFuncion(prev => ({ ...prev, sala: creada.id }));
        setMostrarModalSala(false);
        setNuevaSalaData({ nombre: '', sede: 'CCU UNAM', capacidad: 100 });
      }
    } catch (err) {
      alert('Error al crear la sala extra');
    }
  };

  // 3. Crear Función o Evento (Puntos 2 y 3)
  const handleCrearFuncion = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/screenings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaFuncion)
      });
      if (res.ok) {
        const creada = await res.json();
        setScreenings(prev => [...prev, creada]);
        if (!nuevaCortesia.screeningId) {
          setNuevaCortesia(prev => ({ ...prev, screeningId: creada._id }));
        }
        setNuevaFuncion({
          tipo: 'pelicula',
          pelicula: '',
          director: '',
          sala: salas[0]?.id || 'julio-bracho',
          fecha: '',
          hora: '',
          fechaLimiteConfirmacion: '',
          limiteCortesias: 50
        });
        setMensajeSistema({ tipo: 'exito', texto: '✅ Función / Evento registrado correctamente.' });
      }
    } catch {
      setMensajeSistema({ tipo: 'error', texto: '❌ Error al guardar la función.' });
    }
  };

  const handleEliminarFuncion = async (id) => {
    if (!window.confirm('¿Eliminar esta función/evento y todas sus cortesías asociadas?')) return;
    await fetch(`${API_URL}/api/screenings/${id}`, { method: 'DELETE' });
    cargarDatos();
  };

  // 4. Enviar Cortesía desde Admin (con aviso de límite pero sin bloquear)
  const handleCrearCortesiaAdmin = async (e) => {
    e.preventDefault();
    if (!nuevaCortesia.screeningId) {
      alert('Primero selecciona o registra una película/evento.');
      return;
    }
    setEnviandoCortesia(true);
    setMensajeSistema(null);
    try {
      const res = await fetch(`${API_URL}/api/courtesies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaCortesia)
      });
      const data = await res.json();
      if (res.ok) {
        setCourtesies(prev => [data.courtesy, ...prev]);
        setNuevaCortesia(prev => ({ ...prev, nombre: '', correo: '', empresa: '' }));
        if (data.emailWarning) {
          setMensajeSistema({
            tipo: 'alerta',
            texto: `⚠️ Se guardó el invitado, pero hubo un detalle con el correo: ${data.emailWarning}`
          });
        } else if (data.limiteSuperado) {
          setMensajeSistema({
            tipo: 'alerta',
            texto: `📧 Invitación enviada (${data.cupoActual}/${data.limiteCortesias}). Nota: Se ha alcanzado o superado el límite de cortesías de esta función.`
          });
        } else {
          setMensajeSistema({
            tipo: 'exito',
            texto: '📧 Invitación creada y enviada por correo exitosamente.'
          });
        }
      }
    } catch {
      setMensajeSistema({ tipo: 'error', texto: '❌ Error de red al crear la cortesía.' });
    } finally {
      setEnviandoCortesia(false);
    }
  };

  // 5. Aprobar o Denegar Solicitud Pública (Punto 1)
  const handleAprobarSolicitud = async (id) => {
    try {
      setMensajeSistema({ tipo: 'info', texto: '⏳ Aprobando solicitud y enviando correo de invitación...' });
      const res = await fetch(`${API_URL}/api/courtesies/${id}/aprobar`, { method: 'PATCH' });
      const data = await res.json();
      if (res.ok) {
        setCourtesies(prev => prev.map(c => (c._id === id ? data.courtesy : c)));
        setMensajeSistema({
          tipo: 'exito',
          texto: `✅ Solicitud de ${data.courtesy.nombre} aprobada. Se le ha enviado su invitación por correo.`
        });
      }
    } catch {
      setMensajeSistema({ tipo: 'error', texto: '❌ Error al aprobar la solicitud.' });
    }
  };

  const handleDenegarSolicitud = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/courtesies/${id}/denegar`, { method: 'DELETE' });
      if (res.ok) {
        setCourtesies(prev => prev.filter(c => c._id !== id));
      }
    } catch {
      alert('Error al eliminar la solicitud');
    }
  };

  // 6. Enviar Solicitud desde el Portal Público (Punto 1)
  const handleEnviarSolicitudPublica = async (e) => {
    e.preventDefault();
    setEnviandoSolicitud(true);
    try {
      const res = await fetch(`${API_URL}/api/public/solicitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solicitudPublica)
      });
      if (res.ok) {
        setSolicitudEnviadaExito(true);
      } else {
        alert('Ocurrió un error al registrar tu solicitud.');
      }
    } catch {
      alert('Error de conexión.');
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  // 7. Descargar Excel (.xlsx) y PDF (Punto 5)
  const descargarExcel = () => {
    const filas = cortesiasAprobadas.map(c => {
      const sc = c.screeningId || {};
      const esEvento = sc.tipo === 'evento';
      return {
        'Tipo': esEvento ? 'Evento' : 'Película',
        'Título': sc.pelicula || 'Sin asignar',
        'Director': esEvento ? 'N/A (Evento)' : (sc.director || '-'),
        'Sala / Sede': obtenerNombreSala(sc.sala || '-'),
        'Fecha': sc.fecha || '-',
        'Horario': sc.hora || '-',
        'Nombre del Invitado': c.nombre,
        'Correo Electrónico': c.correo,
        'Empresa / Medio': c.empresa || '-',
        'Categoría': c.categoria,
        'Estado de Asistencia': (c.estado || 'pendiente').toUpperCase(),
        'Límite de la Función': sc.limiteCortesias || 50
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(filas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cortesias_FICUNAM');
    XLSX.writeFile(workbook, `Resumen_Cortesias_FICUNAM_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const descargarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('FICUNAM - Reporte General de Cortesías', 14, 18);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 25);

    const rows = cortesiasAprobadas.map(c => {
      const sc = c.screeningId || {};
      const esEvento = sc.tipo === 'evento';
      return [
        esEvento ? 'Evento' : 'Película',
        sc.pelicula || '-',
        esEvento ? 'N/A' : (sc.director || '-'),
        obtenerNombreSala(sc.sala || '-'),
        `${sc.fecha || ''} ${sc.hora || ''}`,
        c.nombre,
        c.empresa || '-',
        (c.estado || 'pendiente').toUpperCase()
      ];
    });

    doc.autoTable({
      startY: 30,
      head: [['Tipo', 'Título', 'Director', 'Sala', 'Fecha/Hora', 'Invitado', 'Institución', 'Estado']],
      body: rows,
      styles: { fontSize: 8 }
    });

    doc.save(`Resumen_Cortesias_FICUNAM_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // =========================================================================
  // RENDERIZADO A: VISTA DE CONFIRMACIÓN DEL INVITADO (/confirmar/:token)
  // =========================================================================
  if (modoVista === 'confirmar') {
    const responderInvitacion = async (respuesta) => {
      setProcesandoConfirmacion(true);
      const res = await fetch(`${API_URL}/api/confirm/${confirmToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respuesta })
      });
      const data = await res.json();
      if (res.ok) setDatosConfirmacion(data.courtesy);
      setProcesandoConfirmacion(false);
    };

    const sc = datosConfirmacion?.screeningId || {};
    const esEvento = sc.tipo === 'evento';

    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center border-b border-neutral-800 pb-6 mb-6">
            <h1 className="text-3xl font-extrabold tracking-widest text-amber-500">FICUNAM</h1>
            <p className="text-xs uppercase tracking-widest text-neutral-400 mt-1">
              Festival Internacional de Cine UNAM
            </p>
          </div>

          {errorConfirmacion ? (
            <p className="text-center text-red-400 py-8">{errorConfirmacion}</p>
          ) : !datosConfirmacion ? (
            <p className="text-center text-neutral-400 py-8">Cargando detalles de tu invitación...</p>
          ) : (
            <div className="space-y-6">
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 mb-2">
                  {esEvento ? '🥂 Evento Especial' : '🎬 Función de Película'}
                </span>
                <h2 className="text-2xl font-bold text-white">{sc.pelicula}</h2>
                {!esEvento && sc.director && (
                  <p className="text-sm text-neutral-400">Dir. {sc.director}</p>
                )}
              </div>

              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2 text-sm">
                <p><strong>Invitado(a):</strong> {datosConfirmacion.nombre}</p>
                <p><strong>Sala / Sede:</strong> {obtenerNombreSala(sc.sala)}</p>
                <p><strong>Fecha y Hora:</strong> {sc.fecha} a las {sc.hora} hrs</p>
                <p>
                  <strong>Estado actual:</strong>{' '}
                  <span className="uppercase font-bold text-amber-400">{datosConfirmacion.estado}</span>
                </p>
              </div>

              {datosConfirmacion.estado === 'pendiente' ? (
                <div className="flex gap-3 pt-2">
                  <button
                    disabled={procesandoConfirmacion}
                    onClick={() => responderInvitacion('confirmada')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition"
                  >
                    ✅ Confirmar Asistencia
                  </button>
                  <button
                    disabled={procesandoConfirmacion}
                    onClick={() => responderInvitacion('declinada')}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-3 rounded-xl transition"
                  >
                    No podré asistir
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-700 text-center text-emerald-300 text-sm">
                  {datosConfirmacion.estado === 'confirmada'
                    ? '🎉 ¡Gracias! Tu asistencia ha quedado confirmada. Presenta este pase al ingresar.'
                    : 'Hemos registrado que no podrás asistir. ¡Gracias por avisarnos!'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDERIZADO B: PORTAL PÚBLICO DE SOLICITUD DE CORTESÍAS (Punto 1)
  // =========================================================================
  if (modoVista === 'publico') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between p-6">
        <header className="max-w-3xl w-full mx-auto flex justify-between items-center border-b border-neutral-800 pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-widest text-amber-500">FICUNAM</h1>
            <p className="text-xs text-neutral-400">Registro Público de Solicitud de Cortesías</p>
          </div>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              setModoVista('admin');
            }}
            className="text-xs text-neutral-500 hover:text-neutral-300 underline"
          >
            Acceso Administración →
          </button>
        </header>

        <main className="max-w-xl w-full mx-auto my-auto py-8">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-xl">
            {solicitudEnviadaExito ? (
              <div className="text-center space-y-4 py-6">
                <div className="text-5xl">📩</div>
                <h2 className="text-2xl font-bold text-emerald-400">¡Solicitud Recibida!</h2>
                <p className="text-neutral-300 text-sm leading-relaxed">
                  Tu solicitud ha sido enviada al equipo de Dirección Ejecutiva de FICUNAM.
                  En caso de ser aprobada, recibirás tu invitación oficial directamente en tu correo electrónico.
                </p>
                <button
                  onClick={() => {
                    setSolicitudEnviadaExito(false);
                    setSolicitudPublica(prev => ({ ...prev, nombre: '', correo: '', empresa: '' }));
                  }}
                  className="mt-4 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-xl font-semibold text-sm"
                >
                  Enviar otra solicitud
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnviarSolicitudPublica} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Solicitar Invitación</h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Completa tus datos y elige la película o evento al que deseas asistir.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                    Selecciona Película o Evento *
                  </label>
                  <select
                    required
                    value={solicitudPublica.screeningId}
                    onChange={e => setSolicitudPublica({ ...solicitudPublica, screeningId: e.target.value })}
                    className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white"
                  >
                    <option value="" disabled>-- Elige una opción --</option>
                    {screenings.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.tipo === 'evento' ? '🥂 [EVENTO]' : '🎬 [PELÍCULA]'} {s.pelicula} — {s.fecha} ({s.hora} hrs)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. María González"
                    value={solicitudPublica.nombre}
                    onChange={e => setSolicitudPublica({ ...solicitudPublica, nombre: e.target.value })}
                    className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                    Correo electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    value={solicitudPublica.correo}
                    onChange={e => setSolicitudPublica({ ...solicitudPublica, correo: e.target.value })}
                    className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                    Institución, Medio o Empresa (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. UNAM / Prensa / Público General"
                    value={solicitudPublica.empresa}
                    onChange={e => setSolicitudPublica({ ...solicitudPublica, empresa: e.target.value })}
                    className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={enviandoSolicitud}
                  className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition"
                >
                  {enviandoSolicitud ? 'Enviando solicitud...' : 'Enviar Solicitud de Cortesía'}
                </button>
              </form>
            )}
          </div>
        </main>

        <footer className="text-center text-xs text-neutral-600">
          Festival Internacional de Cine UNAM · Dirección Ejecutiva
        </footer>
      </div>
    );
  }

  // =========================================================================
  // RENDERIZADO C: LOGIN DE CONTRASEÑA PARA ADMINISTRACIÓN (Punto 6)
  // =========================================================================
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-widest text-amber-500">FICUNAM</h1>
            <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1">
              Panel de Administración de Cortesías
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-semibold text-neutral-400 mb-1">
                Contraseña de Administrador
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:border-amber-500 outline-none"
              />
            </div>

            {loginError && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 p-2.5 rounded-lg">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition"
            >
              Ingresar al Panel
            </button>
          </form>

          <div className="border-t border-neutral-800 pt-4 text-center">
            <button
              onClick={() => {
                window.history.pushState({}, '', '/solicitar');
                setModoVista('publico');
              }}
              className="text-xs text-amber-400 hover:underline"
            >
              ¿Eres invitado o público general? Solicita tu cortesía aquí →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDERIZADO D: PANEL COMPLETO DE ADMINISTRACIÓN
  // =========================================================================
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Barra superior */}
      <header className="bg-neutral-900 border-b border-neutral-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-widest text-amber-500">
              FICUNAM · CORTESÍAS
            </h1>
            <p className="text-xs text-neutral-400">
              Sistema de Gestión de Invitaciones, Eventos y Solicitudes
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                window.history.pushState({}, '', '/solicitar');
                setModoVista('publico');
              }}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-amber-400 border border-neutral-700"
            >
              🔗 Ver Formulario Público (/solicitar)
            </button>

            <button
              onClick={descargarExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-xs font-bold text-white"
            >
              📊 Descargar Excel (.xlsx)
            </button>

            <button
              onClick={descargarPDF}
              className="px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-xs font-bold text-white"
            >
              📄 Descargar PDF
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-400"
            >
              Cerrar sesión 🔒
            </button>
          </div>
        </div>
      </header>

      {/* Navegación de Pestañas */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex flex-wrap gap-2 border-b border-neutral-800 pb-3">
          <button
            onClick={() => setActiveTab('cortesias')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              activeTab === 'cortesias' ? 'bg-amber-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            🎟️ Enviar y Gestionar Cortesías ({cortesiasAprobadas.length})
          </button>

          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
              activeTab === 'solicitudes' ? 'bg-amber-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            <span>📥 Solicitudes del Público</span>
            {solicitudesPendientes.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-600 text-white font-extrabold">
                {solicitudesPendientes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('funciones')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              activeTab === 'funciones' ? 'bg-amber-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            🎬 Películas, Eventos y Salas ({screenings.length})
          </button>
        </div>

        {/* Mensajes de estado */}
        {mensajeSistema && (
          <div
            className={`mt-4 p-4 rounded-xl border text-sm flex justify-between items-center ${
              mensajeSistema.tipo === 'exito'
                ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300'
                : mensajeSistema.tipo === 'alerta'
                ? 'bg-amber-950/50 border-amber-600 text-amber-300'
                : 'bg-red-950/50 border-red-700 text-red-300'
            }`}
          >
            <span>{mensajeSistema.texto}</span>
            <button onClick={() => setMensajeSistema(null)} className="text-xs underline ml-4">
              Cerrar
            </button>
          </div>
        )}
      </div>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto p-6">
        {/* =============================================================== */}
        {/* PESTAÑA 1: ENVIAR Y VER CORTESÍAS APROBADAS */}
        {/* =============================================================== */}
        {activeTab === 'cortesias' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulario para enviar cortesía */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 h-fit space-y-4">
              <h2 className="text-lg font-bold text-amber-400">Enviar Nueva Cortesía</h2>

              <form onSubmit={handleCrearCortesiaAdmin} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">
                    Película o Evento *
                  </label>
                  <select
                    required
                    value={nuevaCortesia.screeningId}
                    onChange={e => setNuevaCortesia({ ...nuevaCortesia, screeningId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                  >
                    <option value="" disabled>-- Selecciona función o evento --</option>
                    {screenings.map(s => {
                      const usados = conteoPorFuncion[s._id] || 0;
                      const lim = s.limiteCortesias || 50;
                      return (
                        <option key={s._id} value={s._id}>
                          {s.tipo === 'evento' ? '🥂 [EVENTO]' : '🎬 [PELÍCULA]'} {s.pelicula} ({usados}/{lim} cortesías)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* PUNTO 2: AVISO DE LÍMITE ALCANZADO (SIN BLOQUEAR ENVÍO) */}
                {funcionSeleccionadaAdmin && (
                  <div className="text-xs flex justify-between items-center bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-800">
                    <span>Cupo de cortesías usadas:</span>
                    <span className={`font-bold ${limiteAlcanzado ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {cupoActualSeleccionada} / {limiteSeleccionada}
                    </span>
                  </div>
                )}

                {limiteAlcanzado && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500 text-amber-300 text-xs leading-relaxed">
                    ⚠️ <strong>Aviso de límite alcanzado:</strong> Esta función ya llegó a su límite configurado de{' '}
                    <strong>{limiteSeleccionada}</strong> cortesías. Aún puedes seguir enviando invitaciones sin bloqueo.
                  </div>
                )}

                <div>
                  <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">
                    Nombre del Invitado *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo"
                    value={nuevaCortesia.nombre}
                    onChange={e => setNuevaCortesia({ ...nuevaCortesia, nombre: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="invitado@dominio.com"
                    value={nuevaCortesia.correo}
                    onChange={e => setNuevaCortesia({ ...nuevaCortesia, correo: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">
                    Empresa / Institución / Medio
                  </label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={nuevaCortesia.empresa}
                    onChange={e => setNuevaCortesia({ ...nuevaCortesia, empresa: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">
                    Categoría
                  </label>
                  <select
                    value={nuevaCortesia.categoria}
                    onChange={e => setNuevaCortesia({ ...nuevaCortesia, categoria: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                  >
                    {CATEGORIAS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={enviandoCortesia}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition"
                >
                  {enviandoCortesia ? 'Enviando invitación...' : '📧 Registrar y Enviar Correo'}
                </button>
              </form>
            </div>

            {/* Tabla de cortesías enviadas */}
            <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 overflow-x-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Lista Oficial de Invitados ({cortesiasAprobadas.length})</h2>
              </div>

              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 text-xs uppercase">
                    <th className="py-3 px-2">Invitado</th>
                    <th className="py-3 px-2">Tipo / Título</th>
                    <th className="py-3 px-2">Sala y Fecha</th>
                    <th className="py-3 px-2">Confirmación</th>
                    <th className="py-3 px-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {cortesiasAprobadas.map(c => {
                    const sc = c.screeningId || {};
                    const esEvento = sc.tipo === 'evento';
                    return (
                      <tr key={c._id} className="hover:bg-neutral-800/40">
                        <td className="py-3 px-2">
                          <div className="font-semibold text-white">{c.nombre}</div>
                          <div className="text-xs text-neutral-400">{c.correo}</div>
                          {c.empresa && <div className="text-xs text-amber-400/80">{c.empresa}</div>}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mr-1 ${
                            esEvento ? 'bg-purple-900/60 text-purple-300' : 'bg-blue-900/60 text-blue-300'
                          }`}>
                            {esEvento ? '🥂 EVENTO' : '🎬 PELÍCULA'}
                          </span>
                          <div className="font-medium text-neutral-200 mt-0.5">{sc.pelicula || 'Eliminada'}</div>
                          {!esEvento && sc.director && (
                            <div className="text-xs text-neutral-500">Dir. {sc.director}</div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-xs text-neutral-300">
                          <div>{obtenerNombreSala(sc.sala)}</div>
                          <div className="text-neutral-500">{sc.fecha} · {sc.hora} hrs</div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            c.estado === 'confirmada'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                              : c.estado === 'declinada'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}>
                            {c.estado || 'pendiente'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            onClick={() => handleDenegarSolicitud(c._id)}
                            className="text-xs text-red-400 hover:underline"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {cortesiasAprobadas.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-neutral-500">
                        Aún no hay cortesías registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* PESTAÑA 2: SOLICITUDES DEL PÚBLICO (ACEPTAR / DENEGAR - Punto 1) */}
        {/* =============================================================== */}
        {activeTab === 'solicitudes' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-amber-400">
                  Solicitudes Recibidas del Público ({solicitudesPendientes.length})
                </h2>
                <p className="text-xs text-neutral-400">
                  Al pulsar <strong>Aceptar</strong> se enviará automáticamente el correo oficial por Brevo. Al pulsar <strong>Denegar</strong>, la solicitud desaparece sin enviar correo.
                </p>
              </div>
              <div className="text-xs bg-neutral-950 px-3 py-2 rounded-xl border border-neutral-800 text-neutral-300">
                Enlace para compartir con el público:{' '}
                <strong className="text-amber-400">{window.location.origin}/solicitar</strong>
              </div>
            </div>

            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 text-xs uppercase">
                  <th className="py-3 px-3">Solicitante</th>
                  <th className="py-3 px-3">Correo</th>
                  <th className="py-3 px-3">Institución / Medio</th>
                  <th className="py-3 px-3">Película / Evento Solicitado</th>
                  <th className="py-3 px-3 text-right">Decisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {solicitudesPendientes.map(sol => {
                  const sc = sol.screeningId || {};
                  const esEvento = sc.tipo === 'evento';
                  const usados = conteoPorFuncion[sc._id] || 0;
                  const lim = sc.limiteCortesias || 50;

                  return (
                    <tr key={sol._id} className="hover:bg-neutral-800/40">
                      <td className="py-3.5 px-3 font-semibold text-white">{sol.nombre}</td>
                      <td className="py-3.5 px-3 text-neutral-300">{sol.correo}</td>
                      <td className="py-3.5 px-3 text-neutral-400">{sol.empresa || 'Público General'}</td>
                      <td className="py-3.5 px-3">
                        <span className="text-xs font-bold text-amber-400 mr-1">
                          [{esEvento ? 'EVENTO' : 'PELÍCULA'}]
                        </span>
                        <span className="font-medium">{sc.pelicula}</span>
                        <div className="text-xs text-neutral-400">
                          {obtenerNombreSala(sc.sala)} · {sc.fecha} ({sc.hora} hrs) · Cupo: {usados}/{lim}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleAprobarSolicitud(sol._id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
                        >
                          ✅ Aceptar y Enviar Correo
                        </button>
                        <button
                          onClick={() => handleDenegarSolicitud(sol._id)}
                          className="px-3.5 py-1.5 bg-red-900/70 hover:bg-red-700 text-red-200 text-xs font-semibold rounded-lg transition"
                        >
                          ❌ Denegar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {solicitudesPendientes.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-neutral-500">
                      No hay solicitudes pendientes por revisar en este momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* =============================================================== */}
        {/* PESTAÑA 3: PELÍCULAS, EVENTOS Y SALAS EXTRA (Puntos 2, 3 y 4) */}
        {/* =============================================================== */}
        {activeTab === 'funciones' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulario para crear Película o Evento */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 h-fit space-y-4">
              <h2 className="text-lg font-bold text-amber-400">Registrar Película o Evento</h2>

              <form onSubmit={handleCrearFuncion} className="space-y-4">
                {/* Selector Tipo: Película vs Evento (Punto 3) */}
                <div>
                  <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">
                    Tipo de Programación *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNuevaFuncion({ ...nuevaFuncion, tipo: 'pelicula' })}
                      className={`py-2.5 rounded-xl text-xs font-bold border ${
                        nuevaFuncion.tipo === 'pelicula'
                          ? 'bg-amber-600 border-amber-500 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      🎬 Película
                    </button>
                    <button
                      type="button"
                      onClick={() => setNuevaFuncion({ ...nuevaFuncion, tipo: 'evento', director: '' })}
                      className={`py-2.5 rounded-xl text-xs font-bold border ${
                        nuevaFuncion.tipo === 'evento'
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      🥂 Evento Especial
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">
                    {nuevaFuncion.tipo === 'evento' ? 'Nombre del Evento *' : 'Título de la Película *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={nuevaFuncion.tipo === 'evento' ? 'Ej. Cóctel Inaugural / Mesa Redonda' : 'Ej. Temporada de Huracanes'}
                    value={nuevaFuncion.pelicula}
                    onChange={e => setNuevaFuncion({ ...nuevaFuncion, pelicula: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                  />
                </div>

                {/* Solo muestra Director si es Película (Punto 3) */}
                {nuevaFuncion.tipo === 'pelicula' && (
                  <div>
                    <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">
                      Director(a) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre del director(a)"
                      value={nuevaFuncion.director}
                      onChange={e => setNuevaFuncion({ ...nuevaFuncion, director: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                    />
                  </div>
                )}

                {/* Selector de Sala + Botón Añadir Sala Extra (Punto 4) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs uppercase text-neutral-400 font-semibold">
                      Sala / Sede *
                    </label>
                    <button
                      type="button"
                      onClick={() => setMostrarModalSala(true)}
                      className="text-xs text-amber-400 hover:underline font-semibold"
                    >
                      + Añadir Sala Extra
                    </button>
                  </div>
                  <select
                    value={nuevaFuncion.sala}
                    onChange={e => setNuevaFuncion({ ...nuevaFuncion, sala: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                  >
                    {salas.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} {s.esExtra ? '(Extra)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">
                      Fecha *
                    </label>
                    <input
                      type="date"
                      required
                      value={nuevaFuncion.fecha}
                      onChange={e => setNuevaFuncion({ ...nuevaFuncion, fecha: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">
                      Hora *
                    </label>
                    <input
                      type="time"
                      required
                      value={nuevaFuncion.hora}
                      onChange={e => setNuevaFuncion({ ...nuevaFuncion, hora: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                    />
                  </div>
                </div>

                {/* Límite de Cortesías Configurable (Punto 2) */}
                <div>
                  <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">
                    Límite de Cortesías (Aviso de cupo) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={nuevaFuncion.limiteCortesias}
                    onChange={e => setNuevaFuncion({ ...nuevaFuncion, limiteCortesias: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition"
                >
                  Guardar {nuevaFuncion.tipo === 'evento' ? 'Evento' : 'Película'}
                </button>
              </form>
            </div>

            {/* Lista de Películas y Eventos */}
            <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 overflow-x-auto">
              <h2 className="text-lg font-bold mb-4">Catálogo de Funciones y Eventos ({screenings.length})</h2>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 text-xs uppercase">
                    <th className="py-3 px-2">Tipo</th>
                    <th className="py-3 px-2">Título / Director</th>
                    <th className="py-3 px-2">Sala / Sede</th>
                    <th className="py-3 px-2">Fecha y Hora</th>
                    <th className="py-3 px-2">Cupo Cortesías</th>
                    <th className="py-3 px-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {screenings.map(s => {
                    const esEvento = s.tipo === 'evento';
                    const usados = conteoPorFuncion[s._id] || 0;
                    const lim = s.limiteCortesias || 50;
                    const lleno = usados >= lim;

                    return (
                      <tr key={s._id} className="hover:bg-neutral-800/40">
                        <td className="py-3 px-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            esEvento ? 'bg-purple-950 text-purple-300 border border-purple-700' : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}>
                            {esEvento ? '🥂 Evento' : '🎬 Película'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="font-bold text-white">{s.pelicula}</div>
                          {!esEvento && s.director && (
                            <div className="text-xs text-neutral-400">Dir. {s.director}</div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-neutral-300">{obtenerNombreSala(s.sala)}</td>
                        <td className="py-3 px-2 text-xs text-neutral-300">
                          {s.fecha} · {s.hora} hrs
                        </td>
                        <td className="py-3 px-2">
                          <span className={`font-bold text-xs px-2.5 py-1 rounded-lg ${
                            lleno ? 'bg-amber-500/20 text-amber-300 border border-amber-500' : 'bg-neutral-800 text-emerald-400'
                          }`}>
                            {usados} / {lim} {lleno && '⚠️ Límite'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            onClick={() => handleEliminarFuncion(s._id)}
                            className="text-xs text-red-400 hover:underline"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* =============================================================== */}
      {/* MODAL PARA AGREGAR SALA EXTRA (Punto 4) */}
      {/* =============================================================== */}
      {mostrarModalSala && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-amber-400">Añadir Nueva Sala / Sede Extra</h3>
            <form onSubmit={handleCrearSalaExtra} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-neutral-400 mb-1">
                  Nombre de la Sala o Sede *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Foro al Aire Libre / Sala Miguel Covarrubias"
                  value={nuevaSalaData.nombre}
                  onChange={e => setNuevaSalaData({ ...nuevaSalaData, nombre: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-neutral-400 mb-1">
                  Ubicación / Complejo
                </label>
                <input
                  type="text"
                  placeholder="Ej. CCU UNAM / Centro Histórico"
                  value={nuevaSalaData.sede}
                  onChange={e => setNuevaSalaData({ ...nuevaSalaData, sede: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalSala(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-xs text-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white"
                >
                  Guardar Sala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}