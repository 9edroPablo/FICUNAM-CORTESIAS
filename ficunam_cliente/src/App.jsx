import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Lock, CheckCircle2, XCircle, Send, Copy, ExternalLink, Trash2, AlertTriangle } from 'lucide-react';
import { SALAS_CCU, CATEGORIAS_CORTESIA } from './constants/salas';
import { INITIAL_SCREENINGS, INITIAL_COURTESIES } from './data/mockData';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import FuncionesView from './components/funciones/FuncionesView';
import CortesiasView from './components/cortesias/CortesiasView';
import TaquillaView from './components/taquilla/TaquillaView';
import ResumenView from './components/resumen/ResumenView';
import ConfirmacionInvitadoView from './components/confirmacion/ConfirmacionInvitadoView';
import FicunamLogo from './components/artwork/FicunamLogo';
import { formatDateSpanish, getDeadlineInfo } from './utils/dateUtils';
import {
  loginAdmin,
  fetchExtraVenues,
  createExtraVenue,
  fetchScreenings,
  createScreening,
  removeScreening,
  fetchCourtesies,
  createCourtesy,
  createPublicRequest,
  approvePublicRequest,
  rejectPublicRequest,
  acceptCourtesyByToken,
  toggleCourtesyDelivered,
  resetAllDatabase
} from './services/api';

const FICUNAM_CARTELERA_URL = 'https://ficunam.unam.mx/programacion/';

