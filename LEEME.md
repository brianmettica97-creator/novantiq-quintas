# NOVANTIQ Quintas

Demo de una plataforma para alquilar quintas **por día** o **para quedarse** (por noche), con calendario en tiempo real, reserva con seña, panel del dueño y creador de demos.

Desarrollado por **Novantiq S.A.** · @novantiq.sa

---

## Cómo abrirlo

1. Descomprimí el .zip y abrí la carpeta `novantiq-quintas` en Visual Studio Code (Archivo → Abrir carpeta).
2. Instalá la extensión **Live Server** (VS Code te la sugiere sola al abrir la carpeta).
3. Clic derecho en `index.html` → **Open with Live Server**. Se abre en el navegador y se actualiza cada vez que guardás.

También funciona con doble clic en `index.html`, pero con Live Server es más cómodo para trabajar.

## Cómo está organizado

```
novantiq-quintas/
├── index.html        → la estructura de todas las pantallas
├── css/estilos.css   → todos los estilos (colores en :root, al principio)
├── js/app.js         → toda la lógica, dividida en secciones
├── fotos/
│   ├── areco/        → fotos de la Casa Quinta en Areco
│   └── berazategui/  → fotos de la Casa Quinta en Berazategui
└── LEEME.md
```

### Las pantallas (todas en `index.html`)

| Pantalla | Dirección | Qué hace |
|---|---|---|
| Buscador | `#portal` | Buscar quintas por fecha, para pasar el día o quedarse a dormir |
| Página de una quinta | `#q-quinta-areco` | Fotos, calendario y reserva |
| Panel del dueño | `#panel` | Reservas, señas, bloquear días, precios, fotos |
| Crear demo | `#crear` | Cargar la quinta de un dueño nuevo en un minuto |

### Fotos o escena animada

- Las quintas **con fotos reales** (Areco y Berazategui) muestran sus fotos en el buscador y en su página.
- Las quintas **de ejemplo**, sin fotos, muestran la escena animada (gente en la pileta, la parrilla, la cancha y el quincho) e imágenes ilustrativas.
- Si un dueño sube fotos desde su panel, su quinta pasa a mostrar las fotos.

### Videos de las quintas

- Las quintas con video lo muestran en su página, debajo de las fotos. Arranca solo, sin sonido, en loop, y se pausa cuando sale de la pantalla.
- Para sumar uno: poné el `.mp4` en `video/` y agregalo en el objeto `VIDEOS` de `js/app.js` (buscá "videos de la quinta").
- **Antes de subirlo, comprimilo**: 720p, H.264, sin audio, idealmente menos de 10 MB. Los originales pesados guardalos fuera de esta carpeta (por ejemplo en `Desktop/novantiq-originales`).
- `poster` es la imagen que se ve mientras carga el video.

### Las secciones de `js/app.js`

Cada sección empieza con un comentario `/* ===== nombre ===== */`. Con **Ctrl + F** buscás el nombre y vas directo.

- **reglas de negocio**: turnos (día 10 a 19 h, noche 21 a 5 h), fechas de fiestas, feriados, extras, cálculo de la seña (30%), monedas.
- **datos de ejemplo**: la función `seedQuintas()` tiene todas las quintas cargadas. **Acá cambiás datos, precios o agregás quintas.**
- **estado y guardado**: guarda todo en el navegador (localStorage).
- **calendario**, **reserva**, **panel**, **portal**, **creador**: cada pantalla.
- **escena animada**: el plano animado (canvas) de las quintas de ejemplo.
- **fotos**: galería, visor de fotos e imágenes ilustrativas.

## Cómo cargar una quinta

En `seedQuintas()` copiá una quinta parecida y cambiá sus datos. Los campos principales:

| Campo | Ejemplo | Para qué |
|---|---|---|
| `id` | `'quinta-areco'` | Identificador único, sin espacios ni tildes |
| `nombre`, `zona`, `dist` | `'Casa Quinta en Areco'` | Lo que se muestra |
| `cap` | `13` | Personas máximo |
| `modos` | `{dia:true, estadia:true}` | Si alquila por día, para quedarse o las dos |
| `turnos` | `['dia']` o `['dia','noche']` | Turnos del uso por día |
| `precios` | `{semana, finde, especial}` | Precio del uso por día |
| `est` | `{precios, min, checkin, checkout, dormitorios, banos}` | Datos para quedarse (por noche) |
| `moneda` | `'USD'` | Si cobra en dólares (sin este campo, cobra en pesos) |
| `fotos` | `[{src:'fotos/...', cap:'Pileta'}]` | Fotos que vienen cargadas |
| `incluye`, `feats` | listas de texto | Qué incluye y datos destacados |
| `libres` | `12` | Deja libres los próximos días en las reservas de ejemplo |

**Importante:** los datos quedan guardados en el navegador. Si cambiás `seedQuintas()` y no ves los cambios, entrá a **Crear demo → Reiniciar todos los datos de la demo**.

## Colores y tipografías

Al principio de `css/estilos.css`, en `:root`, están todos los colores como variables (`--accent`, `--pool`, `--free`, etc.). Hay una versión para modo oscuro justo debajo. Cambiás el color ahí y se actualiza en toda la app.

## Lo que es de demo (todavía no es real)

- **Pagos**: Mercado Pago y transferencia están simulados.
- **Datos**: se guardan solo en el navegador. Cada celular o computadora ve los suyos.
- **WhatsApp**: los avisos al dueño y al cliente son simulados.

## Próximos pasos para lanzarlo

1. **Supabase**: guardar quintas, reservas y fotos en una base de datos real, compartida entre dueño y clientes.
2. **Inicio de sesión del dueño** para que el panel sea solo suyo.
3. **Mercado Pago real**: que la seña entre directo a la cuenta del dueño.
4. **Aviso por WhatsApp** al dueño cuando entra una reserva.
5. **Política de cancelación** visible antes de pagar.
