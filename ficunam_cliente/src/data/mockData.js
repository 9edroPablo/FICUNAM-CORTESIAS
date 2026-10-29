export const INITIAL_SCREENINGS = [
  {
    id: 'func-1',
    pelicula: 'El samurái y el prisionero',
    director: 'Kiyoshi Kurosawa',
    seccion: 'TRIBUTO · MEDALLA FILMOTECA UNAM',
    salaId: 'covarrubias',
    fecha: '2026-11-06',
    hora: '19:30'
  },
  {
    id: 'func-2',
    pelicula: 'El samurái y el prisionero',
    director: 'Kiyoshi Kurosawa',
    seccion: 'TRIBUTO · MEDALLA FILMOTECA UNAM',
    salaId: 'bracho',
    fecha: '2026-11-08',
    hora: '18:00'
  },
  {
    id: 'func-3',
    pelicula: 'El jardín que soñamos',
    director: 'Joaquín del Paso',
    seccion: 'PREMIERES FICUNAM',
    salaId: 'bracho',
    fecha: '2026-11-13',
    hora: '17:00'
  },
  {
    id: 'func-4',
    pelicula: 'El jardín que soñamos',
    director: 'Joaquín del Paso',
    seccion: 'PREMIERES FICUNAM',
    salaId: 'revueltas',
    fecha: '2026-11-14',
    hora: '20:00'
  },
  {
    id: 'func-5',
    pelicula: 'Acá pasó',
    director: 'Edén Bastida Kullick',
    seccion: 'AHORA MÉXICO',
    salaId: 'monsivais',
    fecha: '2026-11-07',
    hora: '18:30'
  },
  {
    id: 'func-6',
    pelicula: 'El arte es oscuro y está lleno de horrores',
    director: 'Artemio Narro',
    seccion: 'AHORA MÉXICO',
    salaId: 'espiga',
    fecha: '2026-11-10',
    hora: '20:30'
  }
];

export const INITIAL_COURTESIES = [
  {
    id: 'cort-101',
    nombre: 'Elena Poniatowska Amor',
    empresa: 'Fundación Elena Poniatowska',
    correo: 'elena.invitada@cultura.mx',
    categoria: 'Invitados',
    screeningId: 'func-1',
    estado: 'aceptada',
    entregado: true,
    fechaEnvio: '2026-11-01T10:30:00',
    fechaRespuesta: '2026-11-02T14:20:00',
    fechaEntrega: '2026-11-06T18:50:00'
  },
  {
    id: 'cort-102',
    nombre: 'Carlos Bonfil',
    empresa: 'La Jornada',
    correo: 'cbonfil@jornada.com.mx',
    categoria: 'Prensa',
    screeningId: 'func-1',
    estado: 'aceptada',
    entregado: true,
    fechaEnvio: '2026-11-01T11:00:00',
    fechaRespuesta: '2026-11-01T16:45:00',
    fechaEntrega: '2026-11-06T19:05:00'
  },
  {
    id: 'cort-103',
    nombre: 'Mariana G. Rodríguez',
    empresa: 'MUBI Latinoamérica',
    correo: 'mariana@mubi.com',
    categoria: 'Aliados',
    screeningId: 'func-1',
    estado: 'aceptada',
    entregado: false,
    fechaEnvio: '2026-11-02T09:15:00',
    fechaRespuesta: '2026-11-03T12:00:00',
    fechaEntrega: null
  },
  {
    id: 'cort-104',
    nombre: 'Alejandro Gómez',
    empresa: 'Canal 22 / TV UNAM',
    correo: 'agomez@canal22.org.mx',
    categoria: 'Medios',
    screeningId: 'func-3',
    estado: 'aceptada',
    entregado: true,
    fechaEnvio: '2026-11-08T12:00:00',
    fechaRespuesta: '2026-11-09T10:15:00',
    fechaEntrega: '2026-11-13T16:30:00'
  },
  {
    id: 'cort-105',
    nombre: 'Sofía Villalobos',
    empresa: 'Revista Código',
    correo: 'sofia@revistacodigo.com',
    categoria: 'Prensa',
    screeningId: 'func-3',
    estado: 'pendiente',
    entregado: false,
    fechaEnvio: '2026-11-09T15:40:00',
    fechaRespuesta: null,
    fechaEntrega: null
  },
  {
    id: 'cort-106',
    nombre: 'Roberto Hernández',
    empresa: 'Cineteca Nacional',
    correo: 'rhernandez@cinetecanacional.net',
    categoria: 'Aliados',
    screeningId: 'func-5',
    estado: 'aceptada',
    entregado: true,
    fechaEnvio: '2026-11-02T13:10:00',
    fechaRespuesta: '2026-11-03T11:30:00',
    fechaEntrega: '2026-11-07T18:10:00'
  }
];