export default function App() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const confirmMatch = pathname.match(/^\/confirmar\/([^/]+)$/);
  const guestToken = confirmMatch ? confirmMatch[1] : null;
  const isPublicRequestRoute = pathname.startsWith('/solicitar');

  // Autenticación Admin (Punto 6)
  const [adminAuthenticated, setAdminAuthenticated] = useState(
    () => localStorage.getItem('ficunam_admin_session') === 'true'
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState('funciones');
  const [extraSalas, setExtraSalas] = useState([]);
  const [screenings, setScreenings] = useState([]);
  const [courtesies, setCourtesies] = useState([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [selectedMovieTitle, setSelectedMovieTitle] = useState('');
  const [selectedScreeningId, setSelectedScreeningId] = useState('');

  // Estados para el portal público aislado (/solicitar)
  const [pubName, setPubName] = useState('');
  const [pubEmail, setPubEmail] = useState('');
  const [pubCompany, setPubCompany] = useState('');
  const [pubCategory, setPubCategory] = useState('Invitados');
  const [pubMovieTitle, setPubMovieTitle] = useState('');
  const [pubScreeningId, setPubScreeningId] = useState('');
  const [pubSubmitted, setPubSubmitted] = useState(false);
  const [pubSending, setPubSending] = useState(false);

  // Estados para el Modal Oculto de Reinicio Maestro (Shift + Alt + D)
  const [showSecretResetModal, setShowSecretResetModal] = useState(false);
  const [masterPinInput, setMasterPinInput] = useState('');
  const [resetStatus, setResetStatus] = useState(null);
  const [resetting, setResetting] = useState(false);

  // Escuchar atajo secreto de teclado: Shift + Alt + D
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey && e.altKey && (e.key === 'D' || e.key === 'd' || e.code === 'KeyD')) {
        e.preventDefault();
        setShowSecretResetModal((prev) => !prev);
        setResetStatus(null);
        setMasterPinInput('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const allSalas = useMemo(() => {
    const map = new Map();
    SALAS_CCU.forEach((s) => map.set(s.id, s));
    extraSalas.forEach((s) => map.set(s.id, s));
    return Array.from(map.values());
  }, [extraSalas]);

  const loadFromBackend = useCallback(async () => {
    try {
      const [dbScreenings, dbCourtesies, dbVenues] = await Promise.all([
        fetchScreenings(),
        fetchCourtesies(),
        fetchExtraVenues()
      ]);
      setScreenings(dbScreenings);
      setCourtesies(dbCourtesies);
      setExtraSalas(dbVenues);
      setBackendConnected(true);

      if (dbScreenings.length > 0) {
        setSelectedMovieTitle((prev) => prev || dbScreenings[0].pelicula);
        setSelectedScreeningId((prev) => prev || dbScreenings[0].id);
        setPubMovieTitle((prev) => prev || dbScreenings[0].pelicula);
        setPubScreeningId((prev) => prev || dbScreenings[0].id);
      } else {
        setSelectedMovieTitle('');
        setSelectedScreeningId('');
        setPubMovieTitle('');
        setPubScreeningId('');
      }
    } catch (err) {
      console.warn('Usando datos de respaldo:', err.message);
      setScreenings(INITIAL_SCREENINGS);
      setCourtesies(INITIAL_COURTESIES);
      setBackendConnected(false);
      setSelectedMovieTitle(INITIAL_SCREENINGS[0]?.pelicula || '');
      setSelectedScreeningId(INITIAL_SCREENINGS[0]?.id || '');
      setPubMovieTitle(INITIAL_SCREENINGS[0]?.pelicula || '');
      setPubScreeningId(INITIAL_SCREENINGS[0]?.id || '');
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    if (!guestToken) {
      loadFromBackend();
    }
  }, [guestToken, loadFromBackend]);

  const handleMasterReset = async (e) => {
    e.preventDefault();
    if (!masterPinInput.trim()) return;
    setResetting(true);
    setResetStatus(null);
    try {
      const res = await resetAllDatabase(masterPinInput.trim());
      setScreenings([]);
      setCourtesies([]);
      setExtraSalas([]);
      setSelectedMovieTitle('');
      setSelectedScreeningId('');
      setPubMovieTitle('');
      setPubScreeningId('');
      setResetStatus({
        type: 'success',
        message: `${res.message} Se eliminaron ${res.deleted.screenings} funciones, ${res.deleted.courtesies} cortesías/solicitudes y ${res.deleted.venues} salas extra.`
      });
      setMasterPinInput('');
    } catch (err) {
      setResetStatus({
        type: 'error',
        message: err.message
      });
    } finally {
      setResetting(false);
    }
  };

  // Separar cortesías aprobadas de las solicitudes públicas pendientes
  const approvedCourtesies = useMemo(
    () => courtesies.filter((c) => c.estadoSolicitud !== 'solicitud_pendiente'),
    [courtesies]
  );

  const pendingRequests = useMemo(
    () => courtesies.filter((c) => c.estadoSolicitud === 'solicitud_pendiente'),
    [courtesies]
  );

  const moviesGrouped = useMemo(() => {
    const map = {};
    screenings.forEach((s) => {
      const key = s.pelicula.trim();
      if (!map[key]) {
        map[key] = {
          tipo: s.tipo || 'pelicula',
          pelicula: s.pelicula,
          director: s.director,
          seccion: s.seccion || 'SELECCIÓN OFICIAL',
          horarios: []
        };
      }
      const sala = allSalas.find((salaItem) => salaItem.id === s.salaId);
      map[key].horarios.push({
        ...s,
        salaNombre: sala ? sala.nombre : s.salaId,
        salaAforo: sala ? sala.aforo : null,
        salaTipo: sala ? sala.tipo : 'fijo'
      });
    });

    Object.values(map).forEach((group) => {
      group.horarios.sort((a, b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`));
    });

    return map;
  }, [screenings, allSalas]);

  const movieTitles = useMemo(() => Object.keys(moviesGrouped), [moviesGrouped]);

  const occupancyByScreening = useMemo(() => {
    const counts = {};
    screenings.forEach((s) => {
      const sala = allSalas.find((item) => item.id === s.salaId);
      const totalEnviadas = approvedCourtesies.filter((c) => c.screeningId === s.id).length;
      const totalAceptadas = approvedCourtesies.filter(
        (c) => c.screeningId === s.id && c.estado === 'aceptada'
      ).length;
      const totalPendientes = approvedCourtesies.filter(
        (c) => c.screeningId === s.id && c.estado === 'pendiente'
      ).length;
      const boletosComprometidos = totalAceptadas + totalPendientes;
      const aforoMax = sala ? sala.aforo : null;
      const limiteCortesias = s.limiteCortesias || null;
      const limiteAlcanzado = limiteCortesias !== null && totalEnviadas >= limiteCortesias;
      const cupoLleno = aforoMax !== null && boletosComprometidos >= aforoMax;
      const disponibles = aforoMax !== null ? Math.max(0, aforoMax - boletosComprometidos) : null;

      counts[s.id] = {
        totalEnviadas,
        totalAceptadas,
        totalPendientes,
        boletosComprometidos,
        aforoMax,
        limiteCortesias,
        limiteAlcanzado,
        cupoLleno,
        disponibles
      };
    });
    return counts;
  }, [screenings, approvedCourtesies, allSalas]);

  // 1. Vista de Confirmación del Invitado (/confirmar/:token)
  if (guestToken) {
    return <ConfirmacionInvitadoView token={guestToken} />;
  }

  // 2. Portal Público de Solicitud 100% Aislado (/solicitar)
  if (isPublicRequestRoute) {
    const currentPubMovieTitle = pubMovieTitle || movieTitles[0] || '';
    const pubAvailableSchedules =
      currentPubMovieTitle && moviesGrouped[currentPubMovieTitle]
        ? moviesGrouped[currentPubMovieTitle].horarios
        : [];

    const currentPubScreening =
      pubAvailableSchedules.find((h) => h.id === pubScreeningId) ||
      pubAvailableSchedules[0] ||
      null;

    const handleSelectPubMovie = (title) => {
      setPubMovieTitle(title);
      const schedules = moviesGrouped[title]?.horarios || [];
      if (schedules.length > 0) {
        setPubScreeningId(schedules[0].id);
      } else {
        setPubScreeningId('');
      }
    };

    const handlePublicSubmit = async (e) => {
      e.preventDefault();
      if (!pubName.trim() || !pubEmail.trim() || !currentPubScreening) return;
      setPubSending(true);
      try {
        await createPublicRequest({
          nombre: pubName.trim(),
          correo: pubEmail.trim(),
          empresa: pubCompany.trim() || pubCategory,
          categoria: pubCategory,
          screeningId: currentPubScreening.id
        });
        setPubSubmitted(true);
      } catch (err) {
        alert(err.message);
      } finally {
        setPubSending(false);
      }
    };

    const simulatedNow = new Date().toISOString();

    return (
      <div className="min-h-screen bg-[#080808] text-[#F4F0EA] font-ficunam-sans flex flex-col justify-between">
        <div>
          <div className="bg-[#050505] border-b border-white/15 text-[11px] tracking-[0.22em] uppercase text-[#F4F0EA]/70">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#F4F0EA]">UNAM</span>
                <span className="text-[#D91E26]">/</span>
                <span>FILMOTECA UNAM</span>
                <span className="text-[#D91E26]">/</span>
                <span>FICUNAM</span>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href={FICUNAM_CARTELERA_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] tracking-[0.2em] text-[#F4F0EA] hover:text-[#D91E26] font-bold inline-flex items-center gap-1 transition"
                >
                  <span>VER CARTELERA OFICIAL</span>
                  <ExternalLink className="w-3 h-3 text-[#D91E26]" />
                </a>
                <span className="text-[10px] tracking-[0.25em] text-[#D91E26] font-bold hidden sm:inline">
                  SOLICITUD DE CORTESÍAS
                </span>
              </div>
            </div>
          </div>

          <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
            <div className="bg-[#111111] border-2 border-[#F4F0EA]/30 p-6 sm:p-8 shadow-[8px_8px_0px_0px_#D91E26]">
              <div className="flex items-start justify-between gap-4 border-b border-[#F4F0EA]/15 pb-5 mb-6">
                <div>
                  <span className="text-[10px] tracking-[0.25em] uppercase text-[#D91E26] font-bold block">
                    REGISTRO DE INVITADOS · FICUNAM
                  </span>
                  <h1 className="font-ficunam-display text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#F4F0EA] mt-1">
                    Solicitar Invitación Personal
                  </h1>
                  <div className="mt-3">
                    <a
                      href={FICUNAM_CARTELERA_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#080808] border border-[#F4F0EA]/30 hover:border-[#D91E26] text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA] transition"
                    >
                      <span>Consultar Cartelera FICUNAM</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#D91E26]" />
                    </a>
                  </div>
                </div>
                <FicunamLogo variant="stamp" className="w-20 h-10 shrink-0" />
              </div>

              {pubSubmitted ? (
                <div className="p-6 bg-[#080808] border border-[#D91E26] space-y-4 text-center">
                  <CheckCircle2 className="w-10 h-10 text-[#D91E26] mx-auto" />
                  <h2 className="font-ficunam-display text-xl font-extrabold uppercase text-[#F4F0EA]">
                    Solicitud Registrada Correctamente
                  </h2>
                  <p className="text-xs text-[#F4F0EA]/80 leading-relaxed max-w-md mx-auto">
                    Tu solicitud ha sido enviada al área de Dirección Ejecutiva de FICUNAM. En caso de ser autorizada, recibirás tu invitación oficial en tu correo electrónico.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPubSubmitted(false);
                      setPubName('');
                      setPubEmail('');
                      setPubCompany('');
                    }}
                    className="px-6 py-2.5 bg-[#F4F0EA] text-[#080808] font-bold text-xs uppercase tracking-[0.18em] border border-[#F4F0EA] shadow-[4px_4px_0px_0px_#D91E26]"
                  >
                    Realizar otra solicitud
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePublicSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={pubName}
                      onChange={(e) => setPubName(e.target.value)}
                      placeholder="Nombre y apellidos"
                      className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
                        Correo electrónico *
                      </label>
                      <input
                        type="email"
                        required
                        value={pubEmail}
                        onChange={(e) => setPubEmail(e.target.value)}
                        placeholder="correo@dominio.com"
                        className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
                        Institución / Medio / Empresa
                      </label>
                      <input
                        type="text"
                        value={pubCompany}
                        onChange={(e) => setPubCompany(e.target.value)}
                        placeholder="Ej. Comunidad UNAM / Prensa"
                        className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
                      Categoría
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {CATEGORIAS_CORTESIA.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPubCategory(cat)}
                          className={`py-2 px-3 text-xs font-bold uppercase tracking-[0.12em] border transition ${
                            pubCategory === cat
                              ? 'bg-[#D91E26] text-white border-[#F4F0EA]'
                              : 'bg-[#080808] text-[#F4F0EA]/70 border-[#F4F0EA]/25 hover:border-[#D91E26]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PASO 1: Seleccionar Película o Evento */}
                  <div className="pt-2 border-t border-[#F4F0EA]/15">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80">
                        1. Seleccionar Película / Función *
                      </label>
                      <a
                        href={FICUNAM_CARTELERA_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D91E26] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Ver cartelera</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <select
                      required
                      value={currentPubMovieTitle}
                      onChange={(e) => handleSelectPubMovie(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
                    >
                      {movieTitles.length === 0 && (
                        <option value="">No hay funciones programadas por el momento</option>
                      )}
                      {movieTitles.map((title) => {
                        const group = moviesGrouped[title];
                        const isEv = group.tipo === 'evento';
                        return (
                          <option key={title} value={title}>
                            {isEv ? `[EVENTO] ${group.pelicula}` : `${group.pelicula} — Dir. ${group.director}`} ({group.horarios.length}{' '}
                            {group.horarios.length > 1 ? 'horarios disponibles' : 'horario'})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* PASO 2: Seleccionar Día, Hora y Sala disponible */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80">
                        2. Seleccionar Día, Hora y Sala disponible *
                      </label>
                      {pubAvailableSchedules.length > 1 && (
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D91E26]">
                          {pubAvailableSchedules.length} fechas en la semana
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {pubAvailableSchedules.map((sched) => {
                        const isSelected = currentPubScreening?.id === sched.id;
                        const dl = getDeadlineInfo(sched.fecha, sched.hora, simulatedNow);
                        return (
                          <div
                            key={sched.id}
                            onClick={() => setPubScreeningId(sched.id)}
                            className={`p-3.5 border cursor-pointer transition ${
                              isSelected
                                ? 'bg-[#D91E26]/15 border-[#D91E26]'
                                : 'bg-[#080808] border-[#F4F0EA]/20 hover:border-[#F4F0EA]/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#F4F0EA]">
                                {sched.salaNombre}
                              </span>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#111111] text-[#D91E26] border border-[#D91E26]/40">
                                {sched.hora} hrs
                              </span>
                            </div>
                            <div className="text-xs text-[#F4F0EA]/80 capitalize mt-1">
                              {formatDateSpanish(sched.fecha)}
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px]">
                              <span className={dl.isExpired ? 'text-rose-400' : 'text-[#F4F0EA]/60'}>
                                {dl.isExpired
                                  ? 'Plazo de confirmación cerrado (-24h)'
                                  : `Límite confirmación: ${dl.deadlineFormatted}`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={pubSending || !currentPubScreening}
                    className="w-full py-3.5 px-4 bg-[#D91E26] hover:bg-[#b8161d] text-white font-bold uppercase tracking-[0.18em] text-xs transition flex items-center justify-center gap-2 border border-[#F4F0EA]/30 shadow-[4px_4px_0px_0px_#F4F0EA]"
                  >
                    <Send className="w-4 h-4" />
                    {pubSending ? 'Enviando solicitud...' : 'Enviar Solicitud de Invitación →'}
                  </button>
                </form>
              )}
            </div>
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  // 3. Pantalla de Contraseña de Administración con estética FICUNAM (Punto 6)
  if (!adminAuthenticated) {
    const handleAdminLogin = async (e) => {
      e.preventDefault();
      setLoginError('');
      setLoggingIn(true);
      try {
        await loginAdmin(passwordInput);
        localStorage.setItem('ficunam_admin_session', 'true');
        setAdminAuthenticated(true);
      } catch (err) {
        setLoginError(err.message || 'Contraseña incorrecta');
      } finally {
        setLoggingIn(false);
      }
    };

    return (
      <div className="min-h-screen bg-[#080808] text-[#F4F0EA] font-ficunam-sans flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111111] border-2 border-[#F4F0EA] p-8 shadow-[8px_8px_0px_0px_#D91E26] space-y-6">
          <div className="flex items-center justify-between border-b border-[#F4F0EA]/20 pb-4">
            <div>
              <span className="text-[10px] tracking-[0.25em] uppercase text-[#D91E26] font-bold block">
                DIRECCIÓN EJECUTIVA · ACCESO RESTRINGIDO
              </span>
              <h1 className="font-ficunam-display text-3xl font-extrabold uppercase tracking-tight text-[#F4F0EA] mt-1">
                FIC<span className="text-[#D91E26]">UNAM</span>
              </h1>
            </div>
            <FicunamLogo variant="stamp" className="w-20 h-10" />
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
                Contraseña de Administración
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
              />
            </div>

            {loginError && (
              <div className="p-3 border border-[#D91E26] bg-[#D91E26]/15 text-xs text-[#F4F0EA]">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3 px-4 bg-[#D91E26] hover:bg-[#b8161d] text-white font-bold uppercase tracking-[0.18em] text-xs transition flex items-center justify-center gap-2 border border-[#F4F0EA]/30 shadow-[4px_4px_0px_0px_#F4F0EA]"
            >
              <Lock className="w-4 h-4" />
              {loggingIn ? 'Verificando...' : 'Ingresar al Sistema →'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleSelectMovie = (title) => {
    setSelectedMovieTitle(title);
    const schedules = moviesGrouped[title]?.horarios || [];
    if (schedules.length > 0) {
      setSelectedScreeningId(schedules[0].id);
    } else {
      setSelectedScreeningId('');
    }
  };

  const handleAddExtraVenue = async (venueData) => {
    const created = await createExtraVenue(venueData);
    setExtraSalas((prev) => [...prev, created]);
    return created;
  };

  const handleAddScreening = async (newScreeningData) => {
    if (backendConnected) {
      const created = await createScreening(newScreeningData);
      setScreenings((prev) => [...prev, created]);
      setSelectedMovieTitle(created.pelicula);
      setSelectedScreeningId(created.id);
    } else {
      const newItem = { id: `func-${Date.now()}`, ...newScreeningData };
      setScreenings((prev) => [...prev, newItem]);
      setSelectedMovieTitle(newItem.pelicula);
      setSelectedScreeningId(newItem.id);
    }
  };

  const handleDeleteScreening = async (id) => {
    if (backendConnected) {
      await removeScreening(id);
    }
    setScreenings((prev) => prev.filter((s) => s.id !== id));
    setCourtesies((prev) => prev.filter((c) => c.screeningId !== id));
  };

  const handleSendCourtesy = async (courtesyData) => {
    if (backendConnected) {
      const res = await createCourtesy(courtesyData);
      setCourtesies((prev) => [res.courtesy, ...prev]);
      return res;
    } else {
      const newCourtesy = {
        id: `cort-${Date.now()}`,
        ...courtesyData,
        estadoSolicitud: 'aprobada',
        estado: 'pendiente',
        entregado: false,
        fechaEnvio: new Date().toISOString()
      };
      setCourtesies((prev) => [newCourtesy, ...prev]);
      return { courtesy: newCourtesy, emailEnviado: true };
    }
  };

  const handleApproveRequest = async (id) => {
    const res = await approvePublicRequest(id);
    setCourtesies((prev) => prev.map((c) => (c.id === id ? res.courtesy : c)));
  };

  const handleRejectRequest = async (id) => {
    await rejectPublicRequest(id);
    setCourtesies((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAcceptInvitation = async (courtesy) => {
    if (backendConnected && courtesy.token) {
      const res = await acceptCourtesyByToken(courtesy.token);
      setCourtesies((prev) =>
        prev.map((c) => (c.id === courtesy.id ? res.courtesy : c))
      );
    } else {
      setCourtesies((prev) =>
        prev.map((c) =>
          c.id === courtesy.id
            ? { ...c, estado: 'aceptada', fechaRespuesta: new Date().toISOString() }
            : c
        )
      );
    }
  };

  const handleToggleDelivered = async (courtesyId) => {
    if (backendConnected) {
      const updated = await toggleCourtesyDelivered(courtesyId);
      setCourtesies((prev) =>
        prev.map((c) => (c.id === courtesyId ? updated : c))
      );
    } else {
      setCourtesies((prev) =>
        prev.map((c) => {
          if (c.id !== courtesyId) return c;
          const nextDelivered = !c.entregado;
          return {
            ...c,
            estado: nextDelivered ? 'aceptada' : c.estado,
            entregado: nextDelivered
          };
        })
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#F4F0EA] font-ficunam-sans selection:bg-[#D91E26] selection:text-white">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingRequestsCount={pendingRequests.length}
        onLogout={() => {
          localStorage.removeItem('ficunam_admin_session');
          setAdminAuthenticated(false);
          setPasswordInput('');
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 no-print">
        <div className="flex items-center justify-between px-3.5 py-2 bg-[#111111] border border-[#F4F0EA]/20 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                backendConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span>
              {loadingInitial
                ? 'Conectando con el servidor...'
                : backendConnected
                ? 'Conectado en tiempo real a MongoDB Atlas'
                : 'Modo sin conexión'}
            </span>
          </div>
          {backendConnected && (
            <button
              type="button"
              onClick={loadFromBackend}
              className="text-[11px] uppercase tracking-wider text-[#D91E26] hover:underline font-bold"
            >
              Sincronizar ahora ↻
            </button>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'funciones' && (
          <FuncionesView
            screenings={screenings}
            salas={allSalas}
            moviesGrouped={moviesGrouped}
            occupancyByScreening={occupancyByScreening}
            onAddScreening={handleAddScreening}
            onAddExtraVenue={handleAddExtraVenue}
            onDeleteScreening={handleDeleteScreening}
            onGoToCourtesyForMovie={(movieTitle) => {
              handleSelectMovie(movieTitle);
              setActiveTab('cortesias');
            }}
          />
        )}

        {activeTab === 'cortesias' && (
          <CortesiasView
            screenings={screenings}
            salas={allSalas}
            courtesies={approvedCourtesies}
            moviesGrouped={moviesGrouped}
            movieTitles={movieTitles}
            selectedMovieTitle={selectedMovieTitle}
            selectedScreeningId={selectedScreeningId}
            onSelectMovie={handleSelectMovie}
            onSelectScreeningId={setSelectedScreeningId}
            occupancyByScreening={occupancyByScreening}
            simulatedNow={new Date().toISOString()}
            onSendCourtesy={handleSendCourtesy}
            onAcceptInvitation={handleAcceptInvitation}
          />
        )}

        {activeTab === 'solicitudes' && (
          <div className="bg-[#111111] border-2 border-[#F4F0EA]/25 p-6 shadow-[6px_6px_0px_0px_#D91E26]">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b border-[#F4F0EA]/20">
              <div>
                <span className="text-[10px] tracking-[0.25em] uppercase text-[#D91E26] font-bold block">
                  REGISTRO EXTERNO DE INVITADOS · FICUNAM
                </span>
                <h2 className="font-ficunam-display text-2xl font-extrabold uppercase tracking-tight text-[#F4F0EA] mt-0.5">
                  Solicitudes de Cortesía Pendientes ({pendingRequests.length})
                </h2>
                <p className="text-xs text-[#F4F0EA]/70 mt-1">
                  Al aceptar una solicitud se envía automáticamente la invitación por correo electrónico. Al denegarla desaparece de la lista sin notificar.
                </p>
              </div>

              <div className="px-3.5 py-2 bg-[#080808] border border-[#F4F0EA]/30 text-xs flex items-center gap-3">
                <span className="text-[#F4F0EA]/60 uppercase text-[10px] tracking-wider">Link público:</span>
                <span className="font-mono text-[#D91E26] font-bold">
                  {typeof window !== 'undefined' ? `${window.location.origin}/solicitar` : '/solicitar'}
                </span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/solicitar`)}
                  className="px-2 py-1 bg-[#F4F0EA] text-[#080808] font-bold text-[10px] uppercase inline-flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copiar
                </button>
              </div>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="p-10 text-center border border-[#F4F0EA]/15 bg-[#080808] text-xs uppercase tracking-[0.18em] text-[#F4F0EA]/50">
                No hay solicitudes pendientes en este momento.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => {
                  const s = screenings.find((item) => item.id === req.screeningId);
                  const sala = allSalas.find((sa) => sa.id === s?.salaId);
                  return (
                    <div
                      key={req.id}
                      className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#080808] border border-[#F4F0EA]/25 hover:border-[#D91E26] transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm uppercase text-[#F4F0EA]">{req.nombre}</span>
                          <span className="text-xs font-mono text-[#F4F0EA]/60">&lt;{req.correo}&gt;</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#D91E26]/20 border border-[#D91E26] text-[#F4F0EA]">
                            {req.categoria}
                          </span>
                        </div>
                        <div className="text-xs text-[#F4F0EA]/70">
                          Institución / Medio: <strong className="text-[#F4F0EA]">{req.empresa || 'Público General'}</strong>
                        </div>
                        {s && (
                          <div className="text-xs text-[#D91E26] font-bold uppercase tracking-wider pt-0.5">
                            [{s.tipo === 'evento' ? 'EVENTO' : 'PELÍCULA'}] {s.pelicula} · {sala?.nombre || s.salaId} · {formatDateSpanish(s.fecha)} ({s.hora} hrs)
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleApproveRequest(req.id)}
                          className="px-4 py-2 bg-[#F4F0EA] hover:bg-white text-[#080808] font-bold text-xs uppercase tracking-[0.15em] border border-[#F4F0EA] shadow-[3px_3px_0px_0px_#D91E26] inline-flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#D91E26]" />
                          Aceptar y Enviar Correo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-3.5 py-2 bg-[#111111] hover:bg-[#D91E26] text-[#F4F0EA] hover:text-white font-bold text-xs uppercase tracking-[0.15em] border border-[#F4F0EA]/30 transition inline-flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          Denegar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'taquilla' && (
          <TaquillaView
            courtesies={approvedCourtesies}
            screenings={screenings}
            onToggleDelivered={handleToggleDelivered}
          />
        )}

        {activeTab === 'resumen' && (
          <ResumenView screenings={screenings} salas={allSalas} courtesies={approvedCourtesies} />
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL OCULTO DE DESARROLLADOR (ACTIVADO CON SHIFT+ALT+D) */}
      {/* ========================================================= */}
      {showSecretResetModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#111111] border-2 border-[#D91E26] p-6 shadow-[8px_8px_0px_0px_#F4F0EA] space-y-5">
            <div className="flex items-start justify-between border-b border-[#F4F0EA]/20 pb-3">
              <div>
                <span className="text-[10px] tracking-[0.25em] uppercase text-[#D91E26] font-bold block">
                  CONSOLA DE DESARROLLADOR · ACCESO OCULTO
                </span>
                <h3 className="font-ficunam-display text-xl font-extrabold uppercase text-[#F4F0EA] mt-0.5">
                  Limpieza Total de Base de Datos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSecretResetModal(false)}
                className="text-xs text-[#F4F0EA]/60 hover:text-white uppercase font-bold"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="p-3.5 bg-[#080808] border border-amber-500/50 text-amber-200 text-xs space-y-1">
              <div className="font-bold uppercase flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="w-4 h-4" /> Acción Irreversible
              </div>
              <p className="text-[#F4F0EA]/80 leading-relaxed">
                Esto eliminará todas las <strong>películas, eventos, horarios, salas extra, solicitudes públicas e invitaciones</strong> de MongoDB para dejar el sistema en blanco.
              </p>
            </div>

            <form onSubmit={handleMasterReset} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
                  PIN Maestro de Creador
                </label>
                <input
                  type="password"
                  required
                  value={masterPinInput}
                  onChange={(e) => setMasterPinInput(e.target.value)}
                  placeholder="Ingresa tu PIN de desarrollador"
                  className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
                />
              </div>

              {resetStatus && (
                <div
                  className={`p-3 border text-xs ${
                    resetStatus.type === 'error'
                      ? 'border-rose-500 bg-rose-950/40 text-rose-200'
                      : 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                  }`}
                >
                  {resetStatus.message}
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSecretResetModal(false)}
                  className="flex-1 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-xs font-bold uppercase tracking-[0.15em] text-[#F4F0EA]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 py-2.5 bg-[#D91E26] hover:bg-[#b8161d] text-white text-xs font-bold uppercase tracking-[0.15em] border border-[#F4F0EA] inline-flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {resetting ? 'Borrando...' : 'Vaciar Todo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}