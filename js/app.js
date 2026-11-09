/* =========================================================
   NOVANTIQ Quintas · lógica de la app
   Secciones (buscá los títulos que empiezan con =====):
   utilidades · reglas de negocio · datos de ejemplo · estado y guardado ·
   calendario · página de la quinta · reserva · panel · portal · creador ·
   escena animada · fotos · navegación
   Para cambiar las quintas cargadas, editá la función seedQuintas().
   ========================================================= */
(() => {
  'use strict';
  /* ======================= utilidades ======================= */
  const $ = (s, r = document) => r.querySelector(s),
    $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NF = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const money = n => NF.format(n);
  const shortL = n =>
    n >= 1e6
      ? '$' + (n / 1e6).toFixed(2).replace(/0$/, '').replace('.', ',') + ' M'
      : '$' + Math.round(n / 1000) + ' mil';
  const shortS = n => (n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + 'M' : Math.round(n / 1000) + 'k');
  const pad = n => String(n).padStart(2, '0');
  const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const isoD = d => iso(d.getFullYear(), d.getMonth(), d.getDate());
  const parse = s => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const now = new Date();
  const TODAY = isoD(now);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const DF_L = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const DF_M = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });
  const DF_WD = new Intl.DateTimeFormat('es-AR', { weekday: 'short' });
  const DF_MO = new Intl.DateTimeFormat('es-AR', { month: 'short' });
  const fLarga = s => cap(DF_L.format(parse(s)).replace(',', ''));
  const wd = s => cap(DF_WD.format(parse(s))).replace('.', '');
  const esc = s =>
    String(s).replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const digits = s => parseInt(String(s).replace(/\D/g, ''), 10) || 0;
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 3600);
  }
  function mulberry(a) {
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ======================= reglas de negocio ======================= */
  const ESPECIALES = new Set([
    '2026-12-24',
    '2026-12-25',
    '2026-12-31',
    '2027-01-01',
    '2027-12-24',
    '2027-12-25',
    '2027-12-31',
  ]);
  const FERIADOS = new Set(['2026-11-23', '2026-12-08', '2027-02-15', '2027-02-16']);
  const TURNOS = { dia: { n: 'Día', h: '10 a 19 h' }, noche: { n: 'Noche', h: '21 a 5 h' } };
  const EXTRAS = [
    { id: 'vajilla', n: 'Vajilla completa', p: 25000, usd: 18 },
    { id: 'lena', n: 'Leña y carbón para el asado', p: 18000, usd: 13 },
    { id: 'hora', n: 'Hora extra', p: 30000, usd: 22 },
  ];
  const MOTIVOS = [
    'Despedida de año',
    'Cumpleaños',
    'Juntada de amigos',
    'Evento de empresa',
    'Juntada familiar',
    'Otro',
  ];
  function tipo(ds) {
    if (ESPECIALES.has(ds)) return 'especial';
    const w = parse(ds).getDay();
    if (FERIADOS.has(ds) || w === 5 || w === 6 || w === 0) return 'finde';
    return 'semana';
  }
  const TIPO_L = {
    semana: 'Tarifa de semana',
    finde: 'Tarifa de fin de semana o feriado',
    especial: 'Fecha especial de fiestas',
  };
  const precio = (q, ds) => q.precios[tipo(ds)];
  const senaDe = t => Math.round((t * 0.3) / 1000) * 1000;
  /* Monedas: cada quinta cobra en pesos (por defecto) o en dólares (moneda:'USD') */
  const DOLAR_REF = 1450; // solo se usa para ordenar y filtrar en el buscador
  const isUSD = q => !!q && q.moneda === 'USD';
  const mq = (q, n) => (isUSD(q) ? 'US$ ' + Math.round(n).toLocaleString('es-AR') : money(n));
  const sLq = (q, n) => (isUSD(q) ? 'US$ ' + n : shortL(n)),
    sSq = (q, n) => (isUSD(q) ? 'US$' + n : shortS(n));
  const senaQ = (q, t) => (isUSD(q) ? Math.round(t * 0.3) : senaDe(t));
  const exP = (q, e) => (isUSD(q) ? e.usd : e.p);
  const depTxt = q => (isUSD(q) ? 'US$ 100' : '$100.000');
  const enPesos = (q, n) => (isUSD(q) ? n * DOLAR_REF : n);

  const months = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push([d.getFullYear(), d.getMonth()]);
  }
  const LAST_DAY = isoD(new Date(months[3][0], months[3][1] + 1, 0));

  /* ======================= datos de ejemplo ======================= */
  const FIRST = [
    'Lucía',
    'Martín',
    'Sofía',
    'Nicolás',
    'Camila',
    'Diego',
    'Paula',
    'Tomás',
    'Agustina',
    'Federico',
    'Valentina',
    'Juan',
    'Carla',
    'Matías',
    'Florencia',
    'Gonzalo',
    'Micaela',
    'Leandro',
  ];
  const LASTI = ['F.', 'G.', 'R.', 'P.', 'M.', 'S.', 'L.', 'B.', 'D.', 'C.', 'V.', 'A.'];
  const EMPRESAS = [
    'Logística Sur',
    'Estudio Ríos',
    'Agencia Faro',
    'Gimnasio Fuerza',
    'Contadores Asociados',
    'Club de corredores',
    'Inmobiliaria Norte',
    'Taller Ruta 3',
    'Colegio de Martilleros',
    'Equipo de ventas Delta',
    'Ferretería El Clavo',
    'Escuela de danza Alma',
  ];
  const REVIEWS = [
    [
      'Romina A.',
      'Fuimos 35 para la despedida del trabajo. La pileta impecable y el quincho enorme. Reservamos desde el celular en dos minutos.',
    ],
    [
      'Pablo T.',
      'El calendario es lo mejor: vimos el sábado libre, pagamos la seña y listo. Nada de esperar que te contesten.',
    ],
    ['Mariela G.', 'Muy limpia y el dueño súper atento. Los chicos no salieron de la pileta en todo el día.'],
    ['Hernán S.', 'La parrilla es grandísima, entraron 12 kilos de asado sin problema. Volvemos en enero.'],
    ['Natalia P.', 'Hicimos el cumple de 40 a la noche con las luces del quincho prendidas. Quedó hermoso.'],
    ['Ezequiel R.', 'Precio justo para todo lo que tiene. La seña con Mercado Pago muy cómoda.'],
  ];
  const pileTxt = q =>
    `${q.piletaNombre || 'Pileta'}${q.pileta ? ' de ' + q.pileta : ''}${q.clima ? ' climatizada' : ''}`;
  const quinchoTxt = q => `${q.quinchoNombre || 'Quincho'}${q.quincho ? ' de ' + q.quincho : ''}`;
  const hasDia = q => !!(q.modos && q.modos.dia),
    hasEst = q => !!(q.modos && q.modos.estadia && q.est);
  const turnosDe = q => (q.turnos && q.turnos.length ? q.turnos : ['dia', 'noche']);
  const EXTRAS_EST = [
    { id: 'late', n: 'Salida tarde (hasta las 18 h)', p: 40000, usd: 28 },
    { id: 'lena', n: 'Leña y carbón para el asado', p: 18000, usd: 13 },
  ];
  const MOTIVOS_EST = [
    'Escapada de fin de semana',
    'Vacaciones en familia',
    'Juntada de amigos',
    'Fiestas de fin de año',
    'Otro',
  ];
  const DF_MES = new Intl.DateTimeFormat('es-AR', { month: 'long' });
  const addDays = (ds, n) => {
    const d = parse(ds);
    d.setDate(d.getDate() + n);
    return isoD(d);
  };
  const nightsBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  function rangoTxt(a, b) {
    const A = parse(a),
      B = parse(b),
      mA = DF_MES.format(A),
      mB = DF_MES.format(B);
    return `Del ${wd(a).toLowerCase()} ${A.getDate()}${mA !== mB ? ' de ' + mA : ''} al ${wd(b).toLowerCase()} ${B.getDate()} de ${mB}`;
  }
  const plural = (n, s, p) => n + ' ' + (n === 1 ? s : p || s + 's');
  function INCLUYE(q) {
    if (q.incluye && q.incluye.length) return q.incluye;
    const l = [
      `${pileTxt(q)} con reposeras`,
      'Parrilla con utensilios y mesada',
      `${quinchoTxt(q)} con mesas y sillas para ${q.cap} personas`,
      'Heladera, freezer y horno',
      q.cancha ? 'Cancha de fútbol 5 con pelotas' : 'Parque con red de vóley y sombra',
      'Wifi y equipo de música',
    ];
    if (hasEst(q))
      l.push(
        `${plural(q.est.dormitorios, 'dormitorio')} y ${plural(q.est.banos, 'baño')}`,
        'Ropa de cama y toallas',
        'Cocina equipada',
      );
    l.push('Limpieza final');
    return l;
  }
  function REGLAS(q) {
    const l = [
      `Máximo ${q.cap} personas, contando chicos`,
      'Sin pirotecnia, tampoco en Navidad y Año Nuevo',
      'Chicos en la pileta siempre con un adulto mirando',
      'Mascotas solo con aviso previo',
    ];
    if (hasEst(q))
      l.unshift(
        `Entrada desde las ${q.est.checkin} y salida hasta las ${q.est.checkout}`,
        `Mínimo ${plural(q.est.min, 'noche')} por reserva`,
      );
    if (hasDia(q))
      l.push(
        `Uso por día: ${turnosDe(q)
          .map(t => TURNOS[t].n.toLowerCase() + ' de ' + TURNOS[t].h)
          .join(' o ')}`,
      );
    l.push('Música con volumen moderado después de las 2 h');
    return l;
  }

  function genBookings(q, dens, seed) {
    const rng = mulberry(seed),
      pick = a => a[Math.floor(rng() * a.length)],
      out = [];
    const start = parse(TODAY);
    for (let i = 0; i < 125; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
        ds = isoD(d),
        tp = tipo(ds),
        dec = d.getMonth() === 11;
      for (const t of turnosDe(q)) {
        let p = tp === 'especial' ? 0.82 : tp === 'finde' ? (dec ? 0.6 : 0.3) : dec ? 0.12 : 0.05;
        if (t === 'noche' && dec && tp === 'finde') p += 0.12;
        if (rng() < p * dens) {
          const emp = dec && tp !== 'especial' && rng() < 0.55;
          const nombre = emp ? pick(EMPRESAS) : pick(FIRST) + ' ' + pick(LASTI);
          const motivo = emp
            ? 'Despedida de año'
            : tp === 'especial'
              ? /-12-2[45]$/.test(ds)
                ? 'Navidad'
                : 'Año Nuevo'
              : pick(['Cumpleaños', 'Juntada de amigos', 'Juntada familiar', 'Despedida de año']);
          const total = q.precios[tp],
            estado = rng() < 0.1 ? 'pendiente' : 'confirmada';
          out.push({
            id: 'b' + seed + '-' + i + t,
            code: 'Q-' + (1000 + Math.floor(rng() * 8999)),
            date: ds,
            turno: t,
            nombre,
            motivo,
            personas: Math.max(Math.min(10, q.cap), Math.round(q.cap * (0.45 + rng() * 0.55))),
            estado,
            total,
            sena: estado === 'confirmada' ? senaQ(q, total) : 0,
            nuevo: false,
          });
        }
      }
    }
    return out;
  }
  const precioNoche = (q, ds) => q.est.precios[tipo(ds)];
  function nightsTotal(q, a, b) {
    let t = 0;
    for (let d = a; d < b; d = addDays(d, 1)) t += precioNoche(q, d);
    return t;
  }
  function genStays(q, dens, seed) {
    const rng = mulberry(seed),
      pick = a => a[Math.floor(rng() * a.length)],
      out = [];
    let i = 0;
    while (i < 125) {
      const ds = addDays(TODAY, i),
        d = parse(ds),
        w = d.getDay(),
        alta = d.getMonth() === 11 || d.getMonth() === 0;
      let n = 0;
      if (/-12-2[34]$/.test(ds) || /-12-3[01]$/.test(ds)) {
        if (rng() < 0.85 * dens) n = 3;
      } else if (w === 5) {
        if (rng() < (alta ? 0.7 : 0.42) * dens) n = 2;
      } else if (d.getMonth() === 0 && w >= 1 && w <= 3) {
        if (rng() < 0.3 * dens) n = 4 + Math.floor(rng() * 3);
      }
      if (n) {
        const hasta = addDays(ds, n),
          estado = rng() < 0.12 ? 'pendiente' : 'confirmada',
          total = nightsTotal(q, ds, hasta);
        out.push({
          id: 's' + seed + '-' + i,
          tipo: 'estadia',
          code: 'Q-' + (1000 + Math.floor(rng() * 8999)),
          desde: ds,
          hasta,
          noches: n,
          nombre: pick(FIRST) + ' ' + pick(LASTI),
          motivo: pick(MOTIVOS_EST.slice(0, 4)),
          personas: Math.max(2, Math.round(q.cap * (0.5 + rng() * 0.5))),
          estado,
          total,
          sena: estado === 'confirmada' ? senaQ(q, total) : 0,
          nuevo: false,
        });
        i += n;
        continue;
      }
      i++;
    }
    return out;
  }
  function mkQuinta(o, dens, seed) {
    const q = Object.assign(
      {
        blocked: [],
        bookings: [],
        custom: false,
        ops: 12,
        rating: 4.8,
        modos: { dia: true, estadia: false },
        turnos: ['dia', 'noche'],
      },
      o,
    );
    q.look = Object.assign(
      { deck: '#E7DECB', w1: '#63D6E2', w2: '#1A8DB2', floor: '#C68E66', patio: '#CDB898', seed },
      o.look || {},
    );
    if (!o.bookings) {
      q.bookings = hasEst(q) ? genStays(q, dens, seed) : [];
      if (hasDia(q)) {
        const dayB = genBookings(q, hasEst(q) ? dens * 0.35 : dens, seed + 1).filter(
          b => !stayTouch(q, b.date) && !isBlk(q, b.date),
        );
        q.bookings = q.bookings.concat(dayB);
      }
      if (o.libres) {
        const lim = addDays(TODAY, o.libres);
        q.bookings = q.bookings.filter(b => (b.tipo === 'estadia' ? b.desde : b.date) >= lim);
      }
    }
    return q;
  }
  function seedQuintas() {
    const aromosB = [
      ['2026-11-14', 'noche', 'Camila V.', 'Cumpleaños', 30, 'confirmada'],
      ['2026-11-15', 'dia', 'Familia Ortiz', 'Juntada familiar', 25, 'confirmada'],
      ['2026-11-21', 'noche', 'Nicolás P.', 'Juntada de amigos', 35, 'confirmada'],
      ['2026-11-22', 'dia', 'Estudio Ríos', 'Evento de empresa', 22, 'confirmada'],
      ['2026-11-28', 'dia', 'Agencia Faro', 'Despedida de año', 26, 'confirmada'],
      ['2026-11-28', 'noche', 'Agustina M.', 'Cumpleaños', 40, 'confirmada'],
      ['2026-12-05', 'noche', 'Sofía R.', 'Cumpleaños', 28, 'pendiente'],
      ['2026-12-11', 'noche', 'Logística Sur', 'Despedida de año', 38, 'confirmada'],
      ['2026-12-12', 'noche', 'Colegio de Martilleros', 'Despedida de año', 40, 'confirmada'],
      ['2026-12-12', 'dia', 'Lucía F.', 'Despedida de año', 20, 'confirmada'],
      ['2026-12-13', 'dia', 'Gimnasio Fuerza', 'Despedida de año', 30, 'confirmada'],
      ['2026-12-18', 'noche', 'Contadores Asociados', 'Despedida de año', 36, 'confirmada'],
      ['2026-12-19', 'noche', 'Martín G.', 'Despedida de año', 40, 'pendiente'],
      ['2026-12-19', 'dia', 'Familia Benítez', 'Juntada familiar', 18, 'confirmada'],
      ['2026-12-20', 'dia', 'Club de corredores', 'Despedida de año', 32, 'confirmada'],
      ['2026-12-24', 'noche', 'Familia Domínguez', 'Navidad', 30, 'confirmada'],
      ['2026-12-25', 'dia', 'Familia Domínguez', 'Navidad', 30, 'confirmada'],
      ['2026-12-31', 'noche', 'Amigos de Tomás', 'Año Nuevo', 40, 'confirmada'],
      ['2027-01-01', 'dia', 'Amigos de Tomás', 'Año Nuevo', 40, 'confirmada'],
      ['2027-01-09', 'dia', 'Paula S.', 'Cumpleaños', 25, 'confirmada'],
      ['2027-01-16', 'dia', 'Familia Ortiz', 'Juntada familiar', 20, 'confirmada'],
      ['2027-01-17', 'dia', 'Diego L.', 'Juntada de amigos', 22, 'confirmada'],
    ];
    const P = (s, f, e) => ({ semana: s * 1000, finde: f * 1000, especial: e * 1000 });
    const list = [
      mkQuinta(
        {
          id: 'quinta-areco',
          fotos: [
            { src: 'fotos/areco/01-pileta.jpg', cap: 'Pileta con reposeras' },
            { src: 'fotos/areco/02-pileta-reposeras.jpg', cap: 'Pileta y solárium' },
            { src: 'fotos/areco/03-parrilla-fogon.jpg', cap: 'Parrilla y fogón' },
            { src: 'fotos/areco/04-pileta-noche.jpg', cap: 'La pileta de noche, con luces' },
            { src: 'fotos/areco/05-galeria-mesa-larga.jpg', cap: 'Galería con mesa larga' },
            { src: 'fotos/areco/06-parque-atardecer.jpg', cap: 'El parque al atardecer' },
            { src: 'fotos/areco/07-metegol.jpg', cap: 'Metegol en la galería' },
            { src: 'fotos/areco/08-cocina.jpg', cap: 'Cocina equipada' },
            { src: 'fotos/areco/09-dormitorio-1.jpg', cap: 'Dormitorio' },
            { src: 'fotos/areco/10-dormitorio-2.jpg', cap: 'Dormitorio' },
            { src: 'fotos/areco/11-dormitorio-3.jpg', cap: 'Dormitorio' },
            { src: 'fotos/areco/12-dormitorio-4.jpg', cap: 'Dormitorio' },
            { src: 'fotos/areco/13-bano-1.jpg', cap: 'Baño' },
            { src: 'fotos/areco/14-bano-2.jpg', cap: 'Baño' },
            { src: 'fotos/areco/15-lenero.jpg', cap: 'Leñero' },
            { src: 'fotos/areco/16-mesa-parque.jpg', cap: 'Mesa en el parque' },
            { src: 'fotos/areco/17-pileta-noche-2.jpg', cap: 'La pileta de noche' },
          ],
          nombre: 'Casa Quinta en Areco',
          zona: 'San Antonio de Areco',
          dist: 'a 1 h 30 de CABA',
          dueno: '',
          cap: 13,
          pileta: '',
          clima: false,
          cancha: false,
          quincho: '',
          quinchoNombre: 'Galería',
          modos: { dia: true, estadia: true },
          turnos: ['dia'],
          precios: P(250, 250, 250),
          feats: ['Fogón', 'Metegol'],
          est: {
            precios: P(320, 320, 320),
            min: 1,
            checkin: '14 h',
            checkout: '11 h',
            dormitorios: 4,
            banos: 2,
          },
          incluye: [
            'Pileta con reposeras y solárium',
            'Parrilla y fogón con bancos',
            'Galería con mesa larga y luces',
            'Metegol',
            'Cocina equipada',
            '4 dormitorios',
            '2 baños completos',
            'Parque amplio con árboles',
            'Leñero',
          ],
          rating: 0,
          ops: 0,
          libres: 12,
          look: { floor: '#B9B3A8', deck: '#E9E0CE' },
        },
        0.6,
        131,
      ),
      mkQuinta(
        {
          id: 'quinta-berazategui',
          fotos: [
            { src: 'fotos/berazategui/01-pileta-sombrilla.jpg', cap: 'Gran pileta con sombrilla de paja' },
            { src: 'fotos/berazategui/02-pileta-tenis.jpg', cap: 'Pileta y cancha de tenis' },
            { src: 'fotos/berazategui/03-cancha-futbol-tenis.jpg', cap: 'Cancha de fútbol y de tenis' },
            { src: 'fotos/berazategui/04-parrilla-fogon.jpg', cap: 'Asador y parrilla techada con fogón' },
            {
              src: 'fotos/berazategui/05-galeria-pingpong-metegol.jpg',
              cap: 'Galería con ping pong y metegol',
            },
            { src: 'fotos/berazategui/06-juegos-chicos.jpg', cap: 'Juegos para chicos' },
            { src: 'fotos/berazategui/07-bano.jpg', cap: 'Baño completo' },
          ],
          nombre: 'Casa Quinta en Berazategui',
          zona: 'Berazategui',
          dist: 'a 40 min de CABA',
          dueno: '',
          cap: 40,
          pileta: '',
          piletaNombre: 'Gran pileta',
          clima: false,
          cancha: true,
          quincho: '',
          modos: { dia: true, estadia: false },
          turnos: ['dia'],
          moneda: 'USD',
          feats: ['Cancha de tenis', 'Ping pong y metegol', 'Juegos para chicos'],
          precios: { semana: 170, finde: 170, especial: 170 },
          incluye: [
            'Gran pileta con solárium y sombrilla de paja',
            'Cancha de tenis',
            'Cancha de fútbol',
            'Quincho',
            'Asador y parrilla techada con fogón',
            'Galería con ping pong y metegol',
            'Juegos para chicos: hamacas y mangrullo',
            'Mesas altas y sillas en el parque',
            'Baño completo',
          ],
          rating: 0,
          ops: 0,
          libres: 12,
          look: { floor: '#D8CBB0', w1: '#4FCBEA', w2: '#1478B8' },
        },
        0.7,
        151,
      ),
      mkQuinta(
        {
          id: 'los-aromos',
          nombre: 'Quinta Los Aromos',
          zona: 'General Rodríguez',
          dist: 'a 45 min de CABA',
          dueno: 'Roberto',
          cap: 40,
          pileta: '10 × 5 m',
          clima: false,
          cancha: true,
          quincho: '60 m²',
          precios: P(180, 280, 550),
          rating: 4.8,
          ops: 41,
          blocked: ['2026-12-26', '2026-12-27', '2027-01-02'],
          bookings: [],
        },
        1,
        11,
      ),
      mkQuinta(
        {
          id: 'la-escondida',
          nombre: 'La Escondida',
          zona: 'Pilar',
          dist: 'a 50 min de CABA',
          dueno: 'Marcela',
          cap: 30,
          pileta: '8 × 4 m',
          clima: true,
          cancha: false,
          quincho: '45 m²',
          precios: P(220, 320, 600),
          rating: 4.9,
          ops: 27,
          look: { floor: '#B9B3A8', deck: '#DCD6CC', patio: '#C9C2B4' },
        },
        0.9,
        23,
      ),
      mkQuinta(
        {
          id: 'don-ernesto',
          nombre: 'Quinta Don Ernesto',
          zona: 'Cañuelas',
          dist: 'a 1 h 10 de CABA',
          dueno: 'Ernesto',
          cap: 60,
          pileta: '12 × 6 m',
          clima: false,
          cancha: true,
          quincho: '90 m²',
          precios: P(160, 250, 480),
          rating: 4.6,
          ops: 58,
          look: { floor: '#A97C50' },
        },
        1.1,
        37,
      ),
      mkQuinta(
        {
          id: 'el-ombu',
          nombre: 'El Ombú',
          zona: 'Marcos Paz',
          dist: 'a 1 h de CABA',
          dueno: 'Silvia',
          cap: 12,
          pileta: '9 × 4 m',
          clima: false,
          cancha: false,
          quincho: '50 m²',
          precios: P(150, 230, 450),
          modos: { dia: false, estadia: true },
          est: {
            precios: P(190, 260, 420),
            min: 2,
            checkin: '15 h',
            checkout: '11 h',
            dormitorios: 3,
            banos: 2,
          },
          rating: 4.7,
          ops: 19,
          look: { floor: '#D8CBB0', w1: '#7FDCE0', w2: '#2A9DB5' },
        },
        0.8,
        41,
      ),
      mkQuinta(
        {
          id: 'los-tilos',
          nombre: 'Los Tilos',
          zona: 'Escobar',
          dist: 'a 55 min de CABA',
          dueno: 'Gustavo',
          cap: 45,
          pileta: '10 × 5 m',
          clima: true,
          cancha: true,
          quincho: '70 m²',
          precios: P(240, 350, 650),
          rating: 4.9,
          ops: 33,
          look: { floor: '#B9B3A8', deck: '#EDE7DA' },
        },
        1,
        53,
      ),
      mkQuinta(
        {
          id: 'santa-clara',
          nombre: 'Santa Clara',
          zona: 'Luján',
          dist: 'a 1 h 15 de CABA',
          dueno: 'Patricia',
          cap: 10,
          pileta: '7 × 3,5 m',
          clima: false,
          cancha: false,
          quincho: '40 m²',
          precios: P(130, 200, 400),
          modos: { dia: false, estadia: true },
          est: {
            precios: P(150, 210, 380),
            min: 2,
            checkin: '14 h',
            checkout: '10 h',
            dormitorios: 3,
            banos: 1,
          },
          rating: 4.5,
          ops: 14,
        },
        0.7,
        67,
      ),
      mkQuinta(
        {
          id: 'la-tranquera',
          nombre: 'La Tranquera',
          zona: 'Moreno',
          dist: 'a 40 min de CABA',
          dueno: 'Hugo',
          cap: 50,
          pileta: '11 × 5 m',
          clima: false,
          cancha: true,
          quincho: '80 m²',
          precios: P(200, 300, 580),
          rating: 4.7,
          ops: 46,
          look: { floor: '#A97C50', patio: '#C2AF8E' },
        },
        1.15,
        71,
      ),
      mkQuinta(
        {
          id: 'villa-elisa',
          nombre: 'Quinta Villa Elisa',
          zona: 'La Plata',
          dist: 'a 20 min del centro de La Plata',
          dueno: 'Andrea',
          cap: 16,
          pileta: '9 × 4,5 m',
          clima: true,
          cancha: true,
          quincho: '60 m²',
          precios: P(190, 290, 560),
          modos: { dia: true, estadia: true },
          turnos: ['dia'],
          est: {
            precios: P(240, 330, 520),
            min: 2,
            checkin: '14 h',
            checkout: '11 h',
            dormitorios: 4,
            banos: 3,
          },
          rating: 4.8,
          ops: 22,
        },
        0.9,
        83,
      ),
      mkQuinta(
        {
          id: 'el-reencuentro',
          nombre: 'El Reencuentro',
          zona: 'Exaltación de la Cruz',
          dist: 'a 1 h 20 de CABA',
          dueno: 'Carlos',
          cap: 70,
          pileta: '14 × 6 m',
          clima: false,
          cancha: true,
          quincho: '120 m²',
          precios: P(260, 380, 700),
          rating: 4.6,
          ops: 37,
          look: { floor: '#D8CBB0' },
        },
        0.95,
        97,
      ),
      mkQuinta(
        {
          id: 'las-acacias',
          nombre: 'Las Acacias',
          zona: 'City Bell',
          dist: 'a 30 min de La Plata',
          dueno: 'Laura',
          cap: 30,
          pileta: '8 × 4 m',
          clima: false,
          cancha: false,
          quincho: '45 m²',
          precios: P(160, 240, 470),
          rating: 4.8,
          ops: 18,
          look: { floor: '#B9B3A8' },
        },
        0.85,
        101,
      ),
    ];
    const a = list.find(x => x.id === 'los-aromos');
    aromosB.forEach(([date, turno, nombre, motivo, personas, estado], i) => {
      const total = a.precios[tipo(date)];
      a.bookings.push({
        id: 'a' + i,
        code: 'QLA-' + (2100 + i * 37),
        date,
        turno,
        nombre,
        motivo,
        personas,
        estado,
        total,
        sena: estado === 'confirmada' ? senaQ(a, total) : 0,
        nuevo: false,
      });
    });
    return list;
  }

  /* ======================= estado + guardado ======================= */
  const KEY = 'novantiq-quintas-v6'; // cambiar la versión borra los datos viejos guardados en el navegador
  let QS, consultas;
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.v === 5 && Array.isArray(d.qs) && d.qs.length) {
          QS = d.qs;
          consultas = d.consultas || {};
          return;
        }
      }
    } catch (_) {}
    QS = seedQuintas();
    consultas = {};
    QS.forEach((q, i) => (consultas[q.id] = q.ops ? 60 + Math.round(q.ops * 2.6) + i * 7 : 34));
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 5, qs: QS, consultas }));
    } catch (_) {}
  }
  const byId = id => QS.find(q => q.id === id);
  const isBlk = (q, ds) => q.blocked.includes(ds);
  const bookingOf = (q, ds, t) => q.bookings.find(b => !b.tipo && b.date === ds && b.turno === t);
  const stayAt = (q, ds) => q.bookings.find(b => b.tipo === 'estadia' && b.desde <= ds && ds < b.hasta);
  const stayTouch = (q, ds) => q.bookings.find(b => b.tipo === 'estadia' && b.desde <= ds && ds <= b.hasta);
  load();
  let CUR = QS[0].id;
  const Q = () => byId(CUR) || QS[0];
  function estadoTurno(q, ds, t) {
    if (ds < TODAY) return 'pasado';
    if (isBlk(q, ds)) return 'bloqueado';
    const b = bookingOf(q, ds, t) || (t === 'noche' ? stayAt(q, ds) : stayTouch(q, ds));
    if (b) return b.estado === 'pendiente' ? 'pendiente' : 'ocupado';
    return 'libre';
  }
  const libre = (q, ds, t) => estadoTurno(q, ds, t) === 'libre';
  const nocheLibre = (q, ds) =>
    ds >= TODAY && !isBlk(q, ds) && !stayAt(q, ds) && !bookingOf(q, ds, 'dia') && !bookingOf(q, ds, 'noche');
  function rangoLibre(q, a, b) {
    if (a < TODAY || b > addDays(LAST_DAY, 1)) return false;
    for (let d = a; d < b; d = addDays(d, 1)) if (!nocheLibre(q, d)) return false;
    return !bookingOf(q, b, 'dia');
  }
  const EST_TXT = {
    libre: 'libre',
    ocupado: 'reservado',
    pendiente: 'reservado',
    bloqueado: 'no disponible',
    pasado: 'pasado',
  };
  const bStart = b => (b.tipo === 'estadia' ? b.desde : b.date),
    bEnd = b => (b.tipo === 'estadia' ? b.hasta : b.date);
  const slotsOwner = q => {
    const s = hasDia(q) ? [...turnosDe(q)] : [];
    if (hasEst(q) && !s.includes('noche')) s.push('noche');
    if (hasEst(q) && !s.includes('dia')) s.unshift('dia');
    return s;
  };
  const SLOT_N = { dia: 'Día', noche: 'Noche' };

  /* ======================= calendario ======================= */
  let mi = 0,
    omi = 0,
    selDate = null,
    calMode = 'dia',
    rng = { a: null, b: null },
    rngQ = null,
    pendingOpen = null,
    pendingStay = false;
  function calHTML(q, y, m, mode) {
    const first = new Date(y, m, 1),
      off = (first.getDay() + 6) % 7,
      days = new Date(y, m + 1, 0).getDate();
    let h =
      '<div class="cal-grid">' +
      ['L', 'M', 'M', 'J', 'V', 'S', 'D']
        .map(d => `<div class="cal-dow" aria-hidden="true">${d}</div>`)
        .join('');
    for (let i = 0; i < off; i++) h += '<div aria-hidden="true"></div>';
    for (let d = 1; d <= days; d++) {
      const ds = iso(y, m, d),
        past = ds < TODAY,
        esp = tipo(ds) === 'especial';
      let cls,
        inner = '',
        aria;
      if (mode === 'est') {
        const ok = !past && nocheLibre(q, ds),
          p = precioNoche(q, ds);
        cls = past ? 'past' : ok ? 'free' : isBlk(q, ds) ? 'blk' : 'full';
        if (rng.a && ds === rng.a) cls += ' rng-a';
        else if (rng.b && ds === rng.b) cls += ' rng-b';
        else if (rng.a && rng.b && ds > rng.a && ds < rng.b) cls += ' rng-in';
        if (ok)
          inner = `<span class="d-price"><span class="p-long">${sLq(q, p)}</span><span class="p-short">${sSq(q, p)}</span></span>`;
        aria = `${fLarga(ds)}: noche ${ok ? 'libre, ' + mq(q, p) : 'ocupada'}`;
      } else {
        const slots = mode === 'dueno' ? slotsOwner(q) : turnosDe(q),
          st = slots.map(t => estadoTurno(q, ds, t)),
          free = st.filter(s => s === 'libre').length,
          p = precio(q, ds);
        cls = past ? 'past' : isBlk(q, ds) ? 'blk' : free === slots.length ? 'free' : free ? 'half' : 'full';
        if (ds === selDate && mode === 'cliente') cls += ' sel';
        if (!past)
          inner = `<span class="d-bars" aria-hidden="true">${st.map(s => `<i class="b-${s}"></i>`).join('')}</span>`;
        if (mode === 'cliente' && !past && free)
          inner += `<span class="d-price"><span class="p-long">${sLq(q, p)}</span><span class="p-short">${sSq(q, p)}</span></span>`;
        if (mode === 'dueno' && isBlk(q, ds) && !past) inner += '<span class="d-price">Bloq.</span>';
        aria = `${fLarga(ds)}. ${slots.map((t, i) => `${SLOT_N[t]} ${EST_TXT[st[i]]}`).join(', ')}${mode === 'cliente' && free && !past ? '. ' + mq(q, p) + ' por turno' : ''}`;
      }
      h += `<button type="button" class="day ${cls}${esp ? ' esp' : ''}${ds === TODAY ? ' today' : ''}" data-date="${ds}"${past ? ' disabled' : ''} aria-label="${esc(aria)}"><span class="d-num">${d}</span>${inner}</button>`;
    }
    return h + '</div>';
  }
  function renderCal() {
    const q = Q(),
      [y, m] = months[mi],
      est = calMode === 'est';
    $('#cal-title').textContent = cap(DF_M.format(new Date(y, m, 1)));
    $('#cal').innerHTML = calHTML(q, y, m, est ? 'est' : 'cliente');
    $('#cal-prev').disabled = mi === 0;
    $('#cal-next').disabled = mi === months.length - 1;
    const both = hasDia(q) && hasEst(q);
    $('#cal-modes').hidden = !both;
    if (both)
      $('#cal-modes').innerHTML =
        `<button type="button" data-cm="est" aria-pressed="${est}">Para quedarse</button><button type="button" data-cm="dia" aria-pressed="${!est}">Por el día</button>`;
    $('#lg-half').hidden = est || turnosDe(q).length < 2;
    const hint = $('#cal-hint');
    if (est) {
      if (rng.a && rng.b)
        hint.innerHTML = `<span>${esc(rangoTxt(rng.a, rng.b))} · ${plural(nightsBetween(rng.a, rng.b), 'noche')}</span><button class="btn sm" id="hint-go">Reservar estas fechas</button><button class="linkbtn" id="hint-clear">Cambiar</button>`;
      else if (rng.a)
        hint.innerHTML = `<span>Entrada: ${esc(fLarga(rng.a))}. Ahora tocá el día de salida.</span><button class="linkbtn" id="hint-clear">Empezar de nuevo</button>`;
      else
        hint.innerHTML = `<span>Tocá el día de entrada y después el de salida. Mínimo ${plural(q.est.min, 'noche')}.</span>`;
      $('#fechas-p').innerHTML =
        `Elegí las noches que te quedás. Entrada desde las <b>${esc(q.est.checkin)}</b> y salida hasta las <b>${esc(q.est.checkout)}</b>. El precio de cada día es por noche.`;
      $('#cal-key').textContent =
        'Los días en verde tienen la noche libre. El día de salida puede ser la entrada de otra reserva.';
    } else {
      hint.innerHTML = '';
      const ts = turnosDe(q);
      $('#fechas-p').innerHTML =
        ts.length > 1
          ? 'Tocá un día para reservarlo. Cada día tiene dos turnos: <b>Día</b> de 10 a 19 h y <b>Noche</b> de 21 a 5 h.'
          : `Tocá un día para reservarlo. El uso por día es de <b>${TURNOS[ts[0]].h}</b>.`;
      $('#cal-key').textContent =
        ts.length > 1
          ? 'Las dos rayitas de cada día son los turnos: la izquierda es Día y la derecha es Noche.'
          : 'La rayita de cada día muestra si el turno está libre.';
    }
    updBuybar();
    setAmbiente(est ? 'noche' : 'dia');
    const hg = $('#hint-go');
    if (hg) hg.onclick = () => openStay(Q(), rng.a, rng.b);
    const hc = $('#hint-clear');
    if (hc)
      hc.onclick = () => {
        rng = { a: null, b: null };
        renderCal();
      };
  }
  $('#cal-modes').addEventListener('click', e => {
    const b = e.target.closest('[data-cm]');
    if (!b) return;
    calMode = b.dataset.cm;
    renderCal();
    renderTarifas();
    renderQuick();
  });
  function priceRows(q, pr, suffix) {
    const v = [pr.semana, pr.finde, pr.especial];
    if (v[0] === v[1] && v[1] === v[2])
      return `<div class="tarifa"><span>Cualquier día<small>${suffix}</small></span><b>${mq(q, v[0])}</b></div>`;
    return [
      ['semana', 'Lunes a jueves'],
      ['finde', 'Viernes a domingo y feriados'],
      ['especial', '24, 25, 31 de dic. y 1 de ene.'],
    ]
      .map(
        ([k, a]) =>
          `<div class="tarifa"><span>${a}<small>${suffix}</small></span><b>${mq(q, pr[k])}</b></div>`,
      )
      .join('');
  }
  function renderTarifas() {
    const q = Q();
    let h = '';
    if (hasEst(q))
      h += `<p class="t-group">Para quedarse</p>${priceRows(q, q.est.precios, 'Por noche')}<div class="tarifa"><span>Mínimo<small>Entrada ${esc(q.est.checkin)} · salida ${esc(q.est.checkout)}</small></span><b>${plural(q.est.min, 'noche')}</b></div>`;
    if (hasDia(q)) {
      const ts = turnosDe(q);
      h += `${hasEst(q) ? '<p class="t-group">Por el día</p>' : ''}${priceRows(q, q.precios, ts.length > 1 ? 'Por turno de día o de noche' : 'De ' + TURNOS[ts[0]].h)}`;
    }
    $('#tarifas').innerHTML = h;
  }
  function nextFridays(n) {
    const out = [];
    let d = TODAY;
    while (parse(d).getDay() !== 5) d = addDays(d, 1);
    while (out.length < n && addDays(d, 2) <= addDays(LAST_DAY, 1)) {
      out.push(d);
      d = addDays(d, 7);
    }
    return out;
  }
  function renderQuick() {
    const q = Q(),
      box = $('#quick');
    if (calMode === 'est') {
      const fr = nextFridays(12)
        .filter(f => rangoLibre(q, f, addDays(f, 2)) && q.est.min <= 2)
        .slice(0, 6);
      $('#quick-title').textContent = 'Fines de semana libres';
      $('#quick-note').textContent = 'De viernes a domingo, para llegar a la tarde y volver el domingo.';
      box.innerHTML = fr.length
        ? fr
            .map(
              f =>
                `<button type="button" data-qa="${f}">${wd(f)} ${parse(f).getDate()}/${parse(f).getMonth() + 1} al dom ${parse(addDays(f, 2)).getDate()}</button>`,
            )
            .join('')
        : '<p class="note">No quedan fines de semana completos libres en los próximos meses.</p>';
      return;
    }
    const dec = months.find(([, m]) => m === 11),
      t = turnosDe(q).includes('noche') ? 'noche' : 'dia';
    $('#quick-title').textContent =
      t === 'noche' ? 'Noches libres para despedidas' : 'Sábados y domingos libres';
    $('#quick-note').textContent =
      t === 'noche'
        ? 'Viernes y sábados de diciembre que todavía están libres.'
        : `Fines de semana de diciembre con el día libre (${TURNOS.dia.h}).`;
    if (!dec) {
      box.innerHTML = '<p class="note">Sin fechas para mostrar.</p>';
      return;
    }
    const out = [];
    for (let d = 1; d <= 31; d++) {
      const ds = iso(dec[0], 11, d),
        w = parse(ds).getDay(),
        ok = t === 'noche' ? w === 5 || w === 6 : w === 6 || w === 0;
      if (ok && ds >= TODAY && libre(q, ds, t)) out.push(ds);
    }
    box.innerHTML = out.length
      ? out
          .slice(0, 8)
          .map(
            ds =>
              `<button type="button" data-q="${ds}" data-t="${t}">${wd(ds)} ${parse(ds).getDate()} · ${t === 'noche' ? 'noche' : 'día'}</button>`,
          )
          .join('')
      : '<p class="note">Ya no quedan fines de semana libres en diciembre.</p>';
  }
  $('#cal-prev').onclick = () => {
    if (mi > 0) {
      mi--;
      renderCal();
    }
  };
  $('#cal-next').onclick = () => {
    if (mi < months.length - 1) {
      mi++;
      renderCal();
    }
  };
  $('#cal').addEventListener('click', e => {
    const b = e.target.closest('.day');
    if (!b || b.disabled) return;
    const q = Q(),
      ds = b.dataset.date;
    consultas[q.id] = (consultas[q.id] || 0) + 1;
    save();
    if (calMode === 'est') {
      if (!rng.a || rng.b || ds <= rng.a) {
        if (!nocheLibre(q, ds)) {
          toast(`La noche del ${fLarga(ds).toLowerCase()} ya está reservada. Elegí un día en verde.`);
          return;
        }
        rng = { a: ds, b: null };
        rngQ = q.id;
        renderCal();
        return;
      }
      const n = nightsBetween(rng.a, ds);
      if (n < q.est.min) {
        toast(`El mínimo es de ${plural(q.est.min, 'noche')}. Elegí una salida más adelante.`);
        return;
      }
      if (!rangoLibre(q, rng.a, ds)) {
        toast('Hay noches reservadas en el medio. Elegí otras fechas.');
        rng = { a: null, b: null };
        renderCal();
        return;
      }
      rng.b = ds;
      renderCal();
      openStay(q, rng.a, ds);
      return;
    }
    if (turnosDe(q).every(t => !libre(q, ds, t))) {
      openFull(ds);
      return;
    }
    selDate = ds;
    renderCal();
    openSheet(ds);
  });
  $('#quick').addEventListener('click', e => {
    const q = Q(),
      b = e.target.closest('[data-q],[data-qa]');
    if (!b) return;
    consultas[q.id] = (consultas[q.id] || 0) + 1;
    if (b.dataset.qa) {
      const f = b.dataset.qa;
      rng = { a: f, b: addDays(f, 2) };
      rngQ = q.id;
      monthOf(f);
      renderCal();
      openStay(q, rng.a, rng.b);
      return;
    }
    selDate = b.dataset.q;
    monthOf(selDate);
    renderCal();
    openSheet(selDate, b.dataset.t);
  });
  function monthOf(ds) {
    const [y, m] = ds.split('-').map(Number);
    const i = months.findIndex(([yy, mm]) => yy === y && mm === m - 1);
    if (i >= 0) mi = i;
  }

  /* ======================= videos de la quinta ======================= */
  /* Para sumar videos a una quinta: agregá su id acá con la ruta del .mp4 (carpeta video/).
     Se reproducen solos, sin sonido, en loop, y se pausan cuando salen de la pantalla. */
  const VIDEOS = {
    'quinta-berazategui': [
      { src: 'video/berazategui.mp4', poster: 'video/berazategui-poster.jpg', t: 'Recorrido por la quinta' },
    ],
    'quinta-areco': [{ src: 'video/areco.mp4', poster: 'video/areco-poster.jpg', t: 'La pileta' }],
  };
  const vidEl = $('#vid');
  let vidIdx = 0,
    vidObs = null;
  function vidPlay() {
    if (reduce || !vidEl.src) return;
    const p = vidEl.play();
    if (p && p.catch) p.catch(() => {});
  }
  function vidLoad(list, i) {
    vidIdx = i;
    vidEl.pause();
    vidEl.poster = list[i].poster || '';
    vidEl.src = list[i].src;
    vidEl.load();
    vidEl.controls = reduce;
    $$('#vid-list .chip').forEach((c, k) => c.setAttribute('aria-pressed', String(k === i)));
    vidPlay();
  }
  function mountVideos(q) {
    const list = VIDEOS[q.id] || [],
      has = list.length > 0;
    $('#vid-box').hidden = !has;
    $('#vid-title').hidden = !has;
    if (vidObs) vidObs.disconnect();
    vidEl.pause();
    if (!has) {
      vidEl.removeAttribute('src');
      vidEl.load();
      return;
    }
    vidEl.muted = true;
    $('#vid-list').innerHTML =
      list.length > 1
        ? list
            .map((v, i) => `<button type="button" class="chip" data-vi="${i}" aria-pressed="false">${esc(v.t)}</button>`)
            .join('')
        : '';
    vidLoad(list, 0);
    vidEl.onloadedmetadata = () =>
      $('.vid-view').classList.toggle('vertical', vidEl.videoHeight > vidEl.videoWidth);
    vidObs = new IntersectionObserver(
      es => es.forEach(e => (e.isIntersecting ? vidPlay() : vidEl.pause())),
      { threshold: 0.35 },
    );
    vidObs.observe(vidEl);
  }
  $('#vid-list').addEventListener('click', e => {
    const b = e.target.closest('[data-vi]');
    if (b) vidLoad(VIDEOS[Q().id], +b.dataset.vi);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) vidEl.pause();
  });

  /* ======================= ambiente (día de verano / noche) ======================= */
  /* Pasar el día → fondo amarillo de verano. Quedarse a dormir → modo noche. Panel y creador → neutro. */
  function setAmbiente(a) {
    const r = document.documentElement;
    if (a) r.dataset.ambiente = a;
    else delete r.dataset.ambiente;
  }

  /* ======================= barra fija de reserva (página de la quinta) ======================= */
  /* Siempre a mano: muestra el precio y lleva a reservar. Se esconde cuando el calendario está en pantalla. */
  const bb = $('#buybar');
  let bbNearCal = false;
  function bbAction() {
    const q = Q();
    if (calMode === 'est' && rng.a && rng.b && rngQ === q.id && rangoLibre(q, rng.a, rng.b))
      return { go: () => openStay(q, rng.a, rng.b), price: `${dm(rng.a)} al ${dm(rng.b)} · ${mq(q, nightsTotal(q, rng.a, rng.b))}`, sub: `${plural(nightsBetween(rng.a, rng.b), 'noche')} · seña ${mq(q, senaQ(q, nightsTotal(q, rng.a, rng.b)))}`, btn: 'Reservar' };
    if (calMode !== 'est' && selDate && hasDia(q) && turnosDe(q).some(t => libre(q, selDate, t)))
      return { go: () => openSheet(selDate), price: `${wd(selDate)} ${dm(selDate)} · ${mq(q, precio(q, selDate))}`, sub: `por turno · seña ${mq(q, senaQ(q, precio(q, selDate)))}`, btn: 'Reservar' };
    const est = calMode === 'est',
      pr = est ? q.est.precios : q.precios,
      min = Math.min(pr.semana, pr.finde, pr.especial);
    return {
      go: () => $('#fechas').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }),
      price: `Desde ${mq(q, min)}`,
      sub: est ? 'por noche' : 'por día',
      btn: 'Ver fechas libres',
    };
  }
  function updBuybar() {
    if ($('#v-quinta').hidden) return;
    const a = bbAction();
    $('#bb-price').textContent = a.price;
    $('#bb-sub').textContent = a.sub;
    $('#bb-go').textContent = a.btn;
    bb.hidden = false;
    bb.classList.toggle('off', bbNearCal);
    document.body.classList.add('has-bb');
  }
  $('#bb-go').onclick = () => bbAction().go();
  new IntersectionObserver(
    es =>
      es.forEach(e => {
        bbNearCal = e.isIntersecting;
        bb.classList.toggle('off', bbNearCal);
      }),
    { rootMargin: '0px 0px -30% 0px' },
  ).observe($('#fechas'));

  /* ======================= página de la quinta ======================= */
  function renderQuinta() {
    const q = Q();
    if (rngQ !== q.id) {
      rng = { a: null, b: null };
      rngQ = q.id;
      calMode = hasEst(q) ? 'est' : 'dia';
    }
    if (!hasEst(q)) calMode = 'dia';
    else if (!hasDia(q)) calMode = 'est';
    document.title = q.nombre + ' · NOVANTIQ Quintas';
    const est = hasEst(q),
      dia = hasDia(q);
    $('#q-eyebrow').textContent =
      est && dia
        ? `Para quedarse o pasar el día · hasta ${q.cap} personas`
        : est
          ? `Para quedarse · ${plural(q.est.dormitorios, 'dormitorio')} · hasta ${q.cap} personas`
          : `Alquiler por día · hasta ${q.cap} personas`;
    $('#q-title').innerHTML = est
      ? `${esc(q.nombre)}: tu <span>escapada</span> con pileta, parrilla y parque`
      : `${esc(q.nombre)}: pileta, parrilla y <span>todo el día</span> para tu gente`;
    $('#q-side').textContent = est
      ? 'Elegí las noches en el calendario y reservá en el momento, sin esperar respuesta por WhatsApp. Si está en verde, es tuyo.'
      : 'Mirá las fechas libres y reservá en el momento. Sin esperar a que te contesten por WhatsApp: si está en verde, es tuyo.';
    $('#q-loc').textContent = `${q.zona}, Buenos Aires · ${q.dist}`;
    const rt = $('#q-rating');
    rt.hidden = !q.ops;
    rt.previousElementSibling.hidden = !q.ops;
    if (q.ops) rt.innerHTML = `<i>★</i> ${q.rating.toFixed(1).replace('.', ',')} (${q.ops} opiniones)`;
    const feats = [`<b>${q.cap}</b> personas`];
    if (est)
      feats.push(
        `<b>${q.est.dormitorios}</b> dormitorios`,
        `<b>${q.est.banos}</b> baños`,
        `Entrada <b>${esc(q.est.checkin)}</b> · salida <b>${esc(q.est.checkout)}</b>`,
      );
    feats.push(pileTxt(q), 'Parrilla', quinchoTxt(q), q.cancha ? 'Cancha de fútbol 5' : 'Parque');
    if (q.feats) feats.push(...q.feats);
    if (est && dia) feats.push(`Uso por día <b>${TURNOS.dia.h}</b>`);
    $('#q-feats').innerHTML = feats.map(x => `<li>${x}</li>`).join('');
    $('#q-incluye').innerHTML = INCLUYE(q)
      .map(x => `<li>${esc(x)}</li>`)
      .join('');
    $('#q-reglas').innerHTML = REGLAS(q)
      .map(x => `<li>${esc(x)}</li>`)
      .join('');
    if (q.ops) {
      const r0 = q.look.seed % REVIEWS.length;
      $('#q-op-title').textContent = 'Lo que dicen los que fueron';
      $('#q-reviews').innerHTML = [0, 2, 4]
        .map(k => REVIEWS[(r0 + k) % REVIEWS.length])
        .map(
          ([n, t]) =>
            `<div class="review"><span class="stars" aria-label="5 estrellas">★★★★★</span><p>${esc(t)}</p><b>${esc(n)}</b><small>Reservó por la página</small></div>`,
        )
        .join('');
    } else {
      $('#q-op-title').textContent = 'Opiniones de huéspedes';
      $('#q-reviews').innerHTML =
        '<div class="review"><p>Cuando tus huéspedes terminen su estadía, les llega un mensaje para dejar su opinión. Las opiniones aparecen acá y en el buscador.</p><small>Todavía no hay opiniones</small></div>';
    }
    $('#sena-note').textContent =
      `Pagás una seña del 30% y ${est && !dia ? 'las fechas quedan bloqueadas' : 'la fecha queda bloqueada'} para vos. El resto se paga al entrar, junto con un depósito de garantía de ${depTxt(q)} que se devuelve al salir.${isUSD(q) ? ' Los precios de esta quinta están en dólares.' : ''}`;
    $('#cam-cancha').textContent = q.cancha ? 'Cancha' : 'Parque';
    renderCal();
    renderTarifas();
    renderQuick();
    renderGallery(q);
    mountVideos(q);
    const conFotos = tieneFotos(q);
    $('#scene-title').hidden = conFotos;
    $('#scene-box').hidden = conFotos;
    if (conFotos) {
      if (hero) setTour(false);
    } else mountHero(q);
  }

  /* ======================= reserva (sheet) ======================= */
  const ov = $('#sheet'),
    sb = $('#sheet-body');
  let S = null,
    lastFocus = null;
  function showOv() {
    lastFocus = document.activeElement;
    ov.hidden = false;
    document.body.classList.add('lock');
    $('#sheet-close').focus();
  }
  function closeSheet() {
    ov.hidden = true;
    document.body.classList.remove('lock');
    S = null;
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
  }
  $('#sheet-close').onclick = closeSheet;
  ov.addEventListener('click', e => {
    if (e.target === ov) closeSheet();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !ov.hidden) closeSheet();
  });

  function dayFree(q, ds) {
    return hasDia(q) ? turnosDe(q).some(t => libre(q, ds, t)) : hasEst(q) && nocheLibre(q, ds);
  }
  function libresEn(ds, exceptId) {
    return QS.filter(q => q.id !== exceptId && dayFree(q, ds));
  }
  function openFull(ds) {
    const q = Q(),
      alts = libresEn(ds, q.id).slice(0, 4);
    sb.innerHTML = `<div class="ok"><div class="ok-ic x"><svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg></div>
  <h3 id="sh-title">${fLarga(ds)} ya está reservado</h3>
  <p class="muted">${alts.length ? 'Pero estas quintas tienen ese día libre:' : 'Y no quedan otras quintas libres ese día. Probá con otra fecha.'}</p>
  ${alts.length ? `<div class="alt-list">${alts.map(a => `<button class="alt" data-alt="${a.id}"><span><b>${esc(a.nombre)}</b><small>${esc(a.zona)} · hasta ${a.cap} personas</small></span><span class="num">${hasDia(a) ? mq(a, precio(a, ds)) : mq(a, precioNoche(a, ds)) + ' la noche'}</span></button>`).join('')}</div>` : ''}
  <button class="btn ghost wide" id="full-all">Ver todas las quintas libres ese día</button></div>`;
    showOv();
    sb.querySelectorAll('[data-alt]').forEach(
      b =>
        (b.onclick = () => {
          closeSheet();
          selDate = ds;
          monthOf(ds);
          location.hash = 'q-' + b.dataset.alt;
        }),
    );
    $('#full-all').onclick = () => {
      closeSheet();
      $('#s-tipo').value = 'dia';
      $('#s-fecha').value = ds;
      $('#s-turno').value = 'any';
      location.hash = 'portal';
    };
  }
  function openSheet(ds, pref) {
    const q = Q(),
      opts = turnosDe(q).filter(t => libre(q, ds, t));
    S = {
      q,
      kind: 'dia',
      date: ds,
      turno: pref && opts.includes(pref) ? pref : opts.includes('noche') ? 'noche' : opts[0],
      personas: Math.min(25, q.cap),
      extras: new Set(),
      nombre: '',
      tel: '',
      motivo: 'Despedida de año',
      acepta: false,
    };
    showForm();
    showOv();
  }
  function openStay(q, a, b) {
    S = {
      q,
      kind: 'est',
      desde: a,
      hasta: b,
      personas: Math.min(8, q.cap),
      extras: new Set(),
      nombre: '',
      tel: '',
      motivo: MOTIVOS_EST[0],
      acepta: false,
    };
    showForm();
    showOv();
  }
  const extrasDe = () => (S.kind === 'est' ? EXTRAS_EST : EXTRAS);
  function tot() {
    const q = S.q,
      ex = extrasDe()
        .filter(e => S.extras.has(e.id))
        .reduce((a, e) => a + exP(q, e), 0);
    let base = 0,
      det = [];
    if (S.kind === 'est') {
      const g = new Map();
      for (let d = S.desde; d < S.hasta; d = addDays(d, 1)) {
        const p = precioNoche(q, d);
        g.set(p, (g.get(p) || 0) + 1);
        base += p;
      }
      det = [...g].map(([p, n]) => [`${plural(n, 'noche')} × ${mq(q, p)}`, n * p]);
    } else {
      base = precio(q, S.date);
      det = [[`Turno ${TURNOS[S.turno].n.toLowerCase()} (${TURNOS[S.turno].h})`, base]];
    }
    const total = base + ex,
      sena = senaQ(q, total);
    return { base, ex, total, sena, saldo: total - sena, det };
  }
  function showForm() {
    const q = S.q,
      est = S.kind === 'est',
      n = est ? nightsBetween(S.desde, S.hasta) : 0;
    const head = est
      ? `<div class="sh-head"><p class="eyebrow">Reservar · ${esc(q.nombre)}</p><h3 id="sh-title">${esc(rangoTxt(S.desde, S.hasta))}</h3><p class="muted">${plural(n, 'noche')} · entrada desde las ${esc(q.est.checkin)}, salida hasta las ${esc(q.est.checkout)}</p></div>`
      : `<div class="sh-head"><p class="eyebrow">Reservar · ${esc(q.nombre)}</p><h3 id="sh-title">${fLarga(S.date)}</h3><p class="muted">${TIPO_L[tipo(S.date)]}</p></div>
  <fieldset><legend>Turno</legend><div class="turnos">${turnosDe(q)
    .map(t => {
      const ok = libre(q, S.date, t);
      return `<label class="turno${ok ? '' : ' off'}"><input type="radio" name="turno" id="r-turno-${t}" value="${t}"${ok ? '' : ' disabled'}${S.turno === t ? ' checked' : ''}><span class="t-n">${TURNOS[t].n}</span><span class="t-h">${TURNOS[t].h}</span><span class="t-p">${ok ? mq(q, precio(q, S.date)) : 'Reservado'}</span></label>`;
    })
    .join('')}</div></fieldset>`;
    const mot = est ? MOTIVOS_EST : MOTIVOS;
    sb.innerHTML = `${head}
  <fieldset><label class="lbl" for="r-personas">Cuántas personas van</label>
    <div class="range-row"><input type="range" id="r-personas" min="${est ? 1 : 5}" max="${q.cap}" step="1" value="${S.personas}"><output id="r-pers-out" for="r-personas">${S.personas}</output></div>
  </fieldset>
  <fieldset><legend>Extras</legend>${extrasDe()
    .map(
      e =>
        `<label class="extra"><input type="checkbox" id="r-ex-${e.id}"${S.extras.has(e.id) ? ' checked' : ''}><span>${e.n}</span><em>+${mq(q, exP(q, e))}</em></label>`,
    )
    .join('')}</fieldset>
  <div class="field"><label for="r-nombre">Nombre y apellido</label><input id="r-nombre" autocomplete="name" value="${esc(S.nombre)}" placeholder="Ej.: Lucía Fernández"></div>
  <div class="field"><label for="r-tel">WhatsApp</label><input id="r-tel" type="tel" inputmode="tel" autocomplete="tel" value="${esc(S.tel)}" placeholder="Ej.: 11 5555 1234"></div>
  <div class="field"><label for="r-motivo">Motivo</label><select id="r-motivo">${mot.map(m => `<option${m === S.motivo ? ' selected' : ''}>${m}</option>`).join('')}</select></div>
  <label class="check"><input type="checkbox" id="r-acepta"${S.acepta ? ' checked' : ''}><span>${est ? `Leí las reglas de la casa: entrada desde las ${esc(q.est.checkin)}, salida hasta las ${esc(q.est.checkout)}, máximo ${q.cap} personas y sin pirotecnia.` : `Leí las reglas de la casa: sin pirotecnia, máximo ${q.cap} personas y música moderada después de las 2 h.`}</span></label>
  <div class="sum" id="r-sum"></div>
  <p class="err" id="r-err" hidden></p>
  <button class="btn wide" id="r-pay">Pagar la seña</button>`;
    sb.querySelectorAll('input[name=turno]').forEach(
      i =>
        (i.onchange = () => {
          S.turno = i.value;
          upd();
        }),
    );
    $('#r-personas').oninput = e => {
      S.personas = +e.target.value;
      $('#r-pers-out').textContent = S.personas;
    };
    extrasDe().forEach(x => {
      $('#r-ex-' + x.id).onchange = e => {
        e.target.checked ? S.extras.add(x.id) : S.extras.delete(x.id);
        upd();
      };
    });
    $('#r-nombre').oninput = e => (S.nombre = e.target.value);
    $('#r-tel').oninput = e => (S.tel = e.target.value);
    $('#r-motivo').onchange = e => (S.motivo = e.target.value);
    $('#r-acepta').onchange = e => (S.acepta = e.target.checked);
    $('#r-pay').onclick = toPago;
    upd();
  }
  function upd() {
    const t = tot();
    $('#r-sum').innerHTML =
      `${t.det.map(([a, v]) => `<div><span>${a}</span><span>${mq(S.q, v)}</span></div>`).join('')}${t.ex ? `<div><span>Extras</span><span>${mq(S.q, t.ex)}</span></div>` : ''}<div class="tot"><span>Total</span><span>${mq(S.q, t.total)}</span></div><div class="sena"><span>Seña para bloquear ${S.kind === 'est' ? 'las fechas' : 'la fecha'} (30%)</span><span>${mq(S.q, t.sena)}</span></div><div><span>Resto al entrar</span><span>${mq(S.q, t.saldo)}</span></div><small>Depósito de garantía de ${depTxt(S.q)} al entrar, se devuelve al salir.</small>`;
    $('#r-pay').textContent = 'Pagar seña de ' + mq(S.q, t.sena);
  }
  function toPago() {
    const err = $('#r-err'),
      dg = S.tel.replace(/\D/g, '');
    let msg = '';
    if (S.nombre.trim().length < 3) msg = 'Escribí tu nombre y apellido.';
    else if (dg.length < 8) msg = 'Revisá el WhatsApp: tiene que tener al menos 8 números.';
    else if (!S.acepta) msg = 'Marcá que leíste las reglas de la casa para seguir.';
    if (msg) {
      err.textContent = msg;
      err.hidden = false;
      return;
    }
    const t = tot(),
      cuando =
        S.kind === 'est'
          ? rangoTxt(S.desde, S.hasta)
          : `${fLarga(S.date)} · turno ${TURNOS[S.turno].n.toLowerCase()}`;
    sb.innerHTML = `<div class="sh-head"><p class="eyebrow">Paso final</p><h3 id="sh-title">Pagá la seña de ${mq(S.q, t.sena)}</h3><p class="muted">${esc(S.q.nombre)} · ${esc(cuando)}</p></div>
  <div class="pay-opts">
    <button class="pay-opt" id="pay-mp"><span class="ptag">Se confirma al instante</span><b>Mercado Pago</b><span class="muted">Tarjeta, débito o dinero en cuenta. ${S.kind === 'est' ? 'Las fechas quedan tuyas' : 'La fecha queda tuya'} en el momento.</span></button>
    <button class="pay-opt" id="pay-tr"><b>Transferencia</b><span class="muted">Te pasamos el alias. ${S.kind === 'est' ? 'Las fechas quedan separadas' : 'La fecha queda separada'} 24 h hasta que el dueño vea el comprobante.</span></button>
  </div>
  <p class="note">Pago simulado: esta es una demo y no se cobra nada.</p>
  <button class="linkbtn" id="pay-back">Volver y cambiar algo</button>`;
    $('#pay-back').onclick = showForm;
    $('#pay-mp').onclick = () => {
      sb.innerHTML = `<div class="proc"><div class="spin"></div><b>Procesando el pago de la seña…</b><span class="muted">No cierres esta ventana</span></div>`;
      setTimeout(() => finish('confirmada'), 1700);
    };
    $('#pay-tr').onclick = () => finish('pendiente');
    $('#sheet-close').focus();
  }
  function finish(estado) {
    if (!S) return;
    const q = S.q,
      t = tot(),
      conf = estado === 'confirmada',
      est = S.kind === 'est';
    const base = {
      id: 'u' + Date.now(),
      code: 'Q-' + (4000 + Math.floor(Math.random() * 5000)),
      nombre: S.nombre.trim(),
      motivo: S.motivo,
      personas: S.personas,
      estado,
      total: t.total,
      sena: conf ? t.sena : 0,
      nuevo: true,
    };
    const b = est
      ? Object.assign(base, {
          tipo: 'estadia',
          desde: S.desde,
          hasta: S.hasta,
          noches: nightsBetween(S.desde, S.hasta),
        })
      : Object.assign(base, { date: S.date, turno: S.turno });
    q.bookings.push(b);
    save();
    if (est) {
      rng = { a: null, b: null };
    }
    renderQuinta();
    const rows = est
      ? `<div><span class="muted">Entrada</span><b>${fLarga(b.desde)} · ${esc(q.est.checkin)}</b></div><div><span class="muted">Salida</span><b>${fLarga(b.hasta)} · ${esc(q.est.checkout)}</b></div><div><span class="muted">Noches</span><b>${b.noches}</b></div>`
      : `<div><span class="muted">Fecha</span><b>${fLarga(b.date)}</b></div><div><span class="muted">Turno</span><b>${TURNOS[b.turno].n} · ${TURNOS[b.turno].h}</b></div>`;
    sb.innerHTML = `<div class="ok">
    <div class="ok-ic${conf ? '' : ' p'}"><svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true">${conf ? '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M12 7v6l4 2" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'}</svg></div>
    <h3 id="sh-title">${conf ? (est ? '¡Estadía reservada!' : '¡Fecha reservada!') : est ? 'Fechas separadas por 24 h' : 'Fecha separada por 24 h'}</h3>
    <p class="muted">${conf ? (est ? 'La seña está paga y esas noches ya figuran como reservadas para todos.' : 'La seña está paga y el día ya figura como reservado para todos.') : 'Mandá el comprobante de la transferencia y el dueño confirma la reserva.'}</p>
    <div class="ticket">
      <div><span class="muted">Código</span><code>${b.code}</code></div>
      <div><span class="muted">Quinta</span><b>${esc(q.nombre)}</b></div>
      ${rows}
      <div><span class="muted">Personas</span><b>${b.personas}</b></div>
      <div><span class="muted">${conf ? 'Seña pagada' : 'Seña a transferir'}</span><b>${mq(q, t.sena)}</b></div>
      <div><span class="muted">Resto al entrar</span><b>${mq(q, t.saldo)}</b></div>
    </div>
    <p class="note">Te mandamos la confirmación y la dirección al WhatsApp que dejaste.</p>
    <button class="btn wide" id="ok-done">Listo</button>
    <button class="linkbtn" id="ok-panel">Ver cómo le llega al dueño</button>
  </div>`;
    $('#ok-done').onclick = closeSheet;
    $('#ok-panel').onclick = () => {
      closeSheet();
      location.hash = 'panel';
    };
    $('#ok-done').focus();
    const cuando = est ? rangoTxt(b.desde, b.hasta).toLowerCase() : fLarga(b.date).toLowerCase();
    toast(
      conf
        ? `Nueva reserva en ${q.nombre}: ${b.nombre}, ${cuando}`
        : `Nueva solicitud de ${b.nombre}: esperando la transferencia`,
    );
  }

  /* ======================= panel ======================= */
  function bDesc(b) {
    return b.tipo === 'estadia'
      ? `${rangoTxt(b.desde, b.hasta)} · ${plural(b.noches, 'noche')} · ${b.personas} personas · ${b.motivo}`
      : `${fLarga(b.date)} · ${TURNOS[b.turno].n} · ${b.personas} personas · ${b.motivo}`;
  }
  function renderPanel() {
    const q = Q();
    $('#pn-hola').textContent = q.dueno ? 'Hola, ' + q.dueno : 'Tu panel';
    $('#pn-pick').innerHTML = QS.map(
      x =>
        `<option value="${x.id}"${x.id === q.id ? ' selected' : ''}>${esc(x.nombre)}${x.custom ? ' (demo creada)' : ''}</option>`,
    ).join('');
    const conf = q.bookings.filter(b => b.estado === 'confirmada' && bEnd(b) >= TODAY);
    const senas = q.bookings.filter(b => b.estado === 'confirmada').reduce((a, b) => a + b.sena, 0);
    const dec = months.find(([, m]) => m === 11) || months[1],
      [dy, dm] = dec,
      dd = new Date(dy, dm + 1, 0).getDate(),
      slots = slotsOwner(q);
    let taken = 0;
    for (let d = 1; d <= dd; d++) {
      const ds = iso(dy, dm, d);
      slots.forEach(t => {
        if (estadoTurno(q, ds, t) !== 'libre') taken++;
      });
    }
    const occ = Math.round((taken / (dd * slots.length)) * 100);
    $('#kpis').innerHTML = `
    <div class="kpi"><span>Reservas confirmadas</span><b>${conf.length}</b><small>de hoy en adelante</small></div>
    <div class="kpi"><span>Señas cobradas</span><b>${isUSD(q) ? mq(q, senas) : sLq(q, senas)}</b><small>${isUSD(q) ? 'de las reservas confirmadas' : mq(q, senas)}</small></div>
    <div class="kpi"><span>Ocupación de ${cap(DF_MO.format(new Date(dy, dm, 1))).replace('.', '')}</span><b>${occ}%</b><div class="bar"><i style="width:${occ}%"></i></div></div>
    <div class="kpi hl"><span>Consultas que no tuviste que contestar</span><b>${consultas[q.id] || 0}</b><small>la gente miró el calendario sola</small></div>`;
    const pend = q.bookings
      .filter(b => b.estado === 'pendiente' && bEnd(b) >= TODAY)
      .sort((a, b) => bStart(a).localeCompare(bStart(b)));
    $('#pend').innerHTML = pend.length
      ? pend
          .map(
            b =>
              `<div class="req"><div class="req-top"><b>${esc(b.nombre)}${b.nuevo ? ' <span class="pill n">Nueva</span>' : ''}</b><span class="num">${mq(q, senaQ(q, b.total))} de seña</span></div><span class="muted">${esc(bDesc(b))}</span><div class="acts"><button class="btn sm" data-ok="${b.id}">Recibí la seña</button><button class="btn sm ghost" data-free="${b.id}">Liberar ${b.tipo === 'estadia' ? 'las fechas' : 'la fecha'}</button></div></div>`,
          )
          .join('')
      : '<p class="empty">No hay nada pendiente. Todas las reservas tienen la seña paga.</p>';
    const next = q.bookings
      .filter(b => bEnd(b) >= TODAY)
      .sort((a, b) => bStart(a).localeCompare(bStart(b)) || (a.turno || '').localeCompare(b.turno || ''))
      .slice(0, 8);
    $('#next').innerHTML = next.length
      ? next
          .map(b => {
            const d = parse(bStart(b)),
              sub =
                b.tipo === 'estadia'
                  ? `${plural(b.noches, 'noche')} · hasta el ${wd(b.hasta).toLowerCase()} ${parse(b.hasta).getDate()} · ${b.personas} pers.`
                  : `${TURNOS[b.turno].n} · ${b.personas} pers. · ${esc(b.motivo)}`;
            return `<div class="row"><div class="date-tile"><small>${DF_WD.format(d).replace('.', '')}</small><b>${d.getDate()}</b><small>${DF_MO.format(d).replace('.', '')}</small></div><div class="row-main"><b>${esc(b.nombre)}</b><small>${sub}</small></div><div class="row-end">${b.nuevo ? '<span class="pill n">Nueva</span>' : ''}<span class="pill ${b.estado === 'confirmada' ? 'c' : 'p'}">${b.estado === 'confirmada' ? 'Seña paga' : 'Sin seña'}</span><span class="num">${mq(q, b.total)}</span></div></div>`;
          })
          .join('')
      : '<p class="empty">Todavía no hay reservas. Compartí tu link para que empiecen a llegar.</p>';
    const [oy, om] = months[omi];
    $('#ocal-title').textContent = cap(DF_M.format(new Date(oy, om, 1)));
    $('#ocal').innerHTML = calHTML(q, oy, om, 'dueno');
    $('#ocal-prev').disabled = omi === 0;
    $('#ocal-next').disabled = omi === months.length - 1;
    renderPriceInputs(q);
    $('#share-link').textContent = 'novantiq.app/' + q.id;
    $('#pn-ver').href = '#q-' + q.id;
    renderPhotos(q);
  }
  function renderPriceInputs(q) {
    const box = $('#t-box');
    if (box.contains(document.activeElement)) return;
    const row = (path, label, val) =>
      `<label for="tp-${path.replace('.', '-')}">${label}<span class="money-in"><span>${isUSD(q) ? 'US$' : '$'}</span><input id="tp-${path.replace('.', '-')}" data-p="${path}" inputmode="numeric" value="${val.toLocaleString('es-AR')}"></span></label>`;
    let h = '';
    if (hasEst(q))
      h += `<p class="t-group">Para quedarse · por noche</p>${row('est.semana', 'Lunes a jueves', q.est.precios.semana)}${row('est.finde', 'Viernes, sábado, domingo y feriados', q.est.precios.finde)}${row('est.especial', '24, 25, 31 de diciembre y 1 de enero', q.est.precios.especial)}<label for="tp-min">Mínimo de noches<input id="tp-min" data-p="min" type="number" min="1" max="14" value="${q.est.min}" style="border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface);font-weight:700"></label>`;
    if (hasDia(q)) {
      const ts = turnosDe(q);
      h += `<p class="t-group">Por el día · ${ts.length > 1 ? 'por turno' : TURNOS[ts[0]].h}</p>${row('dia.semana', 'Lunes a jueves', q.precios.semana)}${row('dia.finde', 'Viernes, sábado, domingo y feriados', q.precios.finde)}${row('dia.especial', '24, 25, 31 de diciembre y 1 de enero', q.precios.especial)}`;
    }
    box.innerHTML = h;
  }
  $('#t-box').addEventListener('input', e => {
    const el = e.target.closest('[data-p]');
    if (!el) return;
    const q = Q(),
      p = el.dataset.p,
      v = digits(el.value);
    if (!v) return;
    if (p === 'min') q.est.min = Math.max(1, Math.min(14, v));
    else {
      const [g, k] = p.split('.');
      (g === 'est' ? q.est.precios : q.precios)[k] = v;
    }
    save();
  });
  $('#t-box').addEventListener('focusout', e => {
    if (!e.target.closest('[data-p]')) return;
    setTimeout(() => {
      if (!$('#t-box').contains(document.activeElement)) renderPanel();
    }, 0);
  });
  $('#pn-pick').onchange = e => {
    CUR = e.target.value;
    renderPanel();
  };
  $('#pend').addEventListener('click', e => {
    const q = Q(),
      ok = e.target.closest('[data-ok]'),
      fr = e.target.closest('[data-free]');
    if (ok) {
      const b = q.bookings.find(x => x.id === ok.dataset.ok);
      b.estado = 'confirmada';
      b.sena = senaQ(q, b.total);
      save();
      renderPanel();
      toast(`Reserva de ${b.nombre} confirmada. Le avisamos por WhatsApp.`);
    }
    if (fr) {
      const i = q.bookings.findIndex(x => x.id === fr.dataset.free),
        b = q.bookings[i];
      q.bookings.splice(i, 1);
      save();
      renderPanel();
      toast(
        b.tipo === 'estadia'
          ? `Liberaste ${rangoTxt(b.desde, b.hasta).toLowerCase()}. Ya aparece libre en tu página.`
          : `Liberaste el ${fLarga(b.date).toLowerCase()}. Ya aparece libre en tu página.`,
      );
    }
  });
  $('#ocal-prev').onclick = () => {
    if (omi > 0) {
      omi--;
      renderPanel();
    }
  };
  $('#ocal-next').onclick = () => {
    if (omi < months.length - 1) {
      omi++;
      renderPanel();
    }
  };
  $('#ocal').addEventListener('click', e => {
    const b = e.target.closest('.day');
    if (!b || b.disabled) return;
    const q = Q(),
      ds = b.dataset.date;
    if (isBlk(q, ds)) {
      q.blocked = q.blocked.filter(x => x !== ds);
      save();
      renderPanel();
      toast(`Liberaste el ${fLarga(ds).toLowerCase()}.`);
      return;
    }
    if (bookingOf(q, ds, 'dia') || bookingOf(q, ds, 'noche') || stayAt(q, ds)) {
      toast('Ese día tiene una reserva. Si querés liberarlo, hacelo desde la reserva.');
      return;
    }
    q.blocked.push(ds);
    save();
    renderPanel();
    toast(`Bloqueaste el ${fLarga(ds).toLowerCase()}. Nadie lo puede reservar.`);
  });
  $('#btn-copy').onclick = () => {
    const txt = 'https://' + $('#share-link').textContent,
      sel = () => {
        const r = document.createRange();
        r.selectNodeContents($('#share-link'));
        const s = getSelection();
        s.removeAllRanges();
        s.addRange(r);
        toast('Seleccioné el link: copialo con el menú del teléfono.');
      };
    try {
      navigator.clipboard.writeText(txt).then(() => toast('Link copiado.'), sel);
    } catch (_) {
      sel();
    }
  };

  /* ======================= portal ======================= */
  const ZONAS = () => [...new Set(QS.map(q => q.zona))].sort((a, b) => a.localeCompare(b, 'es'));
  const flt = { libres: true, clima: false, cancha: false, precio: false };
  function nextSaturday() {
    let d = TODAY;
    while (parse(d).getDay() !== 6) d = addDays(d, 1);
    return d;
  }
  function nextFriday() {
    let d = TODAY;
    while (parse(d).getDay() !== 5) d = addDays(d, 1);
    return d;
  }
  function initSearch() {
    const f = $('#s-fecha');
    f.min = TODAY;
    f.max = LAST_DAY;
    if (!f.value) f.value = nextSaturday();
    const z = $('#s-zona'),
      cur = z.value;
    z.innerHTML =
      '<option value="">Todas las zonas</option>' +
      ZONAS()
        .map(x => `<option${x === cur ? ' selected' : ''}>${esc(x)}</option>`)
        .join('');
  }
  $('#s-tipo').addEventListener('change', () => {
    const f = $('#s-fecha');
    if ($('#s-tipo').value === 'est' && parse(f.value).getDay() === 6) f.value = nextFriday();
    else if ($('#s-tipo').value === 'dia' && f.value && parse(f.value).getDay() === 5) f.value = addDays(f.value, 1);
    renderPortal();
  });
  ['s-fecha', 's-turno', 's-pers', 's-zona', 's-noches'].forEach(id =>
    $('#' + id).addEventListener('change', renderPortal),
  );
  /* botones grandes "Pasar el día" / "Quedarme a dormir" (manejan el select oculto #s-tipo) */
  $('.mode').addEventListener('click', e => {
    const b = e.target.closest('[data-tipo]');
    if (!b || $('#s-tipo').value === b.dataset.tipo) return;
    $('#s-tipo').value = b.dataset.tipo;
    $('#s-tipo').dispatchEvent(new Event('change'));
  });
  /* fechas rápidas: próximos sábados y domingos, o próximos fines de semana */
  const dm = ds => `${parse(ds).getDate()}/${parse(ds).getMonth() + 1}`;
  function renderQuickDates(est, ds) {
    let opts = [];
    if (est) {
      opts = nextFridays(3).map(f => ({ ds: f, n: 2, txt: `Finde ${parse(f).getDate()} al ${dm(addDays(f, 2))}` }));
    } else {
      let d = TODAY;
      while (opts.length < 4 && d <= LAST_DAY) {
        const w = parse(d).getDay();
        if (w === 6 || w === 0) opts.push({ ds: d, txt: `${wd(d)} ${dm(d)}` });
        d = addDays(d, 1);
      }
    }
    const nN = +$('#s-noches').value || 2;
    $('#s-quick').innerHTML =
      `<span class="qd-l">${est ? 'Rápido:' : 'Este finde y el próximo:'}</span>` +
      opts
        .map(
          o =>
            `<button type="button" class="chip" data-qd="${o.ds}"${o.n ? ` data-qn="${o.n}"` : ''} aria-pressed="${o.ds === ds && (!o.n || o.n === nN)}">${o.txt}</button>`,
        )
        .join('');
  }
  $('#s-quick').addEventListener('click', e => {
    const b = e.target.closest('[data-qd]');
    if (!b) return;
    $('#s-fecha').value = b.dataset.qd;
    if (b.dataset.qn) $('#s-noches').value = b.dataset.qn;
    renderPortal();
  });
  $('#s-go').onclick = () => {
    renderPortal();
    $('#resultados').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  [
    ['f-libres', 'libres'],
    ['f-clima', 'clima'],
    ['f-cancha', 'cancha'],
    ['f-precio', 'precio'],
  ].forEach(([id, k]) => {
    $('#' + id).onclick = e => {
      flt[k] = !flt[k];
      e.currentTarget.setAttribute('aria-pressed', flt[k]);
      renderPortal();
    };
  });
  function availOn(q, ds, t) {
    const ts = turnosDe(q);
    if (t === 'any') {
      const f = ts.filter(x => libre(q, ds, x)).length;
      return f === ts.length ? 2 : f ? 1 : 0;
    }
    if (!ts.includes(t)) return 0;
    return libre(q, ds, t) ? 2 : 0;
  }
  function nextSats(n) {
    const out = [];
    let d = nextSaturday();
    while (out.length < n && d <= LAST_DAY) {
      out.push(d);
      d = addDays(d, 7);
    }
    return out;
  }
  const modoTag = q => (hasEst(q) && hasDia(q) ? 'Día y estadía' : hasEst(q) ? 'Para quedarse' : 'Por día');
  function renderPortal() {
    const est = $('#s-tipo').value === 'est';
    $('#sf-turno').hidden = est;
    $('#sf-noches').hidden = !est;
    setAmbiente(est ? 'noche' : 'dia');
    $('#s-fecha-l').textContent = est ? '¿Qué día llegás?' : '¿Qué día?';
    $$('.mode [data-tipo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tipo === (est ? 'est' : 'dia'))));
    const nN = +$('#s-noches').value || 2;
    let ds = $('#s-fecha').value;
    if (!ds || ds < TODAY || ds > LAST_DAY) {
      ds = est ? nextFriday() : nextSaturday();
      $('#s-fecha').value = ds;
    }
    const salida = addDays(ds, nN);
    renderQuickDates(est, ds);
    const t = $('#s-turno').value,
      pers = +$('#s-pers').value,
      zona = $('#s-zona').value;
    const unit = q => (est ? precioNoche(q, ds) : precio(q, ds));
    let list = QS.filter(
      q =>
        (est ? hasEst(q) : hasDia(q)) &&
        q.cap >= pers &&
        (!zona || q.zona === zona) &&
        (!flt.clima || q.clima) &&
        (!flt.cancha || q.cancha) &&
        (!flt.precio || enPesos(q, unit(q)) <= 250000),
    );
    const pool = list.length;
    const rows = list.map(q => ({ q, av: est ? (rangoLibre(q, ds, salida) ? 2 : 0) : availOn(q, ds, t) }));
    const libres = rows.filter(r => r.av > 0).length;
    const price = q => (est ? nightsTotal(q, ds, salida) : precio(q, ds));
    const shown = (flt.libres ? rows.filter(r => r.av > 0) : rows).sort(
      (a, b) =>
        (b.av > 0) - (a.av > 0) ||
        tieneFotos(b.q) - tieneFotos(a.q) ||
        enPesos(a.q, price(a.q)) - enPesos(b.q, price(b.q)),
    );
    const tTxt = t === 'any' ? '' : t === 'noche' ? ' a la noche' : ' de día';
    $('#p-sum').innerHTML = est
      ? `<b>${libres}</b> de ${pool} quintas libres para quedarse ${esc(rangoTxt(ds, salida).toLowerCase())}`
      : `<b>${libres}</b> de ${pool} quintas libres el ${esc(fLarga(ds).toLowerCase())}${tTxt}`;
    const total = QS.reduce((a, q) => a + q.bookings.filter(b => bEnd(b) >= TODAY).length, 0);
    $('#netstats').innerHTML =
      `<span><b>${QS.length}</b> quintas</span><span><b>${ZONAS().length}</b> zonas</span><span><b>${total}</b> reservas próximas</span>`;
    const sats = nextSats(6),
      frs = nextFridays(6);
    $('#cards').innerHTML = shown.length
      ? shown
          .map(({ q, av }) => {
            const cover = portadaDe(q),
              bd = est
                ? av
                  ? 'Libre esas noches'
                  : 'Ocupada esas noches'
                : av === 2
                  ? t === 'any' && turnosDe(q).length > 1
                    ? 'Libre todo el día'
                    : 'Libre'
                  : av === 1
                    ? 'Queda un turno'
                    : 'Ocupada ese día';
            const tq = turnosDe(q).includes('noche') ? 'noche' : 'dia';
            const strip = est
              ? `<p class="strip-l">Próximos fines de semana (vie a dom)</p><div class="strip">${frs
                  .map(f => {
                    const ok = rangoLibre(q, f, addDays(f, 2));
                    return `<span class="${ok ? '' : 'x'}" title="${esc(rangoTxt(f, addDays(f, 2)))}: ${ok ? 'libre' : 'reservado'}">${parse(f).getDate()}/${parse(f).getMonth() + 1}</span>`;
                  })
                  .join('')}</div>`
              : `<p class="strip-l">Próximos sábados ${tq === 'noche' ? 'a la noche' : 'de día'}</p><div class="strip">${sats.map(s => `<span class="${libre(q, s, tq) ? '' : 'x'}" title="${esc(fLarga(s))}: ${libre(q, s, tq) ? 'libre' : 'reservado'}">${parse(s).getDate()}/${parse(s).getMonth() + 1}</span>`).join('')}</div>`;
            return `<article class="qcard${av ? '' : ' off'}">
      <a class="thumb" href="#q-${q.id}" data-go-date="${ds}" aria-label="Ver ${esc(q.nombre)}">${cover ? `<img src="${cover.src}" alt="" loading="lazy">` : `<canvas data-thumb="${q.id}"></canvas>`}<span class="badge${av === 2 ? '' : av === 1 ? ' half' : ' no'}">${bd}</span>${!tieneFotos(q) && !q.custom ? '<span class="demo-tag">Quinta de ejemplo</span>' : ''}</a>
      <div class="qbody">
        <div class="qtop"><h3>${esc(q.nombre)}</h3>${q.ops ? `<span class="rating"><i>★</i> ${q.rating.toFixed(1).replace('.', ',')}</span>` : '<span class="tag c">Nueva</span>'}</div>
        <p class="qmeta">${esc(q.zona)} · ${esc(q.dist)}</p>
        <div class="tags"><span class="tag c">${modoTag(q)}</span><span class="tag">Hasta ${q.cap} personas</span>${hasEst(q) ? `<span class="tag">${plural(q.est.dormitorios, 'dormitorio')}</span>` : ''}<span class="tag">${esc(pileTxt(q))}</span>${q.cancha ? '<span class="tag">Cancha</span>' : '<span class="tag">Parque</span>'}<span class="tag">${esc(quinchoTxt(q))}</span></div>
        <div>${strip}</div>
        <div class="qfoot"><span class="price"><b>${mq(q, price(q))}</b><small>${est ? 'por ' + plural(nN, 'noche') : 'por turno ese día'}${av ? ` · seña ${mq(q, senaQ(q, price(q)))}` : ''}</small></span><a class="btn ${av ? '' : 'ghost '}sm" href="#q-${q.id}" data-go-date="${ds}">${av ? 'Ver y reservar' : 'Ver otras fechas'}</a></div>
      </div></article>`;
          })
          .join('')
      : `<div class="empty-box"><b>No hay quintas libres con esos filtros</b><p class="muted">Probá con otras fechas, otra zona o desactivá “Solo libres” para ver las ocupadas.</p><button class="btn ghost sm" id="clear-f">Ver todas</button></div>`;
    const cf = $('#clear-f');
    if (cf)
      cf.onclick = () => {
        flt.libres = flt.clima = flt.cancha = flt.precio = false;
        $$('.filters .chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
        $('#s-zona').value = '';
        $('#s-pers').value = '0';
        renderPortal();
      };
    $$('[data-thumb]').forEach(c => drawThumb(c, byId(c.dataset.thumb)));
  }
  $('#cards').addEventListener('click', e => {
    const a = e.target.closest('[data-go-date]');
    if (!a) return;
    const ds = a.dataset.goDate,
      q = byId(a.getAttribute('href').slice(3));
    if (!q) return;
    monthOf(ds);
    if ($('#s-tipo').value === 'est') {
      const b = addDays(ds, +$('#s-noches').value || 2);
      calMode = 'est';
      rngQ = q.id;
      if (rangoLibre(q, ds, b)) {
        rng = { a: ds, b };
        pendingStay = true;
      } else rng = { a: null, b: null };
      selDate = null;
    } else {
      calMode = 'dia';
      if (turnosDe(q).some(t => libre(q, ds, t))) {
        selDate = ds;
        pendingOpen = ds;
      } else selDate = null;
    }
  });

  /* ======================= creador ======================= */
  const slug = s =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 28) || 'quinta';
  function draftFromForm() {
    const v = id => $('#' + id).value.trim();
    return {
      nombre: v('c-nombre') || 'Quinta La Esperanza',
      zona: v('c-zona') || 'Florencio Varela',
      dist: v('c-dist') || 'a 40 min de CABA',
      dueno: v('c-dueno') || 'Claudio',
      cap: Math.max(2, Math.min(200, digits(v('c-cap')) || 40)),
      pileta: v('c-pileta'),
      quincho: v('c-quincho'),
      cancha: $('#c-cancha').checked,
      clima: $('#c-clima').checked,
      floor: $('#c-piso').value,
      ps: digits(v('c-ps')) || 180000,
      pf: digits(v('c-pf')) || 280000,
      pe: digits(v('c-pe')) || 550000,
      moneda: $('#c-moneda').value,
      mDia: $('#c-m-dia').checked,
      mEst: $('#c-m-est').checked,
      turnos: $('#c-turnos').value.split(','),
      dorm: Math.max(1, digits(v('c-dorm')) || 3),
      banos: Math.max(1, digits(v('c-banos')) || 2),
      min: Math.max(1, Math.min(14, digits(v('c-min')) || 1)),
      ns: digits(v('c-ns')) || 200000,
      nf: digits(v('c-nf')) || 280000,
      ne: digits(v('c-ne')) || 450000,
    };
  }
  function syncModes() {
    $('#c-est').hidden = !$('#c-m-est').checked;
    $('#c-dia').hidden = !$('#c-m-dia').checked;
  }
  ['c-m-est', 'c-m-dia'].forEach(id => $('#' + id).addEventListener('change', syncModes));
  let prevV = null,
    prevT = 0;
  function refreshPreview() {
    const d = draftFromForm();
    const q = {
      nombre: d.nombre,
      cancha: d.cancha,
      clima: d.clima,
      pileta: d.pileta,
      quincho: d.quincho,
      look: { deck: '#E7DECB', w1: '#63D6E2', w2: '#1A8DB2', floor: d.floor, patio: '#CDB898', seed: 7 },
    };
    if (prevV) prevV.setScene(createScene(q));
    else prevV = makeViewer($('#c-scene'), createScene(q), {});
  }
  $('#c-form').addEventListener('input', () => {
    clearTimeout(prevT);
    prevT = setTimeout(refreshPreview, 250);
  });
  ['c-ps', 'c-pf', 'c-pe', 'c-ns', 'c-nf', 'c-ne'].forEach(id =>
    $('#' + id).addEventListener('blur', e => {
      const v = digits(e.target.value);
      if (v) e.target.value = v.toLocaleString('es-AR');
    }),
  );
  $('#c-form').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#c-err');
    if ($('#c-nombre').value.trim().length < 3) {
      err.textContent = 'Escribí el nombre de la quinta (al menos 3 letras).';
      err.hidden = false;
      $('#c-nombre').focus();
      return;
    }
    if (!$('#c-m-dia').checked && !$('#c-m-est').checked) {
      err.textContent = 'Elegí al menos una forma de alquilar: para quedarse o por día.';
      err.hidden = false;
      return;
    }
    err.hidden = true;
    const d = draftFromForm();
    let id = slug(d.nombre);
    if (byId(id)) id += '-' + Math.random().toString(36).slice(2, 5);
    const seed = Math.floor(Math.random() * 1e6);
    const o = {
      id,
      nombre: d.nombre,
      zona: d.zona,
      dist: d.dist,
      dueno: d.dueno,
      cap: d.cap,
      pileta: d.pileta,
      clima: d.clima,
      cancha: d.cancha,
      quincho: d.quincho,
      precios: { semana: d.ps, finde: d.pf, especial: d.pe },
      rating: 0,
      ops: 0,
      custom: true,
      look: { floor: d.floor },
      modos: { dia: d.mDia, estadia: d.mEst },
      turnos: d.turnos,
      moneda: d.moneda,
    };
    if (d.mEst)
      o.est = {
        precios: { semana: d.ns, finde: d.nf, especial: d.ne },
        min: d.min,
        checkin: '14 h',
        checkout: '11 h',
        dormitorios: d.dorm,
        banos: d.banos,
      };
    const q = mkQuinta(o, 0.5, seed);
    QS.unshift(q);
    consultas[id] = 23;
    save();
    CUR = id;
    const files = [...$('#c-fotos').files];
    if (files.length) {
      $('#c-go').disabled = true;
      $('#c-go').textContent = 'Subiendo fotos…';
      await addFotos(id, files);
      $('#c-go').disabled = false;
      $('#c-go').textContent = 'Crear la demo';
      $('#c-fotos').value = '';
      $('#c-fotos-n').textContent = 'Si no subís, se muestran imágenes ilustrativas.';
    }
    renderMade();
    toast(`Listo: ${d.nombre} ya tiene su página y aparece en el buscador.`);
    location.hash = 'q-' + id;
  });
  function renderMade() {
    const mine = QS.filter(q => q.custom);
    $('#made').innerHTML = mine.length
      ? mine
          .map(
            q =>
              `<div class="made-row"><span><b>${esc(q.nombre)}</b><small>${esc(q.zona)} · ${q.cap} personas · ${modoTag(q)}</small></span><span style="display:flex;gap:6px"><a class="btn sm" href="#q-${q.id}">Ver página</a><button class="btn ghost sm" data-del="${q.id}">Borrar</button></span></div>`,
          )
          .join('')
      : '<p class="empty">Todavía no creaste ninguna. Completá el formulario y tocá “Crear la demo”.</p>';
  }
  $('#made').addEventListener('click', e => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    if (b.dataset.armed !== '1') {
      b.dataset.armed = '1';
      b.textContent = '¿Seguro? Tocá de nuevo';
      setTimeout(() => {
        if (document.contains(b)) {
          b.dataset.armed = '';
          b.textContent = 'Borrar';
        }
      }, 3500);
      return;
    }
    const i = QS.findIndex(q => q.id === b.dataset.del);
    if (i >= 0) {
      const n = QS[i].nombre;
      clearFotos(QS[i].id);
      QS.splice(i, 1);
      if (CUR === b.dataset.del) CUR = QS[0].id;
      save();
      renderMade();
      toast(`Borraste la demo de ${n}.`);
    }
  });
  $('#btn-reset').onclick = e => {
    const b = e.currentTarget;
    if (b.dataset.armed !== '1') {
      b.dataset.armed = '1';
      b.textContent = 'Se borran reservas, fotos y demos creadas. Tocá de nuevo';
      setTimeout(() => {
        b.dataset.armed = '';
        b.textContent = 'Reiniciar todos los datos de la demo';
      }, 4000);
      return;
    }
    QS.forEach(q => clearFotos(q.id));
    try {
      localStorage.removeItem(KEY);
    } catch (_) {}
    load();
    CUR = QS[0].id;
    thumbCache.clear();
    b.dataset.armed = '';
    b.textContent = 'Reiniciar todos los datos de la demo';
    renderMade();
    toast('Listo, la demo volvió a como estaba al principio.');
  };

  /* ======================= ESCENA ANIMADA ======================= */
  const W = 960,
    H = 600,
    TAU = Math.PI * 2;
  let ctx = null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SHIRT = [
    '#E94F37',
    '#F6AE2D',
    '#2F9C95',
    '#3B5BDB',
    '#F7F7F7',
    '#8E44AD',
    '#FF7F50',
    '#1B998B',
    '#E36588',
    '#FFD166',
    '#5DADE2',
    '#A3CB38',
  ];
  const SKIN = ['#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#FFDBAC', '#D9A273'];
  const HAIR = ['#2B1B10', '#4A2F1B', '#6B4226', '#D9A55B', '#1A1A1A', '#8C8C8C', '#B5562B'];
  function lerpAng(a, b, k) {
    let d = ((b - a + Math.PI * 3) % TAU) - Math.PI;
    return a + d * k;
  }
  function step(p, tx, ty, sp, dt) {
    const dx = tx - p.x,
      dy = ty - p.y,
      d = Math.hypot(dx, dy);
    if (d < 1.2) {
      p.moving = false;
      return true;
    }
    const m = Math.min(d, sp * dt);
    p.x += (dx / d) * m;
    p.y += (dy / d) * m;
    p.ang = lerpAng(p.ang, Math.atan2(dy, dx), Math.min(1, dt * 10));
    p.moving = true;
    p.phase += dt * sp * 0.28;
    return false;
  }
  function follow(p, dt, sp) {
    if (!p.path || !p.path.length) return true;
    const [tx, ty] = p.path[0];
    if (step(p, tx, ty, sp, dt)) p.path.shift();
    return p.path.length === 0;
  }
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function circ(x, y, r, c) {
    if (c) ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  function ell(x, y, a, b, rot, c) {
    if (c) ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(x, y, a, b, rot || 0, 0, TAU);
    ctx.fill();
  }
  function drawPerson(p, o = {}) {
    const s = o.scale || 1,
      lift = p.lift || 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    ell(1.5 + lift * 4, 2.5 + lift * 5, 7 * s, 5.5 * s, 0, 'rgba(0,0,0,.2)');
    ctx.translate(0, -lift * 7);
    ctx.rotate(p.ang);
    ctx.scale(s * (1 + lift * 0.25), s * (1 + lift * 0.25));
    const sw = p.moving ? Math.sin(p.phase) * 2.4 : 0;
    ctx.fillStyle = p.skin;
    if (o.armUp) {
      circ(7.5, 5.5, 2);
      circ(9.6, 6, 1.9, o.mate ? '#8B5A2B' : 'rgba(235,245,255,.95)');
      ctx.fillStyle = p.skin;
      circ(1, -7.2, 2);
    } else {
      circ(1 + sw, -7.2, 2);
      circ(1 - sw, 7.2, 2);
    }
    ell(0, 0, 4.3, 7.2, 0, p.shirt);
    ctx.strokeStyle = 'rgba(0,0,0,.12)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    if (o.hold === 'cup') circ(4.5, 7, 1.8, 'rgba(235,245,255,.95)');
    if (o.hold === 'mate') {
      circ(4.5, 7, 2.1, '#8B5A2B');
      circ(4.5, 7, 1, '#4E7A2E');
    }
    if (o.hold === 'tray') {
      circ(8, 0, 5.4, '#E4E4E4');
      ell(8, -1.4, 2.8, 1.3, 0, '#9A3B22');
      ell(8, 1.6, 2.8, 1.3, 0, '#7E2E1A');
    }
    circ(0.8, 0, 3.9, p.skin);
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.arc(0.8, 0, 4.05, Math.PI * 0.52, Math.PI * 1.48);
    ctx.fill();
    if (o.hat) {
      circ(0.4, 0, 4.6, '#FFFFFF');
      circ(-0.6, -1, 2.4, '#F1F1F1');
    }
    if (o.cap) {
      ctx.fillStyle = o.cap;
      ctx.beginPath();
      ctx.arc(0.4, 0, 4.2, -Math.PI / 2, Math.PI / 2, true);
      ctx.fill();
      ell(4.4, 0, 2.4, 3.4, 0, o.cap);
    }
    ctx.restore();
  }
  function drawLying(x, y, p) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = p.skin;
    rr(-3.4, 2, 2.8, 14, 1.4);
    ctx.fill();
    rr(0.6, 2, 2.8, 14, 1.4);
    ctx.fill();
    rr(-7.4, -6, 2.5, 10, 1.2);
    ctx.fill();
    rr(4.9, -6, 2.5, 10, 1.2);
    ctx.fill();
    ctx.fillStyle = p.shirt;
    rr(-4.8, -6.5, 9.6, 10.5, 4);
    ctx.fill();
    circ(0, -10.2, 3.7, p.skin);
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.arc(0, -10.2, 3.8, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = '#1B1B1B';
    rr(-2.6, -9.8, 5.2, 1.3, 0.6);
    ctx.fill();
    ctx.restore();
  }
  function drawSwim(a, t) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.ang);
    ell(-6, 0, 10, 5.2, 0, 'rgba(255,255,255,.16)');
    ctx.globalAlpha = 0.42;
    ell(-6.5, 0, 7.5, 3.8, 0, a.shirt);
    ctx.globalAlpha = 1;
    const s = Math.sin(a.phase * 1.3);
    ell(3 + s * 4, -5.2, 3.2, 1.4, 0, a.skin);
    ell(3 - s * 4, 5.2, 3.2, 1.4, 0, a.skin);
    circ(2, 0, 3.7, a.skin);
    ctx.fillStyle = a.hair;
    ctx.beginPath();
    ctx.arc(2, 0, 3.85, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(1, 0, 8.5 + Math.sin(t * 3 + a.phase) * 0.8, 7, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  function drawFloat(a, t) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(t * 0.25);
    ctx.strokeStyle = 'rgba(0,0,0,.12)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(1.5, 2, 9.5, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = '#FF5F87';
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, (i * Math.PI) / 2, (i * Math.PI) / 2 + 0.35);
      ctx.stroke();
    }
    ctx.rotate(-t * 0.25 + a.ang);
    ctx.fillStyle = a.skin;
    circ(4, -7, 1.8);
    circ(4, 7, 1.8);
    circ(0, 0, 3.8, a.skin);
    ctx.fillStyle = a.hair;
    ctx.beginPath();
    ctx.arc(0, 0, 3.9, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    ctx.restore();
  }
  function drawDog(d, t) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ell(1.5, 2.5, 9, 5, 0, 'rgba(0,0,0,.18)');
    ctx.rotate(d.ang);
    ctx.strokeStyle = '#9A5C2A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-13, Math.sin(t * 16) * 3.5);
    ctx.stroke();
    ell(0, 0, 8.5, 4.4, 0, '#A86A35');
    ell(-1, 0, 4, 2.6, 0, '#8E5526');
    circ(8.5, 0, 3.8, '#8A5225');
    ell(7.2, -3.6, 2, 1.2, 0.4, '#6E3F1A');
    ell(7.2, 3.6, 2, 1.2, -0.4, '#6E3F1A');
    circ(12, 0, 1.5, '#2A1A10');
    ctx.restore();
  }
  function umbrella(x, y, c) {
    ell(x + 5, y + 6, 22, 19, 0, 'rgba(0,0,0,.16)');
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#FFFFFF' : c;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, 21, (i * TAU) / 8, ((i + 1) * TAU) / 8);
      ctx.closePath();
      ctx.fill();
    }
    circ(x, y, 2.4, '#555');
  }
  function plant(x, y) {
    circ(x, y, 8, '#A0522D');
    for (let i = 0; i < 7; i++) {
      const a = (i * TAU) / 7;
      ell(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 6, 2.6, a, i % 2 ? '#3E8E41' : '#58B05C');
    }
  }
  function tree(x, y, r, t) {
    ell(x + 7, y + 8, r, r * 0.85, 0, 'rgba(0,0,0,.2)');
    const sw = Math.sin(t * 0.8 + x) * 1.2;
    circ(x + sw, y, r, '#2F6B3A');
    circ(x - r * 0.3 + sw, y - r * 0.25, r * 0.62, '#3E8A47');
    circ(x + r * 0.28 + sw, y + r * 0.15, r * 0.55, '#367C40');
    circ(x - r * 0.15 + sw, y - r * 0.42, r * 0.3, '#5BAA5A');
  }
  function glow(x, y, r, c, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${c},${a})`);
    g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const DECK = { x: 40, y: 40, w: 440, h: 250 },
    WATER = { x: 84, y: 80, w: 322, h: 156 },
    LOUNGERS = [118, 168, 218, 268, 318];
  const FB = { x0: 70, x1: 450, y0: 345, y1: 555, g0: 418, g1: 482, cx: 260, cy: 450 };
  const TABLE = { x: 595, y: 418, w: 250, h: 50 };
  const SEATS = [];
  [615, 655, 695, 735, 775, 815].forEach(x => {
    SEATS.push({ x, y: 404, ang: Math.PI / 2 });
    SEATS.push({ x, y: 482, ang: -Math.PI / 2 });
  });
  SEATS.push({ x: 579, y: 443, ang: 0 });
  SEATS.push({ x: 861, y: 443, ang: Math.PI });
  const POLES = [
    [540, 340],
    [720, 340],
    [900, 340],
    [540, 560],
    [720, 560],
    [900, 560],
  ];
  function wire(a, b, sag) {
    const n = Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 24));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      pts.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k + Math.sin(Math.PI * k) * sag]);
    }
    return pts;
  }
  const WIRES = [
    wire([540, 340], [540, 560], 8),
    wire([900, 340], [900, 560], 8),
    wire([540, 340], [900, 340], 12),
    wire([540, 560], [900, 560], 12),
    wire([720, 340], [720, 560], 8),
  ];
  const BULBS = [];
  WIRES.forEach(w => w.slice(1, -1).forEach(p => BULBS.push(p)));
  const TREES = [
    [16, 18, 28],
    [944, 20, 30],
    [18, 584, 28],
    [942, 582, 32],
    [500, 8, 22],
    [16, 306, 22],
    [944, 306, 24],
    [500, 594, 22],
  ];
  const TEAMC = ['#F07D2A', '#2D6CDF'];

  function createScene(cfg) {
    const L = cfg.look;
    const R = mulberry(L.seed || 7),
      pick = a => a[Math.floor(R() * a.length)],
      rv = (a, b) => a + R() * (b - a);
    const mk = (x, y, o) =>
      Object.assign(
        {
          x,
          y,
          ang: Math.PI / 2,
          phase: R() * 6,
          shirt: pick(SHIRT),
          skin: pick(SKIN),
          hair: pick(HAIR),
          moving: false,
          lift: 0,
        },
        o || {},
      );
    const tufts = [];
    for (let i = 0; i < 420; i++)
      tufts.push({
        x: rv(0, W),
        y: rv(0, H),
        r: rv(2, 5),
        a: rv(0, 3),
        c: R() < 0.5 ? 'rgba(40,90,30,.22)' : 'rgba(170,215,110,.25)',
      });
    const coals = [];
    for (let i = 0; i < 26; i++) coals.push({ x: rv(574, 716), y: rv(70, 100), r: rv(2.2, 4), p: rv(0, 6) });
    const floats = [];
    /* pileta */
    const poolers = LOUNGERS.map(lx => mk(lx, 269, { lx, ly: 269, st: 'lounge', t: rv(1, 9) }));
    poolers[1].st = 'swim';
    poolers[1].t = 8;
    poolers[1].x = 200;
    poolers[1].y = 150;
    poolers[3].st = 'swim';
    poolers[3].t = 4;
    poolers[3].x = 320;
    poolers[3].y = 190;
    const floater = mk(150, 130, { tx: 150, ty: 130 }),
      lapper = mk(110, 185, { dir: 1 });
    const edgeSit = mk(196, 73, { ang: Math.PI / 2 });
    const ripples = [],
      drops = [];
    const splash = (x, y) => {
      for (let i = 0; i < 3; i++) ripples.push({ x, y, r: 3 + i * 4, life: 1, sp: 16 + i * 6 });
      for (let i = 0; i < 12; i++) {
        const a = rnd(0, TAU),
          v = rnd(20, 55);
        drops.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.35, 0.6) });
      }
    };
    /* parrilla */
    const asador = mk(640, 124, { shirt: '#FFFFFF', st: 'grill', t: 6, tx: 640, idle: 0, ang: -Math.PI / 2 });
    const charla = [
      mk(796, 222, { ang: 0 }),
      mk(826, 226, { ang: Math.PI }),
      mk(812, 246, { ang: -Math.PI / 2 }),
    ];
    let platos = 1;
    const smoke = [];
    let smokeT = 0;
    /* cancha o parque */
    const ball = { x: FB.cx, y: FB.cy, vx: 0, vy: 0 };
    let score = [0, 0],
      goalT = 0;
    const players = [];
    if (cfg.cancha) {
      [
        [150, 395],
        [150, 505],
        [215, 450],
      ].forEach(h => players.push(mk(h[0], h[1], { team: 0, hx: h[0], hy: h[1], cd: 0, shirt: TEAMC[0] })));
      [
        [370, 395],
        [370, 505],
        [305, 450],
      ].forEach(h => players.push(mk(h[0], h[1], { team: 1, hx: h[0], hy: h[1], cd: 0, shirt: TEAMC[1] })));
      players.push(mk(84, 450, { team: 0, hx: 84, hy: 450, cd: 0, keeper: true, shirt: '#2BB673' }));
      players.push(mk(436, 450, { team: 1, hx: 436, hy: 450, cd: 0, keeper: true, shirt: '#F2C230' }));
    }
    const ronda = []; // mates en mantas
    [
      [120, 400],
      [150, 505],
    ].forEach(([cx, cy], g) => {
      for (let i = 0; i < 3; i++) {
        const a = (i * TAU) / 3 + g;
        ronda.push(
          mk(cx + Math.cos(a) * 20, cy + Math.sin(a) * 16, { ang: a + Math.PI, cx, cy, k: R() * 6 }),
        );
      }
    });
    const volley = [
      mk(280, 415, { side: 0, hx: 280, hy: 415 }),
      mk(280, 490, { side: 0, hx: 280, hy: 490 }),
      mk(400, 415, { side: 1, hx: 400, hy: 415 }),
      mk(400, 490, { side: 1, hx: 400, hy: 490 }),
    ];
    const vb = { fx: 280, fy: 415, tx: 400, ty: 420, k: 0, dur: 1.3, hitter: volley[0], recv: volley[2] };
    /* quincho */
    const EMPTY = new Set([6, 9]);
    const seated = SEATS.map((s, i) =>
      EMPTY.has(i) ? null : mk(s.x, s.y, { ang: s.ang, base: s.ang, k: R() * 6 }),
    );
    const mozo = mk(566, 392, { i: 0, pause: 0, shirt: '#1F2A30' });
    const MOZO_P = [
      [566, 392],
      [876, 392],
      [876, 494],
      [566, 494],
    ];
    let brindisT = 0,
      brindisCD = 9;
    const notes = [];
    let noteT = 0;
    const dog = { x: 500, y: 300, ang: 0, tx: 500, ty: 300, pause: 0 };
    const DOG_PTS = [
      [500, 30],
      [500, 300],
      [300, 305],
      [700, 305],
      [500, 580],
      [22, 300],
      [938, 300],
      [500, 160],
      [500, 440],
      [600, 300],
      [400, 300],
    ];

    function updPool(dt) {
      for (const a of poolers) {
        switch (a.st) {
          case 'lounge':
            a.t -= dt;
            a.x = a.lx;
            a.y = a.ly;
            if (a.t <= 0) {
              const side = Math.random() < 0.5 ? 62 : 443;
              a.path = [
                [a.lx, 244],
                [side, 244],
                [side, 60],
                [rnd(110, 380), 60],
              ];
              a.st = 'walk';
            }
            break;
          case 'walk':
            if (follow(a, dt, 34)) {
              a.st = 'jump';
              a.t = 0;
              a.jy = a.y;
              a.ang = Math.PI / 2;
            }
            break;
          case 'jump':
            {
              a.t += dt / 0.75;
              const k = Math.min(a.t, 1);
              a.y = a.jy + (112 - a.jy) * k;
              a.lift = Math.sin(Math.PI * k);
              if (k >= 1) {
                a.lift = 0;
                splash(a.x, a.y);
                a.st = 'swim';
                a.t = rnd(7, 13);
                a.tx = null;
              }
            }
            break;
          case 'swim':
            a.t -= dt;
            if (a.tx == null || step(a, a.tx, a.ty, 20, dt)) {
              a.tx = rnd(WATER.x + 16, WATER.x + WATER.w - 30);
              a.ty = rnd(WATER.y + 14, WATER.y + WATER.h - 14);
            }
            a.phase += dt * 3;
            if (Math.random() < dt * 2) ripples.push({ x: a.x, y: a.y, r: 4, life: 0.7, sp: 10 });
            if (a.t <= 0) a.st = 'toLadder';
            break;
          case 'toLadder':
            a.phase += dt * 3;
            if (step(a, 394, 107, 22, dt)) {
              a.st = 'climb';
              a.t = 0;
            }
            break;
          case 'climb':
            a.t += dt / 0.9;
            a.x = 394 + 34 * Math.min(a.t, 1);
            a.y = 107;
            a.ang = 0;
            a.moving = true;
            a.phase += dt * 8;
            if (a.t >= 1) {
              ripples.push({ x: 396, y: 107, r: 4, life: 0.8, sp: 12 });
              a.path = [
                [443, 107],
                [443, 244],
                [a.lx, 244],
                [a.lx, a.ly],
              ];
              a.st = 'walkBack';
            }
            break;
          case 'walkBack':
            if (follow(a, dt, 30)) {
              a.st = 'lounge';
              a.t = rnd(5, 11);
            }
            break;
        }
      }
      if (step(floater, floater.tx, floater.ty, 9, dt)) {
        floater.tx = rnd(110, 380);
        floater.ty = rnd(100, 215);
      }
      floater.moving = false;
      lapper.phase += dt * 3.2;
      if (step(lapper, lapper.dir > 0 ? 380 : 110, 185, 26, dt)) lapper.dir *= -1;
      if (Math.random() < dt * 2.5) ripples.push({ x: lapper.x, y: lapper.y, r: 4, life: 0.7, sp: 10 });
      if (Math.random() < dt * 0.6) ripples.push({ x: 196, y: 90, r: 3, life: 0.6, sp: 8 });
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += r.sp * dt;
        r.life -= dt * 0.9;
        if (r.life <= 0) ripples.splice(i, 1);
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.life -= dt;
        if (d.life <= 0) drops.splice(i, 1);
      }
    }
    function updGrill(dt) {
      const a = asador;
      switch (a.st) {
        case 'grill':
          a.t -= dt;
          if (step(a, a.tx, 124, 18, dt)) {
            a.idle += dt;
            a.ang = lerpAng(a.ang, -Math.PI / 2, Math.min(1, dt * 8));
            if (a.idle > 1.6) {
              a.tx = rnd(588, 700);
              a.idle = 0;
            }
          }
          if (a.t <= 0) {
            a.st = 'carry';
            a.path = [
              [640, 190],
              [560, 302],
              [556, 441],
            ];
          }
          break;
        case 'carry':
          if (follow(a, dt, 30)) {
            a.st = 'deliver';
            a.t = 1.3;
            a.ang = 0;
          }
          break;
        case 'deliver':
          a.t -= dt;
          if (a.t <= 0) {
            platos = Math.min(3, platos + 1);
            floats.push({ x: 640, y: 404, text: '¡Llegó el asado!', life: 2, max: 2, size: 13 });
            a.st = 'back';
            a.path = [
              [560, 302],
              [640, 190],
              [a.tx, 124],
            ];
          }
          break;
        case 'back':
          if (follow(a, dt, 32)) {
            a.st = 'grill';
            a.t = rnd(12, 18);
          }
          break;
      }
      smokeT -= dt;
      if (smokeT <= 0) {
        smokeT = 0.07;
        smoke.push({
          x: 744 + rnd(-5, 5),
          y: 60,
          vx: rnd(6, 16),
          vy: rnd(-24, -14),
          r: rnd(3, 5),
          life: 3,
          max: 3,
        });
        if (Math.random() < 0.5)
          smoke.push({
            x: rnd(580, 712),
            y: rnd(72, 96),
            vx: rnd(2, 10),
            vy: rnd(-16, -8),
            r: rnd(2, 3.5),
            life: 1.6,
            max: 1.6,
          });
      }
      for (let i = smoke.length - 1; i >= 0; i--) {
        const s = smoke[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.r += dt * 6;
        s.life -= dt;
        if (s.life <= 0) smoke.splice(i, 1);
      }
    }
    function goal(team) {
      score[team]++;
      goalT = 1.8;
      floats.push({
        x: FB.cx,
        y: FB.y0 + 34,
        text: '¡GOL!',
        life: 1.8,
        max: 1.8,
        size: 26,
        color: TEAMC[team],
      });
    }
    function updField(dt) {
      if (goalT > 0) {
        goalT -= dt;
        if (goalT <= 0) {
          ball.x = FB.cx;
          ball.y = FB.cy;
          ball.vx = ball.vy = 0;
          players.forEach(p => {
            p.x = p.hx;
            p.y = p.hy;
          });
        }
      }
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      const f = Math.pow(0.42, dt);
      ball.vx *= f;
      ball.vy *= f;
      if (ball.y < FB.y0) {
        ball.y = FB.y0;
        ball.vy = Math.abs(ball.vy) * 0.7;
      }
      if (ball.y > FB.y1) {
        ball.y = FB.y1;
        ball.vy = -Math.abs(ball.vy) * 0.7;
      }
      if (goalT <= 0) {
        if (ball.x < FB.x0) {
          if (ball.y > FB.g0 && ball.y < FB.g1) goal(1);
          else {
            ball.x = FB.x0;
            ball.vx = Math.abs(ball.vx) * 0.7;
          }
        } else if (ball.x > FB.x1) {
          if (ball.y > FB.g0 && ball.y < FB.g1) goal(0);
          else {
            ball.x = FB.x1;
            ball.vx = -Math.abs(ball.vx) * 0.7;
          }
        }
      } else {
        ball.x = clamp(ball.x, 60, 460);
        ball.y = clamp(ball.y, FB.g0 + 3, FB.g1 - 3);
        ball.vx *= 0.9;
        ball.vy *= 0.9;
      }
      const chaser = [0, 1].map(tm => {
        let best = null,
          bd = 1e9;
        players.forEach(p => {
          if (p.team !== tm || p.keeper) return;
          const d = Math.hypot(p.x - ball.x, p.y - ball.y);
          if (d < bd) {
            bd = d;
            best = p;
          }
        });
        return best;
      });
      for (const p of players) {
        p.cd -= dt;
        const dir = p.team === 0 ? 1 : -1;
        let tx, ty, sp;
        if (p.keeper) {
          tx = Math.abs(ball.x - p.hx) < 40 ? p.hx + dir * 10 : p.hx;
          ty = clamp(ball.y, FB.g0 - 8, FB.g1 + 8);
          sp = 55;
        } else if (p === chaser[p.team]) {
          tx = ball.x - dir * 5;
          ty = ball.y;
          sp = 72;
        } else {
          tx = p.hx + (ball.x - FB.cx) * 0.45;
          ty = p.hy + (ball.y - FB.cy) * 0.35;
          sp = 44;
        }
        if (goalT > 0) sp *= 0.35;
        tx = clamp(tx, FB.x0 + 4, FB.x1 - 4);
        ty = clamp(ty, FB.y0 + 4, FB.y1 - 4);
        if (step(p, tx, ty, sp, dt)) p.ang = lerpAng(p.ang, Math.atan2(ball.y - p.y, ball.x - p.x), 0.1);
        if (Math.hypot(ball.x - p.x, ball.y - p.y) < 9 && p.cd <= 0 && goalT <= 0) {
          let gx, gy;
          if (p.keeper) {
            gx = FB.cx;
            gy = rnd(FB.y0 + 30, FB.y1 - 30);
          } else if (Math.random() < 0.4) {
            const m = players.filter(q => q.team === p.team && q !== p && !q.keeper);
            const q = m[Math.floor(Math.random() * m.length)];
            gx = q.x + dir * 22;
            gy = q.y;
          } else {
            gx = p.team === 0 ? FB.x1 + 8 : FB.x0 - 8;
            gy = rnd(FB.g0 + 5, FB.g1 - 5);
          }
          const a = Math.atan2(gy - ball.y, gx - ball.x) + rnd(-0.2, 0.2),
            v = p.keeper ? rnd(170, 220) : rnd(150, 240);
          ball.vx = Math.cos(a) * v;
          ball.vy = Math.sin(a) * v;
          p.cd = 0.7;
        }
      }
    }
    function updPark(dt) {
      vb.k += dt / vb.dur;
      const k = Math.min(vb.k, 1),
        lx = vb.fx + (vb.tx - vb.fx) * k,
        ly = vb.fy + (vb.ty - vb.fy) * k;
      step(vb.recv, vb.tx + (vb.recv.side ? 6 : -6), vb.ty, 46, dt);
      volley.forEach(p => {
        if (p !== vb.recv && p !== vb.hitter) step(p, p.hx, p.hy, 30, dt);
        if (!p.moving) p.ang = lerpAng(p.ang, Math.atan2(ly - p.y, lx - p.x), 0.15);
      });
      if (vb.k >= 1) {
        const h = vb.recv,
          side = 1 - h.side;
        const tx = side ? rnd(372, 440) : rnd(240, 308),
          ty = rnd(392, 512);
        const rec = volley
          .filter(p => p.side === side)
          .sort((a, b) => Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty))[0];
        Object.assign(vb, { fx: h.x, fy: h.y, tx, ty, k: 0, dur: rnd(1.1, 1.5), hitter: h, recv: rec });
      }
    }
    function updQuincho(dt) {
      if (mozo.pause > 0) {
        mozo.pause -= dt;
        mozo.moving = false;
      } else if (step(mozo, MOZO_P[mozo.i][0], MOZO_P[mozo.i][1], 24, dt)) {
        mozo.i = (mozo.i + 1) % 4;
        if (Math.random() < 0.6) mozo.pause = rnd(0.8, 2.2);
      }
      brindisCD -= dt;
      if (brindisCD <= 0) {
        brindisT = 2.6;
        brindisCD = rnd(14, 20);
        floats.push({ x: 720, y: 398, text: '¡Salud!', life: 2.4, max: 2.4, size: 18 });
      }
      if (brindisT > 0) brindisT -= dt;
      noteT -= dt;
      if (noteT <= 0) {
        noteT = 0.55;
        notes.push({
          x: 878,
          y: 350,
          vx: rnd(-14, -4),
          vy: rnd(-18, -10),
          life: 2.4,
          c: Math.random() < 0.5 ? '♪' : '♫',
        });
      }
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i];
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        n.life -= dt;
        if (n.life <= 0) notes.splice(i, 1);
      }
    }
    function updDog(dt) {
      if (dog.pause > 0) {
        dog.pause -= dt;
        return;
      }
      const dx = dog.tx - dog.x,
        dy = dog.ty - dog.y,
        d = Math.hypot(dx, dy);
      if (d < 2) {
        const p = DOG_PTS[Math.floor(Math.random() * DOG_PTS.length)];
        dog.tx = p[0] + rnd(-6, 6);
        dog.ty = p[1] + rnd(-6, 6);
        dog.pause = rnd(1, 3.5);
        return;
      }
      const m = Math.min(d, 48 * dt);
      dog.x += (dx / d) * m;
      dog.y += (dy / d) * m;
      dog.ang = lerpAng(dog.ang, Math.atan2(dy, dx), Math.min(1, dt * 8));
    }
    function update(dt) {
      updPool(dt);
      updGrill(dt);
      cfg.cancha ? updField(dt) : updPark(dt);
      updQuincho(dt);
      updDog(dt);
      for (let i = floats.length - 1; i >= 0; i--) {
        floats[i].life -= dt;
        if (floats[i].life <= 0) floats.splice(i, 1);
      }
    }

    function drawPool(t) {
      ctx.fillStyle = L.deck;
      rr(DECK.x, DECK.y, DECK.w, DECK.h, 16);
      ctx.fill();
      ctx.save();
      rr(DECK.x, DECK.y, DECK.w, DECK.h, 16);
      ctx.clip();
      ctx.strokeStyle = 'rgba(120,95,60,.13)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = DECK.x + 22; x < DECK.x + DECK.w; x += 22) {
        ctx.moveTo(x, DECK.y);
        ctx.lineTo(x, DECK.y + DECK.h);
      }
      for (let y = DECK.y + 22; y < DECK.y + DECK.h; y += 22) {
        ctx.moveTo(DECK.x, y);
        ctx.lineTo(DECK.x + DECK.w, y);
      }
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#FBF8F0';
      rr(WATER.x - 7, WATER.y - 7, WATER.w + 14, WATER.h + 14, 30);
      ctx.fill();
      const g = ctx.createLinearGradient(WATER.x, 0, WATER.x + WATER.w, 0);
      g.addColorStop(0, L.w1);
      g.addColorStop(1, L.w2);
      ctx.save();
      rr(WATER.x, WATER.y, WATER.w, WATER.h, 24);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = 'rgba(10,60,90,.16)';
      ctx.fillRect(WATER.x + 34, WATER.y + WATER.h / 2 - 2, WATER.w - 68, 4);
      ctx.strokeStyle = 'rgba(255,255,255,.24)';
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        const y0 = WATER.y + 6 + i * 16;
        for (let x = WATER.x; x <= WATER.x + WATER.w; x += 8) {
          const y = y0 + Math.sin(x * 0.05 + t * 1.6 + i) * 3 + Math.sin(x * 0.12 - t * 1.1 + i * 2) * 2;
          x === WATER.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      if (cfg.clima) {
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        for (let i = 0; i < 6; i++) {
          const x = WATER.x + 40 + i * 50 + Math.sin(t * 0.6 + i) * 10,
            y = WATER.y + 30 + ((t * 8 + i * 40) % 110);
          ell(x, y, 14, 5, 0);
        }
      }
      for (const r of ripples) {
        ctx.strokeStyle = `rgba(255,255,255,${(r.life * 0.7).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.r, r.r * 0.8, 0, 0, TAU);
        ctx.stroke();
      }
      for (const a of poolers) if (a.st === 'swim' || a.st === 'toLadder') drawSwim(a, t);
      drawFloat(floater, t);
      drawSwim(lapper, t);
      ctx.restore();
      for (const d of drops) circ(d.x, d.y, 1.3, `rgba(255,255,255,${Math.min(1, d.life * 2).toFixed(3)})`);
      ctx.strokeStyle = '#A9B4B8';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(396, 97);
      ctx.lineTo(416, 97);
      ctx.moveTo(396, 117);
      ctx.lineTo(416, 117);
      ctx.stroke();
      LOUNGERS.forEach((x, i) => {
        ctx.fillStyle = 'rgba(0,0,0,.12)';
        rr(x - 10, 254, 22, 36, 4);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        rr(x - 11, 252, 22, 36, 4);
        ctx.fill();
        ctx.fillStyle = ['#3FA7D6', '#F29E4C', '#E15554', '#59CD90', '#FAC05E'][i];
        ctx.globalAlpha = 0.85;
        rr(x - 8, 258, 16, 27, 3);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      ctx.fillStyle = '#F2F2F2';
      rr(160, 46, 30, 16, 3);
      ctx.fill();
      ctx.fillStyle = '#3FA7D6';
      rr(163, 49, 24, 10, 2);
      ctx.fill();
      drawPerson(edgeSit);
      for (const a of poolers) {
        if (a.st === 'lounge') drawLying(a.lx, a.ly, a);
        else if (a.st !== 'swim' && a.st !== 'toLadder') drawPerson(a);
      }
      umbrella(78, 262, '#E4572E');
      umbrella(372, 266, '#2E86AB');
      plant(56, 56);
      plant(464, 56);
    }
    function drawGrill(t) {
      ctx.fillStyle = L.patio;
      rr(528, 48, 384, 234, 14);
      ctx.fill();
      ctx.save();
      rr(528, 48, 384, 234, 14);
      ctx.clip();
      ctx.strokeStyle = 'rgba(90,60,30,.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 48, r = 0; y < 282; y += 12, r++) {
        ctx.moveTo(528, y);
        ctx.lineTo(912, y);
        for (let x = 528 + (r % 2) * 12; x < 912; x += 24) {
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 12);
        }
      }
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,.15)';
      rr(559, 60, 208, 56, 5);
      ctx.fill();
      ctx.fillStyle = '#A0492C';
      rr(556, 56, 208, 56, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,225,200,.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 65; y < 112; y += 9) {
        ctx.moveTo(556, y);
        ctx.lineTo(764, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#24191A';
      rr(570, 66, 150, 38, 3);
      ctx.fill();
      for (const c of coals) {
        const f = 0.55 + 0.45 * Math.sin(t * 5 + c.p);
        ctx.fillStyle = `rgba(255,${Math.round(90 + 70 * f)},${Math.round(20 * f)},${(0.55 + 0.4 * f).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = '#6E6E6E';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 574; x <= 716; x += 7) {
        ctx.moveTo(x, 67);
        ctx.lineTo(x, 103);
      }
      ctx.stroke();
      [
        [586, 75],
        [601, 75],
        [616, 75],
        [631, 75],
        [586, 94],
        [601, 94],
        [616, 94],
      ].forEach(([x, y]) => {
        ell(x, y, 6, 2.7, 0, '#8E2A1B');
        ell(x - 1.5, y - 1, 3, 0.8, 0, 'rgba(255,190,160,.45)');
      });
      [
        [648, 71],
        [648, 88],
      ].forEach(([x, y]) => {
        ctx.fillStyle = '#A44A2C';
        rr(x, y, 62, 11, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245,215,180,.85)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let k = x + 8; k < x + 60; k += 12) {
          ctx.moveTo(k, y + 1);
          ctx.lineTo(k, y + 10);
        }
        ctx.stroke();
      });
      ctx.fillStyle = '#7E3A23';
      rr(726, 50, 34, 64, 4);
      ctx.fill();
      ctx.fillStyle = '#1B1414';
      rr(734, 56, 18, 14, 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.14)';
      rr(773, 153, 110, 28, 4);
      ctx.fill();
      ctx.fillStyle = '#8B5E3C';
      rr(770, 150, 110, 28, 4);
      ctx.fill();
      circ(790, 164, 8, '#D9A35B');
      circ(790, 164, 5, '#C08440');
      circ(812, 164, 6, '#F2F2F2');
      circ(812, 164, 4.2, '#2F7D32');
      circ(835, 160, 3, '#5B2C1A');
      circ(845, 167, 3, '#2E7D32');
      ctx.fillStyle = '#C8955A';
      rr(855, 156, 20, 14, 2);
      ctx.fill();
      ctx.fillStyle = '#2F7DD1';
      rr(866, 212, 30, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      rr(866, 212, 30, 6, 3);
      ctx.fill();
      const bob = Math.sin(t * 2) * 0.08;
      charla[0].ang = bob;
      charla[1].ang = Math.PI - bob;
      charla[2].ang = -Math.PI / 2 + Math.sin(t * 1.3) * 0.4;
      charla.forEach((p, i) => drawPerson(p, { hold: 'cup', armUp: Math.sin(t * 1.7 + i * 2) > 0.85 }));
    }
    function drawField() {
      ctx.fillStyle = '#4F9B44';
      rr(40, 320, 440, 260, 14);
      ctx.fill();
      for (let i = 0; i < 10; i++)
        if (i % 2) {
          ctx.fillStyle = 'rgba(255,255,255,.06)';
          ctx.fillRect(70 + i * 38, 345, 38, 210);
        }
      ctx.strokeStyle = 'rgba(255,255,255,.88)';
      ctx.lineWidth = 2;
      ctx.strokeRect(70, 345, 380, 210);
      ctx.beginPath();
      ctx.moveTo(260, 345);
      ctx.lineTo(260, 555);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(260, 450, 32, 0, TAU);
      ctx.stroke();
      circ(260, 450, 2.5, 'rgba(255,255,255,.9)');
      ctx.strokeRect(70, 402, 44, 96);
      ctx.strokeRect(406, 402, 44, 96);
      [
        [58, 70],
        [450, 462],
      ].forEach(([a, b]) => {
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        ctx.fillRect(a, 418, b - a, 64);
        ctx.strokeStyle = 'rgba(255,255,255,.45)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (let y = 422; y < 482; y += 6) {
          ctx.moveTo(a, y);
          ctx.lineTo(b, y);
        }
        for (let x = a + 3; x < b; x += 4) {
          ctx.moveTo(x, 418);
          ctx.lineTo(x, 482);
        }
        ctx.stroke();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const px = a === 58 ? 70 : 450;
        ctx.moveTo(px, 418);
        ctx.lineTo(px, 482);
        ctx.stroke();
      });
      [
        [50, 330],
        [470, 330],
        [50, 570],
        [470, 570],
      ].forEach(([x, y]) => {
        circ(x, y, 5, '#3A3F44');
        circ(x, y, 2.6, '#F5F2D0');
      });
      ctx.font = '700 11px Figtree,system-ui,sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(12,24,18,.55)';
      rr(366, 325, 96, 16, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(`${score[0]}  –  ${score[1]}`, 438, 333.5);
      circ(378, 333, 4, TEAMC[0]);
      circ(452, 333, 4, TEAMC[1]);
      for (const p of players) drawPerson(p, { cap: p.keeper ? '#1d1d1d' : null });
      ell(ball.x + 1.5, ball.y + 2, 3.6, 2.6, 0, 'rgba(0,0,0,.25)');
      circ(ball.x, ball.y, 3.3, '#FFFFFF');
      circ(ball.x + 0.6, ball.y - 0.4, 1.2, '#222');
    }
    function drawPark(t) {
      ctx.fillStyle = '#5CA64A';
      rr(40, 320, 440, 260, 14);
      ctx.fill();
      [
        [60, 560],
        [64, 340],
        [470, 566],
      ].forEach(([x, y], i) => {
        for (let k = 0; k < 6; k++)
          circ(
            x + (k % 3) * 9,
            y + Math.floor(k / 3) * 8 - 4,
            3.2,
            ['#F7D046', '#F28AB2', '#FFFFFF'][(k + i) % 3],
          );
      });
      [
        [120, 400, '#E15554'],
        [150, 505, '#3FA7D6'],
      ].forEach(([x, y, c]) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(0.15);
        ctx.fillStyle = 'rgba(0,0,0,.12)';
        rr(-30, -21, 62, 44, 4);
        ctx.fill();
        ctx.fillStyle = c;
        rr(-32, -23, 62, 44, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.55)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let k = -24; k < 30; k += 12) {
          ctx.moveTo(k, -23);
          ctx.lineTo(k, 21);
        }
        ctx.stroke();
        ctx.restore();
        circ(x + 4, y + 2, 4, '#C9C9C9');
      });
      ronda.forEach((p, i) => {
        p.ang = Math.atan2(p.cy - p.y, p.cx - p.x) + Math.sin(t * 0.8 + p.k) * 0.3;
        drawPerson(p, {
          hold: i % 3 === 0 ? 'mate' : null,
          armUp: Math.sin(t * 0.9 + p.k * 2) > 0.92,
          mate: true,
        });
      });
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.fillRect(232, 384, 216, 140);
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(232, 384, 216, 140);
      ctx.strokeStyle = '#F5F5F5';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(340, 378);
      ctx.lineTo(340, 530);
      ctx.stroke();
      ctx.setLineDash([]);
      circ(340, 378, 3, '#555');
      circ(340, 530, 3, '#555');
      volley.forEach(p => drawPerson(p, { armUp: p === vb.hitter && vb.k < 0.15 }));
      const k = Math.min(vb.k, 1),
        x = vb.fx + (vb.tx - vb.fx) * k,
        y = vb.fy + (vb.ty - vb.fy) * k,
        hgt = Math.sin(Math.PI * k) * 40 + 6;
      ell(x + 2, y + 3, 3.8 - hgt / 40, 2.6 - hgt / 60, 0, 'rgba(0,0,0,.22)');
      circ(x, y - hgt, 4.2, '#FFF7D6');
      ctx.strokeStyle = '#2E86AB';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y - hgt, 4.2, 0.3, 2);
      ctx.stroke();
    }
    function drawQuincho(t) {
      ctx.fillStyle = 'rgba(0,0,0,.12)';
      rr(539, 339, 368, 228, 10);
      ctx.fill();
      ctx.fillStyle = L.floor;
      rr(536, 336, 368, 228, 10);
      ctx.fill();
      ctx.save();
      rr(536, 336, 368, 228, 10);
      ctx.clip();
      ctx.strokeStyle = 'rgba(60,35,20,.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 536; x < 904; x += 24) {
        ctx.moveTo(x, 336);
        ctx.lineTo(x, 564);
      }
      for (let y = 336; y < 564; y += 24) {
        ctx.moveTo(536, y);
        ctx.lineTo(904, y);
      }
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(60,30,15,.4)';
      ctx.lineWidth = 3;
      rr(536, 336, 368, 228, 10);
      ctx.stroke();
      ctx.fillStyle = '#5C3B28';
      rr(556, 346, 170, 22, 4);
      ctx.fill();
      [
        '#2E7D32',
        '#7B1F1F',
        '#E0B23A',
        '#DADADA',
        '#2E7D32',
        '#7B1F1F',
        '#E0B23A',
        '#1B4F72',
        '#DADADA',
        '#7B1F1F',
        '#2E7D32',
        '#E0B23A',
        '#DADADA',
      ].forEach((c, i) => circ(566 + i * 12.5, 357, 3.2, c));
      ctx.fillStyle = '#202020';
      rr(864, 346, 22, 28, 3);
      ctx.fill();
      rr(888, 346, 12, 28, 3);
      ctx.fill();
      const pulse = 1 + Math.sin(t * 12) * 0.12;
      circ(875, 354, 5 * pulse, '#4A4A4A');
      circ(875, 354, 2, '#111');
      circ(875, 367, 3, '#4A4A4A');
      SEATS.forEach(s => {
        ctx.fillStyle = '#3E2A1E';
        rr(s.x - 7.5, s.y - 7.5, 15, 15, 3);
        ctx.fill();
      });
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      rr(TABLE.x + 3, TABLE.y + 4, TABLE.w, TABLE.h, 6);
      ctx.fill();
      ctx.fillStyle = '#7A4E31';
      rr(TABLE.x, TABLE.y, TABLE.w, TABLE.h, 6);
      ctx.fill();
      ctx.fillStyle = '#F3E9DA';
      rr(TABLE.x + 6, TABLE.y + 18, TABLE.w - 12, 14, 3);
      ctx.fill();
      SEATS.forEach((s, i) => {
        if (EMPTY.has(i)) return;
        let px = s.x,
          py = s.y;
        if (s.y < 420) py = 427;
        else if (s.y > 470) py = 459;
        else px = s.x < 700 ? 606 : 834;
        circ(px, py, 5.6, '#FFFFFF');
        circ(px, py, 3.6, '#EFEFEF');
        circ(px + (s.y > 470 ? -6 : 6), py + (s.y < 420 ? -1 : 1), 2.2, 'rgba(170,215,240,.95)');
      });
      [
        [650, 443],
        [720, 443],
        [790, 443],
      ]
        .slice(0, platos)
        .forEach(([x, y]) => {
          ctx.fillStyle = '#B98552';
          rr(x - 14, y - 7, 28, 14, 3);
          ctx.fill();
          ell(x - 5, y, 5, 2.4, 0, '#8E2A1B');
          ell(x + 6, y - 1, 5, 2.4, 0.3, '#A44A2C');
        });
      circ(685, 443, 3, '#5B2C1A');
      circ(755, 443, 3, '#2E7D32');
      circ(825, 440, 5, '#3E8E41');
      circ(825, 440, 3, '#7CC46A');
      seated.forEach(p => {
        if (!p) return;
        p.ang = p.base + Math.sin(t * 0.9 + p.k) * 0.35;
        drawPerson(p, { armUp: brindisT > 0 || Math.sin(t * 0.7 + p.k * 3) > 0.97 });
      });
      drawPerson(mozo, { hold: 'tray' });
      WIRES.forEach(w => {
        ctx.strokeStyle = 'rgba(40,25,15,.55)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        w.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      });
      BULBS.forEach(([x, y], i) =>
        circ(x, y, 2, i % 3 === 0 ? '#FFE29A' : i % 3 === 1 ? '#FFF3C4' : '#FFD0A0'),
      );
      POLES.forEach(([x, y]) => {
        ctx.fillStyle = '#5A3E2C';
        rr(x - 5, y - 5, 10, 10, 2);
        ctx.fill();
      });
      ctx.font = '14px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      notes.forEach(n => {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, n.life).toFixed(3)})`;
        ctx.fillText(n.c, n.x, n.y);
      });
    }
    function drawSign() {
      const txt = cfg.nombre || 'Quinta';
      ctx.font = '800 13px "Bricolage Grotesque",Figtree,system-ui,sans-serif';
      const w = Math.min(300, ctx.measureText(txt).width + 26);
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      rr(500 - w / 2 + 3, 292, w, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#6B4226';
      rr(500 - w / 2, 289, w, 26, 6);
      ctx.fill();
      ctx.strokeStyle = '#4A2C17';
      ctx.lineWidth = 2;
      rr(500 - w / 2 + 3, 292, w - 6, 20, 4);
      ctx.stroke();
      ctx.fillStyle = '#FFF4DC';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, 500, 302.5, w - 14);
    }
    function drawFloats() {
      floats.forEach(f => {
        const a = Math.min(1, (f.life / f.max) * 2),
          k = 1 - f.life / f.max;
        ctx.font = `800 ${f.size}px "Bricolage Grotesque",Figtree,system-ui,sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = `rgba(15,25,20,${(a * 0.75).toFixed(3)})`;
        const y = f.y - k * 16;
        ctx.strokeText(f.text, f.x, y);
        ctx.fillStyle = f.color || '#FFFFFF';
        ctx.globalAlpha = a;
        ctx.fillText(f.text, f.x, y);
        ctx.globalAlpha = 1;
      });
    }
    function drawNight(t, n) {
      if (n < 0.01) return;
      ctx.fillStyle = `rgba(8,14,42,${(0.66 * n).toFixed(3)})`;
      ctx.fillRect(-50, -50, W + 100, H + 100);
      ctx.globalCompositeOperation = 'lighter';
      glow(245, 158, 200, '60,210,255', 0.42 * n);
      glow(130, 160, 70, '120,240,255', 0.3 * n);
      glow(360, 160, 70, '120,240,255', 0.3 * n);
      glow(645, 86, 95, '255,120,40', 0.5 * n * (0.8 + 0.2 * Math.sin(t * 9)));
      glow(720, 445, 170, '255,190,110', 0.3 * n);
      BULBS.forEach(([x, y]) => glow(x, y, 15, '255,210,140', 0.5 * n));
      if (cfg.cancha)
        [
          [90, 365],
          [430, 365],
          [90, 535],
          [430, 535],
        ].forEach(([x, y]) => glow(x, y, 170, '220,235,255', 0.18 * n));
      else {
        glow(135, 450, 120, '255,200,120', 0.18 * n);
        glow(340, 450, 140, '220,235,255', 0.14 * n);
      }
      glow(500, 302, 60, '255,200,130', 0.25 * n);
      ctx.globalCompositeOperation = 'source-over';
      BULBS.forEach(([x, y]) => circ(x, y, 2.1, `rgba(255,245,210,${n.toFixed(3)})`));
    }
    function draw(t, night) {
      for (const tf of tufts) ell(tf.x, tf.y, tf.r, tf.r * 0.6, tf.a, tf.c);
      ctx.fillStyle = '#D6C49B';
      ctx.fillRect(488, 0, 24, H);
      ctx.fillRect(0, 294, W, 22);
      ctx.fillStyle = 'rgba(120,95,55,.18)';
      ctx.fillRect(488, 0, 2, H);
      ctx.fillRect(510, 0, 2, H);
      ctx.fillRect(0, 294, W, 2);
      ctx.fillRect(0, 314, W, 2);
      drawPool(t);
      drawGrill(t);
      cfg.cancha ? drawField() : drawPark(t);
      drawQuincho(t);
      drawPerson(asador, {
        hat: true,
        hold: asador.st === 'carry' || asador.st === 'deliver' ? 'tray' : null,
        armUp: asador.st === 'grill' && !asador.moving && Math.sin(t * 3) > 0.6,
      });
      drawDog(dog, t);
      smoke.forEach(sm =>
        circ(sm.x, sm.y, sm.r, `rgba(236,236,236,${((sm.life / sm.max) * 0.42).toFixed(3)})`),
      );
      TREES.forEach(([x, y, r]) => tree(x, y, r, t));
      drawSign();
      drawFloats();
      drawNight(t, night);
    }
    const labels = [
      [`Pileta ${cfg.pileta || ''}${cfg.clima ? ' climatizada' : ''}`, DECK.x + 10, DECK.y + 10],
      ['Parrilla', 538, 58],
      [cfg.cancha ? 'Cancha de fútbol 5' : 'Parque con mates y vóley', 50, 330],
      [`Quincho ${cfg.quincho || ''}`, 546, 346],
    ];
    return { update, draw, labels, cancha: cfg.cancha };
  }

  /* --- visor (cámara, noche, recorrido) --- */
  const VIEWS = {
    todo: { x: 480, y: 300, z: 1 },
    pileta: { x: 260, y: 165, z: 1.95 },
    parrilla: { x: 720, y: 165, z: 1.95 },
    cancha: { x: 260, y: 450, z: 1.95 },
    quincho: { x: 720, y: 450, z: 1.95 },
  };
  const viewers = new Set();
  function sizeViewer(v) {
    const r = v.canvas.getBoundingClientRect();
    v.dpr = Math.min(window.devicePixelRatio || 1, 2);
    v.cw = Math.max(1, r.width);
    v.ch = Math.max(1, r.height);
    v.canvas.width = Math.round(v.cw * v.dpr);
    v.canvas.height = Math.round(v.ch * v.dpr);
  }
  function makeViewer(canvas, scene, opts) {
    const v = {
      canvas,
      c2: canvas.getContext('2d'),
      scene,
      cam: { ...VIEWS.todo },
      camT: VIEWS.todo,
      camName: 'todo',
      night: 0,
      nightT: 0,
      tour: false,
      tourT: 0,
      tourI: 0,
      cw: 1,
      ch: 1,
      dpr: 1,
      vis: true,
      clock: 0,
      labels: opts.labels !== false,
      onCam: opts.onCam,
    };
    v.ro = new ResizeObserver(() => sizeViewer(v));
    v.ro.observe(canvas);
    sizeViewer(v);
    v.io = new IntersectionObserver(
      es => {
        v.vis = es[0].isIntersecting;
      },
      { threshold: 0 },
    );
    v.io.observe(canvas);
    v.setScene = s => {
      v.scene = s;
      warm(s, 180);
    };
    warm(scene, 240);
    viewers.add(v);
    return v;
  }
  function warm(s, n) {
    for (let i = 0; i < n; i++) s.update(1 / 30);
  }
  const TOUR = ['todo', 'pileta', 'parrilla', 'cancha', 'quincho'];
  function stepViewer(v, dt) {
    v.clock += dt;
    v.scene.update(dt);
    if (v.tour) {
      v.tourT += dt;
      if (v.tourT > 4.6) {
        v.tourT = 0;
        v.tourI = (v.tourI + 1) % TOUR.length;
        setCam(v, TOUR[v.tourI]);
      }
    }
    const k = reduce ? 1 : 1 - Math.pow(0.025, dt);
    v.cam.x += (v.camT.x - v.cam.x) * k;
    v.cam.y += (v.camT.y - v.cam.y) * k;
    v.cam.z += (v.camT.z - v.cam.z) * k;
    v.night += (v.nightT - v.night) * (reduce ? 1 : 1 - Math.pow(0.15, dt));
  }
  function renderViewer(v) {
    ctx = v.c2;
    const s = (v.cw / W) * v.cam.z,
      d = v.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#6DAA4C';
    ctx.fillRect(0, 0, v.canvas.width, v.canvas.height);
    ctx.setTransform(d * s, 0, 0, d * s, d * (v.cw / 2 - v.cam.x * s), d * (v.ch / 2 - v.cam.y * s));
    v.scene.draw(v.clock, v.night);
    if (!v.labels) return;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const fs = v.cw < 500 ? 10 : 11.5;
    ctx.font = `700 ${fs}px Figtree,system-ui,sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    v.scene.labels.forEach(([txt, wx, wy]) => {
      const sx = (wx - v.cam.x) * s + v.cw / 2,
        sy = (wy - v.cam.y) * s + v.ch / 2;
      if (sx < -20 || sy < -10 || sx > v.cw || sy > v.ch) return;
      const w = ctx.measureText(txt).width + 14,
        h = fs + 9,
        x = clamp(sx, 6, v.cw - w - 6),
        y = clamp(sy, 40, v.ch - h - 6);
      ctx.fillStyle = 'rgba(12,24,18,.7)';
      rr(x, y, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(txt, x + 7, y + h / 2 + 0.5);
    });
  }
  function setCam(v, n) {
    v.camName = n;
    v.camT = VIEWS[n];
    if (reduce) v.cam = { ...v.camT };
    if (v.onCam) v.onCam(n);
  }

  /* miniaturas estáticas del portal */
  const thumbCache = new Map();
  function drawThumb(c, q) {
    if (!q) return;
    const r = c.getBoundingClientRect(),
      dp = Math.min(window.devicePixelRatio || 1, 2),
      w = Math.max(1, r.width),
      h = Math.max(1, r.height);
    c.width = Math.round(w * dp);
    c.height = Math.round(h * dp);
    let sc = thumbCache.get(q.id);
    if (!sc) {
      sc = createScene(q);
      warm(sc, 150);
      thumbCache.set(q.id, sc);
    }
    ctx = c.getContext('2d');
    const s = w / W;
    ctx.setTransform(dp * s, 0, 0, dp * s, 0, 0);
    ctx.fillStyle = '#6DAA4C';
    ctx.fillRect(0, 0, W, H);
    sc.draw(5, 0);
  }
  let thumbRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(thumbRaf);
    thumbRaf = requestAnimationFrame(() => {
      if (!$('#v-portal').hidden) $$('[data-thumb]').forEach(c => drawThumb(c, byId(c.dataset.thumb)));
    });
  });

  /* visor principal de la quinta */
  const LIVE = {
    todo: 'Un sábado en la quinta',
    pileta: 'La pileta',
    parrilla: 'La parrilla',
    cancha: 'El partido de la tarde',
    quincho: 'El quincho',
  };
  let hero = null;
  function liveText() {
    if (!hero) return;
    const q = Q();
    const base = hero.camName === 'cancha' && !q.cancha ? 'El parque' : LIVE[hero.camName];
    $('#live-txt').textContent = (hero.nightT ? 'De noche · ' : '') + base;
  }
  function mountHero(q) {
    const sc = createScene(q);
    if (!hero)
      hero = makeViewer($('#scene'), sc, {
        onCam: n => {
          $$('[data-cam]').forEach(b => b.setAttribute('aria-pressed', b.dataset.cam === n));
          liveText();
        },
      });
    else if (hero.qid !== q.id) hero.setScene(sc);
    hero.qid = q.id;
    liveText();
  }
  $$('[data-cam]').forEach(b =>
    b.addEventListener('click', () => {
      setTour(false);
      setCam(hero, b.dataset.cam);
    }),
  );
  function setTour(on) {
    if (!hero) return;
    hero.tour = on;
    hero.tourT = 0;
    hero.tourI = Math.max(0, TOUR.indexOf(hero.camName));
    const b = $('#btn-tour');
    b.setAttribute('aria-pressed', on);
    b.textContent = on ? '❚❚ Pausar recorrido' : '▶ Recorrido';
  }
  $('#btn-tour').onclick = () => setTour(!hero.tour);
  $('#btn-night').onclick = e => {
    hero.nightT = hero.nightT ? 0 : 1;
    e.currentTarget.setAttribute('aria-pressed', !!hero.nightT);
    e.currentTarget.textContent = hero.nightT ? '☀ De día' : '☾ De noche';
    if (reduce) hero.night = hero.nightT;
    liveText();
  };

  let last = performance.now();
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    if (!document.hidden)
      viewers.forEach(v => {
        if (v.vis && v.canvas.offsetParent !== null) {
          stepViewer(v, dt);
          renderViewer(v);
        }
      });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ======================= FOTOS ======================= */
  const PW = 960,
    PH = 640,
    MAX_FOTOS = 20;
  const fotoKey = id => 'novantiq-fotos-' + id;
  function loadFotos(id) {
    try {
      const a = JSON.parse(localStorage.getItem(fotoKey(id)) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (_) {
      return [];
    }
  }
  function saveFotos(id, arr) {
    try {
      localStorage.setItem(fotoKey(id), JSON.stringify(arr));
      return true;
    } catch (_) {
      toast('No entra más en este navegador. Probá con menos fotos.');
      return false;
    }
  }
  function clearFotos(id) {
    try {
      localStorage.removeItem(fotoKey(id));
    } catch (_) {}
  }

  /* imágenes ilustrativas, pintadas con los datos de cada quinta */
  const illCache = new Map();
  function illustrations(q) {
    const key = q.id + '|' + q.look.floor + '|' + q.cancha + '|' + q.clima + '|' + q.look.w1;
    if (illCache.has(key)) return illCache.get(key);
    const kinds = ['pileta', 'quincho', 'parrilla', q.cancha ? 'cancha' : 'parque', 'noche'];
    const caps = {
      pileta: `Pileta de ${q.pileta}${q.clima ? ' climatizada' : ''}`,
      quincho: `Quincho de ${q.quincho} para ${q.cap} personas`,
      parrilla: 'La parrilla, lista para el asado',
      cancha: 'Cancha de fútbol 5',
      parque: 'Parque con sombra y red de vóley',
      noche: 'La pileta de noche, con luces',
    };
    const out = kinds.map(k => ({ src: paintPhoto(k, q), cap: caps[k], ill: true }));
    illCache.set(key, out);
    return out;
  }
  const fotosDe = q => {
    const r = loadFotos(q.id);
    if (r.length) return r;
    if (q.fotos && q.fotos.length) return q.fotos.map(f => ({ src: f.src, cap: f.cap || '' }));
    return illustrations(q);
  };
  const tieneFotos = q => loadFotos(q.id).length > 0 || !!(q.fotos && q.fotos.length);
  const portadaDe = q => {
    const r = loadFotos(q.id);
    return r[0] || (q.fotos && q.fotos[0]) || null;
  };
  function paintPhoto(kind, q) {
    const c = document.createElement('canvas');
    c.width = PW;
    c.height = PH;
    const g = c.getContext('2d');
    const R = mulberry((q.look.seed || 7) * 31 + kind.length * 7);
    const night = kind === 'noche';
    const lin = (x0, y0, x1, y1, stops) => {
      const gr = g.createLinearGradient(x0, y0, x1, y1);
      stops.forEach(([o, c]) => gr.addColorStop(o, c));
      return gr;
    };
    const poly = (pts, fill) => {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.fillStyle = fill;
      g.fill();
    };
    const blob = (x, y, r, c) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    };
    function sky(hz) {
      g.fillStyle = night
        ? lin(0, 0, 0, hz, [
            [0, '#0A1330'],
            [1, '#2B3B6B'],
          ])
        : lin(0, 0, 0, hz, [
            [0, '#5AAEE6'],
            [1, '#D3ECF8'],
          ]);
      g.fillRect(0, 0, PW, hz);
      if (night) {
        for (let i = 0; i < 90; i++)
          blob(
            R() * PW,
            R() * hz * 0.8,
            R() * 1.4 + 0.3,
            'rgba(255,255,255,' + (0.4 + R() * 0.6).toFixed(2) + ')',
          );
        blob(780, 90, 30, '#F4F1DE');
        blob(792, 82, 27, '#20305E');
      } else {
        blob(820, 80, 46, 'rgba(255,240,190,.9)');
        for (let i = 0; i < 4; i++) {
          const x = R() * PW,
            y = 40 + R() * hz * 0.4;
          g.fillStyle = 'rgba(255,255,255,.85)';
          [
            [0, 0, 40],
            [34, 6, 30],
            [-32, 8, 28],
            [10, -14, 26],
          ].forEach(([dx, dy, r]) => {
            g.beginPath();
            g.ellipse(x + dx, y + dy, r * 1.4, r * 0.8, 0, 0, Math.PI * 2);
            g.fill();
          });
        }
      }
    }
    function treeLine(y, col) {
      for (let x = -20; x < PW + 40; x += 26 + R() * 30) {
        const r = 28 + R() * 40;
        blob(x, y - r * 0.5, r, col);
      }
      g.fillStyle = col;
      g.fillRect(0, y - 10, PW, 14);
    }
    function grass(y) {
      g.fillStyle = night
        ? lin(0, y, 0, PH, [
            [0, '#1E3A26'],
            [1, '#13261A'],
          ])
        : lin(0, y, 0, PH, [
            [0, '#7DB858'],
            [1, '#4C8C39'],
          ]);
      g.fillRect(0, y, PW, PH - y);
    }
    function tree(x, y, s) {
      g.fillStyle = '#5B3A22';
      g.fillRect(x - 6 * s, y - 60 * s, 12 * s, 62 * s);
      [
        [0, -90, 46],
        [-34, -70, 34],
        [36, -68, 36],
        [0, -120, 32],
      ].forEach(([dx, dy, r], i) =>
        blob(
          x + dx * s,
          y + dy * s,
          r * s,
          night ? '#12301E' : ['#2F6B3A', '#3E8A47', '#367C40', '#4E9C4E'][i],
        ),
      );
    }
    function lights(y0, y1) {
      g.strokeStyle = 'rgba(30,20,10,.6)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-10, y0);
      g.quadraticCurveTo(PW / 2, y1, PW + 10, y0);
      g.stroke();
      for (let i = 1; i < 20; i++) {
        const t = i / 20,
          x = -10 + (PW + 20) * t,
          y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1 + t * t * y0;
        const gl = g.createRadialGradient(x, y + 6, 0, x, y + 6, night ? 26 : 16);
        gl.addColorStop(0, 'rgba(255,214,140,' + (night ? 0.75 : 0.5) + ')');
        gl.addColorStop(1, 'rgba(255,214,140,0)');
        g.fillStyle = gl;
        g.fillRect(x - 30, y - 24, 60, 60);
        blob(x, y + 6, 4.5, '#FFF1C9');
      }
    }
    function pool(lit) {
      poly(
        [
          [150, 340],
          [810, 340],
          [1010, PH],
          [-50, PH],
        ],
        night ? '#4A4A52' : '#E6DCC6',
      );
      const top = [
          [235, 370],
          [725, 370],
        ],
        bot = [
          [880, 610],
          [80, 610],
        ];
      poly(
        [
          [top[0][0] - 14, top[0][1] - 10],
          [top[1][0] + 14, top[1][1] - 10],
          [bot[0][0] + 22, bot[0][1] + 14],
          [bot[1][0] - 22, bot[1][1] + 14],
        ],
        night ? '#8E8E96' : '#FBF8F0',
      );
      poly(
        [...top, ...bot],
        lit
          ? lin(0, 370, 0, 610, [
              [0, '#38E1F2'],
              [1, '#0F7FA8'],
            ])
          : lin(0, 370, 0, 610, [
              [0, q.look.w1],
              [1, q.look.w2],
            ]),
      );
      g.save();
      g.beginPath();
      [...top, ...bot].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.clip();
      if (lit) {
        const gl = g.createRadialGradient(480, 520, 10, 480, 520, 330);
        gl.addColorStop(0, 'rgba(170,255,255,.7)');
        gl.addColorStop(1, 'rgba(170,255,255,0)');
        g.fillStyle = gl;
        g.fillRect(0, 360, PW, 280);
      }
      g.strokeStyle = 'rgba(255,255,255,' + (lit ? 0.35 : 0.45) + ')';
      g.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const y = 380 + i * i * 1.7 + i * 6;
        g.beginPath();
        for (let x = 0; x <= PW; x += 14) {
          const yy = y + Math.sin(x * 0.03 + i * 1.7) * (2 + i * 0.4);
          x ? g.lineTo(x, yy) : g.moveTo(x, yy);
        }
        g.stroke();
      }
      if (q.clima && !lit) {
        g.fillStyle = 'rgba(255,255,255,.22)';
        for (let i = 0; i < 7; i++) {
          g.beginPath();
          g.ellipse(160 + i * 110, 380 + R() * 40, 70, 12, 0, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.restore();
    }
    if (kind === 'pileta') {
      sky(290);
      treeLine(300, '#2F6B3A');
      g.fillStyle = '#F4EFE6';
      g.fillRect(610, 170, 300, 128);
      poly(
        [
          [590, 175],
          [930, 175],
          [880, 120],
          [640, 120],
        ],
        '#B5552F',
      );
      g.fillStyle = '#2D5B7A';
      [
        [640, 205],
        [720, 205],
        [800, 205],
      ].forEach(([x, y]) => g.fillRect(x, y, 46, 52));
      g.fillStyle = '#7A4E31';
      g.fillRect(860, 215, 34, 82);
      grass(300);
      pool(false);
      [
        [760, 346],
        [815, 346],
        [870, 346],
      ].forEach(([x, y], i) => {
        poly(
          [
            [x, y],
            [x + 46, y],
            [x + 56, y + 20],
            [x + 4, y + 20],
          ],
          '#FFFFFF',
        );
        poly(
          [
            [x + 6, y + 3],
            [x + 40, y + 3],
            [x + 48, y + 17],
            [x + 10, y + 17],
          ],
          ['#3FA7D6', '#F29E4C', '#E15554'][i],
        );
      });
      g.strokeStyle = '#FF5F87';
      g.lineWidth = 14;
      g.beginPath();
      g.ellipse(560, 470, 46, 20, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#555';
      g.fillRect(118, 300, 6, 340);
      for (let i = 0; i < 8; i++) {
        g.beginPath();
        g.moveTo(121, 250);
        g.arc(121, 300, 150, Math.PI + (i * Math.PI) / 8, Math.PI + ((i + 1) * Math.PI) / 8);
        g.closePath();
        g.fillStyle = i % 2 ? '#FFFFFF' : '#E4572E';
        g.fill();
      }
    } else if (kind === 'noche') {
      sky(290);
      treeLine(300, '#0E2416');
      g.fillStyle = '#2A2F3F';
      g.fillRect(610, 170, 300, 128);
      poly(
        [
          [590, 175],
          [930, 175],
          [880, 120],
          [640, 120],
        ],
        '#3A2620',
      );
      g.fillStyle = '#FFC86B';
      [
        [640, 205],
        [720, 205],
        [800, 205],
      ].forEach(([x, y]) => g.fillRect(x, y, 46, 52));
      grass(300);
      pool(true);
      lights(40, 150);
      [
        [560, 470],
        [380, 520],
      ].forEach(([x, y]) => {
        const gl = g.createRadialGradient(x, y, 0, x, y, 40);
        gl.addColorStop(0, 'rgba(255,255,255,.7)');
        gl.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gl;
        g.fillRect(x - 40, y - 40, 80, 80);
      });
    } else if (kind === 'quincho') {
      const vx = 480,
        vy = 300;
      g.fillStyle = '#E9DDC8';
      g.fillRect(0, 0, PW, 330);
      g.fillStyle = lin(0, 60, 0, 250, [
        [0, '#F6A35A'],
        [1, '#FBD9A4'],
      ]);
      [
        [120, 70],
        [400, 70],
        [680, 70],
      ].forEach(([x, y]) => {
        g.fillRect(x, y, 170, 190);
      });
      g.strokeStyle = '#7A4E31';
      g.lineWidth = 8;
      [
        [120, 70],
        [400, 70],
        [680, 70],
      ].forEach(([x, y]) => {
        g.strokeRect(x, y, 170, 190);
        g.beginPath();
        g.moveTo(x + 85, y);
        g.lineTo(x + 85, y + 190);
        g.stroke();
      });
      g.fillStyle = '#6B4226';
      for (let i = 0; i < 6; i++) {
        poly(
          [
            [i * 190 - 40, 0],
            [i * 190 + 10, 0],
            [vx + (i - 2.5) * 40 + 8, 40],
            [vx + (i - 2.5) * 40 - 8, 40],
          ],
          '#6B4226',
        );
      }
      g.fillRect(0, 0, PW, 14);
      g.fillStyle = q.look.floor;
      g.fillRect(0, 330, PW, PH - 330);
      g.strokeStyle = 'rgba(50,25,10,.22)';
      g.lineWidth = 1.5;
      for (let i = -12; i <= 12; i++) {
        g.beginPath();
        g.moveTo(vx + i * 20, 330);
        g.lineTo(vx + i * 120, PH);
        g.stroke();
      }
      for (let k = 0; k < 8; k++) {
        const y = 330 + Math.pow(k / 8, 1.7) * 310;
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(PW, y);
        g.stroke();
      }
      lights(30, 110);
      poly(
        [
          [360, 380],
          [600, 380],
          [800, 620],
          [160, 620],
        ],
        '#7A4E31',
      );
      poly(
        [
          [440, 380],
          [520, 380],
          [560, 620],
          [400, 620],
        ],
        '#F3E9DA',
      );
      for (let k = 0; k < 5; k++) {
        const t = k / 4.5,
          y = 392 + t * 200,
          half = 120 + t * 200;
        [[-1], [1]].forEach(([s]) => {
          const x = 480 + s * (half - 26 - t * 20);
          g.fillStyle = '#FFFFFF';
          g.beginPath();
          g.ellipse(x, y, 14 + t * 16, 6 + t * 7, 0, 0, Math.PI * 2);
          g.fill();
          blob(x + s * (18 + t * 14), y - 8, 3 + t * 3, 'rgba(190,225,245,.95)');
          g.fillStyle = '#3E2A1E';
          const cx = 480 + s * (half + 18 + t * 30);
          g.fillRect(cx - 10 - t * 10, y - 24 - t * 20, 20 + t * 20, 30 + t * 30);
        });
      }
      blob(480, 430, 10, '#5B2C1A');
      blob(470, 480, 12, '#2E7D32');
      blob(492, 520, 18, '#B98552');
    } else if (kind === 'parrilla') {
      sky(160);
      treeLine(170, '#2F6B3A');
      g.fillStyle = '#CDB898';
      g.fillRect(0, 170, PW, PH - 170);
      g.strokeStyle = 'rgba(90,60,30,.18)';
      g.lineWidth = 2;
      for (let y = 190; y < PH; y += 28) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(PW, y);
        g.stroke();
      }
      poly(
        [
          [300, 170],
          [660, 170],
          [600, 110],
          [360, 110],
        ],
        '#8E3F25',
      );
      g.fillStyle = '#7E3A23';
      g.fillRect(430, 20, 100, 100);
      for (let i = 0; i < 10; i++)
        blob(
          480 + R() * 60 - 20 + i * 6,
          10 - i * 4 + R() * 10,
          16 + i * 3,
          'rgba(235,235,235,' + (0.5 - i * 0.04).toFixed(2) + ')',
        );
      g.fillStyle = '#A0492C';
      g.fillRect(200, 170, 560, 380);
      g.strokeStyle = 'rgba(255,225,200,.3)';
      g.lineWidth = 2;
      for (let y = 184, r = 0; y < 550; y += 20, r++) {
        g.beginPath();
        g.moveTo(200, y);
        g.lineTo(760, y);
        g.stroke();
        for (let x = 200 + (r % 2) * 30; x < 760; x += 60) {
          g.beginPath();
          g.moveTo(x, y - 20);
          g.lineTo(x, y);
          g.stroke();
        }
      }
      g.fillStyle = '#1E1414';
      g.fillRect(270, 250, 420, 190);
      const fire = g.createRadialGradient(480, 430, 10, 480, 430, 240);
      fire.addColorStop(0, 'rgba(255,170,60,.95)');
      fire.addColorStop(0.5, 'rgba(230,90,20,.6)');
      fire.addColorStop(1, 'rgba(230,90,20,0)');
      g.fillStyle = fire;
      g.fillRect(270, 250, 420, 190);
      for (let i = 0; i < 40; i++)
        blob(285 + R() * 390, 395 + R() * 40, 4 + R() * 6, ['#FF8A1A', '#FFB238', '#C2410C'][i % 3]);
      g.strokeStyle = '#8A8A8A';
      g.lineWidth = 3;
      for (let y = 300; y <= 360; y += 10) {
        g.beginPath();
        g.moveTo(276, y);
        g.lineTo(684, y);
        g.stroke();
      }
      for (let i = 0; i < 6; i++) {
        g.fillStyle = '#8E2A1B';
        g.beginPath();
        g.ellipse(310 + i * 30, 318, 13, 7, 0, 0, Math.PI * 2);
        g.fill();
      }
      [
        [510, 305],
        [510, 335],
      ].forEach(([x, y]) => {
        g.fillStyle = '#A44A2C';
        g.fillRect(x, y, 160, 20);
        g.strokeStyle = '#F2D3B3';
        g.lineWidth = 3;
        for (let k = x + 16; k < x + 160; k += 26) {
          g.beginPath();
          g.moveTo(k, y + 2);
          g.lineTo(k, y + 18);
          g.stroke();
        }
      });
      g.fillStyle = '#8B5E3C';
      g.fillRect(40, 400, 160, 30);
      g.fillRect(760, 400, 170, 30);
      blob(100, 388, 22, '#D9A35B');
      g.fillStyle = '#2E7D32';
      g.fillRect(800, 360, 14, 40);
      g.fillStyle = '#5B2C1A';
      g.fillRect(830, 350, 14, 50);
    } else if (kind === 'cancha') {
      sky(250);
      treeLine(260, '#2F6B3A');
      grass(260);
      for (let i = -8; i < 8; i += 2)
        poly(
          [
            [480 + i * 40, 260],
            [480 + (i + 1) * 40, 260],
            [480 + (i + 1) * 240, PH],
            [480 + i * 240, PH],
          ],
          'rgba(255,255,255,.07)',
        );
      g.strokeStyle = 'rgba(255,255,255,.9)';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(220, 270);
      g.lineTo(740, 270);
      g.lineTo(1000, PH);
      g.moveTo(220, 270);
      g.lineTo(-40, PH);
      g.stroke();
      g.beginPath();
      g.ellipse(480, 470, 170, 46, 0, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(80, 470);
      g.lineTo(880, 470);
      g.stroke();
      g.strokeStyle = '#FFFFFF';
      g.lineWidth = 7;
      g.strokeRect(410, 226, 140, 46);
      g.strokeStyle = 'rgba(255,255,255,.4)';
      g.lineWidth = 1;
      for (let x = 416; x < 550; x += 8) {
        g.beginPath();
        g.moveTo(x, 228);
        g.lineTo(x, 270);
        g.stroke();
      }
      blob(560, 575, 22, '#FFFFFF');
      blob(566, 570, 8, '#222');
    } else {
      // parque
      sky(250);
      treeLine(260, '#2F6B3A');
      grass(260);
      tree(150, 560, 1.6);
      tree(830, 520, 1.4);
      tree(620, 330, 0.8);
      g.strokeStyle = '#6B4226';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(170, 430);
      g.quadraticCurveTo(480, 560, 790, 410);
      g.stroke();
      g.fillStyle = '#E15554';
      g.beginPath();
      g.moveTo(240, 450);
      g.quadraticCurveTo(480, 560, 720, 432);
      g.quadraticCurveTo(480, 610, 240, 470);
      g.closePath();
      g.fill();
      poly(
        [
          [300, 560],
          [520, 560],
          [560, 630],
          [260, 630],
        ],
        '#3FA7D6',
      );
      blob(420, 588, 12, '#8B5A2B');
      g.fillStyle = '#C9C9C9';
      g.fillRect(450, 572, 16, 30);
      g.strokeStyle = '#F5F5F5';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(560, 300);
      g.lineTo(560, 360);
      g.moveTo(760, 300);
      g.lineTo(760, 360);
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.8)';
      g.lineWidth = 1.5;
      for (let y = 300; y <= 322; y += 6) {
        g.beginPath();
        g.moveTo(560, y);
        g.lineTo(760, y);
        g.stroke();
      }
    }
    return c.toDataURL('image/jpeg', 0.84);
  }

  /* galería en la página de la quinta */
  let galFotos = [];
  function renderGallery(q) {
    galFotos = fotosDe(q);
    const ill = galFotos[0] && galFotos[0].ill;
    $('#q-gal').innerHTML =
      `<div class="gal-track" id="gal-track">${galFotos.map((f, i) => `<button type="button" class="gal-item" data-lb="${i}" aria-label="Ver foto ${i + 1} de ${galFotos.length}: ${esc(f.cap || '')}"><img src="${f.src}" alt="${esc(f.cap || 'Foto de la quinta')}"${i ? ' loading="lazy"' : ''}></button>`).join('')}</div>
  <button type="button" class="gal-all" data-lb="0">Ver las ${galFotos.length} fotos</button>
  ${(VIDEOS[q.id] || []).length ? '<button type="button" class="gal-vid" id="gal-vid">▶ Ver video</button>' : ''}
  <span class="gal-count" id="gal-count">1 / ${galFotos.length}</span>
  ${ill ? '<span class="gal-ill">Imágenes ilustrativas</span>' : ''}`;
    const tr = $('#gal-track');
    tr.addEventListener(
      'scroll',
      () => {
        const i = Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth));
        const c = $('#gal-count');
        if (c) c.textContent = `${Math.min(galFotos.length, i + 1)} / ${galFotos.length}`;
      },
      { passive: true },
    );
  }
  $('#q-gal').addEventListener('click', e => {
    if (e.target.closest('#gal-vid')) {
      $('#vid-title').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    const b = e.target.closest('[data-lb]');
    if (b) openLb(+b.dataset.lb);
  });
  const lb = $('#lb'),
    lbT = $('#lb-track');
  let lbFocus = null;
  function openLb(i) {
    lbT.innerHTML = galFotos
      .map(
        (f, k) =>
          `<figure class="lb-fig"><img src="${f.src}" alt="${esc(f.cap || 'Foto de la quinta')}"><figcaption>${esc(f.cap || '')}${f.ill ? ' · imagen ilustrativa' : ''}</figcaption></figure>`,
      )
      .join('');
    lbFocus = document.activeElement;
    lb.hidden = false;
    document.body.classList.add('lock');
    requestAnimationFrame(() => {
      lbT.scrollLeft = i * lbT.clientWidth;
      lbCount();
    });
    $('#lb-close').focus();
  }
  function closeLb() {
    lb.hidden = true;
    document.body.classList.remove('lock');
    if (lbFocus && document.contains(lbFocus)) lbFocus.focus();
  }
  function lbIdx() {
    return Math.round(lbT.scrollLeft / Math.max(1, lbT.clientWidth));
  }
  function lbCount() {
    $('#lb-count').textContent = `${lbIdx() + 1} / ${galFotos.length}`;
  }
  function lbGo(d) {
    const i = clamp(lbIdx() + d, 0, galFotos.length - 1);
    lbT.scrollTo({ left: i * lbT.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  }
  lbT.addEventListener('scroll', lbCount, { passive: true });
  $('#lb-close').onclick = closeLb;
  $('#lb-prev').onclick = () => lbGo(-1);
  $('#lb-next').onclick = () => lbGo(1);
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') lbGo(-1);
    if (e.key === 'ArrowRight') lbGo(1);
  });

  /* subir y comprimir fotos */
  async function compress(file) {
    let img;
    try {
      img = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (_) {
      img = await new Promise((res, rej) => {
        const u = URL.createObjectURL(file),
          im = new Image();
        im.onload = () => {
          URL.revokeObjectURL(u);
          res(im);
        };
        im.onerror = rej;
        im.src = u;
      });
    }
    const s = Math.min(1, 1100 / Math.max(img.width, img.height)),
      c = document.createElement('canvas');
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.7);
  }
  async function addFotos(id, files) {
    const cur = loadFotos(id);
    let added = 0,
      bad = 0;
    for (const f of files) {
      if (cur.length >= MAX_FOTOS) break;
      if (!/^image\//.test(f.type)) {
        bad++;
        continue;
      }
      try {
        cur.push({ src: await compress(f), cap: '' });
        added++;
      } catch (_) {
        bad++;
      }
    }
    if (added && !saveFotos(id, cur)) return 0;
    if (bad)
      toast(`${bad} archivo${bad > 1 ? 's no son imágenes' : ' no es una imagen'} que se pueda abrir.`);
    if (files.length > added + bad) toast(`Se pueden subir hasta ${MAX_FOTOS} fotos por quinta.`);
    return added;
  }

  /* gestor de fotos en el panel */
  function renderPhotos(q) {
    const real = loadFotos(q.id);
    $('#ph-note').textContent = real.length
      ? 'La primera es la portada: es la que se ve en el buscador.'
      : q.fotos && q.fotos.length
        ? 'Ahora se muestran las fotos que vienen cargadas con la quinta. Si subís fotos acá, las reemplazan.'
        : 'Ahora tu página muestra imágenes ilustrativas. Subí fotos reales: es lo que más reservas trae.';
    $('#ph-count').textContent = `${real.length} de ${MAX_FOTOS}`;
    $('#ph-grid').innerHTML = real
      .map(
        (f, i) =>
          `<div class="ph"><img src="${f.src}" alt="Foto ${i + 1}">${i === 0 ? '<span class="cover">Portada</span>' : ''}<div class="acts"><button type="button" data-mv="${i}" data-d="-1" aria-label="Mover antes"${i === 0 ? ' disabled' : ''}>‹</button><button type="button" data-rm="${i}" aria-label="Borrar foto ${i + 1}">✕</button><button type="button" data-mv="${i}" data-d="1" aria-label="Mover después"${i === real.length - 1 ? ' disabled' : ''}>›</button></div></div>`,
      )
      .join('');
  }
  $('#ph-grid').addEventListener('click', e => {
    const q = Q(),
      a = loadFotos(q.id),
      mv = e.target.closest('[data-mv]'),
      rm = e.target.closest('[data-rm]');
    if (mv) {
      const i = +mv.dataset.mv,
        j = i + +mv.dataset.d;
      if (j < 0 || j >= a.length) return;
      [a[i], a[j]] = [a[j], a[i]];
      saveFotos(q.id, a);
      renderPhotos(q);
    }
    if (rm) {
      if (rm.dataset.armed !== '1') {
        rm.dataset.armed = '1';
        rm.textContent = '?';
        rm.setAttribute('aria-label', 'Tocá de nuevo para borrar');
        setTimeout(() => {
          if (document.contains(rm)) {
            rm.dataset.armed = '';
            rm.textContent = '✕';
          }
        }, 3000);
        return;
      }
      a.splice(+rm.dataset.rm, 1);
      a.length ? saveFotos(q.id, a) : clearFotos(q.id);
      renderPhotos(q);
      toast('Borraste la foto.');
    }
  });
  $('#pn-fotos').addEventListener('change', async e => {
    const q = Q(),
      files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    toast('Subiendo fotos…');
    const n = await addFotos(q.id, files);
    renderPhotos(q);
    if (n) toast(`Listo: ${n} foto${n > 1 ? 's' : ''} agregada${n > 1 ? 's' : ''} a tu página.`);
  });
  $('#c-fotos').addEventListener('change', e => {
    const n = e.target.files.length;
    $('#c-fotos-n').textContent = n
      ? `${n} foto${n > 1 ? 's' : ''} elegida${n > 1 ? 's' : ''}`
      : 'Si no subís, se muestran imágenes ilustrativas.';
  });

  /* ======================= navegación ======================= */
  $$('[data-scroll]').forEach(a =>
    a.addEventListener('click', e => {
      e.preventDefault();
      $('#' + a.dataset.scroll).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }),
  );
  let lastH = null;
  /* Tocar "Buscar quinta" / "Cómo reservar" estando ya en esa dirección no dispara hashchange: lo resolvemos acá */
  [
    ['#nav-portal', ['', 'portal'], () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })],
    ['#nav-como', ['como'], () => $('#como').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })],
    ['.brand', ['', 'portal'], () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })],
  ].forEach(([sel, hs, fn]) =>
    $(sel).addEventListener('click', e => {
      if (hs.includes(location.hash.slice(1))) {
        e.preventDefault();
        fn();
      }
    }),
  );
  function route() {
    const h = location.hash.slice(1);
    let view = 'portal';
    if (h.startsWith('q-') && byId(h.slice(2))) {
      view = 'quinta';
      CUR = h.slice(2);
    } else if (h === 'panel') view = 'panel';
    else if (h === 'crear') view = 'crear';
    ['portal', 'quinta', 'panel', 'crear'].forEach(v => ($('#v-' + v).hidden = v !== view));
    const navOn = { 'nav-portal': (view === 'portal' && h !== 'como') || view === 'quinta', 'nav-como': h === 'como', 'nav-panel': view === 'panel' || view === 'crear' };
    Object.entries(navOn).forEach(([id, on]) =>
      on ? $('#' + id).setAttribute('aria-current', 'page') : $('#' + id).removeAttribute('aria-current'),
    );
    if (hero && view !== 'quinta') setTour(false);
    if (view !== 'quinta') {
      $('#buybar').hidden = true;
      document.body.classList.remove('has-bb');
    }
    if (view === 'panel' || view === 'crear') setAmbiente('');
    if (view === 'portal') {
      document.title = 'NOVANTIQ Quintas · Alquilá tu quinta por fecha';
      initSearch();
      renderPortal();
      if (h === 'como') setTimeout(() => $('#como').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }), 60);
      // Volver desde "Cómo reservar" (o desde el panel) al buscador: arriba de todo
      else if (lastH === 'como' || lastH === 'panel' || lastH === 'crear') window.scrollTo(0, 0);
    }
    lastH = h;
    if (view === 'quinta') {
      if (!selDate && !rng.a) mi = defaultMonth();
      renderQuinta();
      window.scrollTo(0, 0);
      // Si viene del buscador con una fecha libre, la barra de abajo ya ofrece "Reservar" esa fecha
      if (pendingOpen) {
        const ds = pendingOpen;
        pendingOpen = null;
        toast(`${fLarga(ds)} está libre. Tocá “Reservar” abajo cuando quieras.`);
      }
      if (pendingStay && rng.a && rng.b) {
        pendingStay = false;
        toast(`${rangoTxt(rng.a, rng.b)} está libre. Tocá “Reservar” abajo cuando quieras.`);
      }
    }
    if (view === 'panel') {
      document.title = 'Panel del dueño · NOVANTIQ Quintas';
      Q().bookings.forEach(b => {
        if (b.nuevo) b._seen = true;
      });
      omi = defaultMonth();
      renderPanel();
      QS.forEach(q =>
        q.bookings.forEach(b => {
          if (b._seen) {
            b.nuevo = false;
            delete b._seen;
          }
        }),
      );
      save();
      window.scrollTo(0, 0);
    }
    if (view === 'crear') {
      document.title = 'Crear demo · NOVANTIQ Quintas';
      renderMade();
      refreshPreview();
      window.scrollTo(0, 0);
    }
  }
  function defaultMonth() {
    return now.getMonth() === 10 && months.length > 1 ? 1 : 0;
  }
  window.addEventListener('hashchange', route);
  mi = defaultMonth();
  omi = defaultMonth();
  syncModes();
  route();
})();
