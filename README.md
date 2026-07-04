# Horas Extras — Dashboard Personal

Aplicación web ligera (PWA) para el **control personal de horas laborales, horas extras y pagos quincenales** en Colombia. Privada, local y sin servidores: todos tus datos viven en tu propio dispositivo.

> Responde de inmediato tres preguntas: **¿cuántas horas extra llevo?**, **¿cuánto deberían pagarme el próximo 15 o fin de mes?** y **¿cuánto me han pagado este año?**

---

## Características

- 📱 **PWA instalable** en iPhone, Android y navegadores móviles (funciona offline).
- ⏱️ **Registro de jornadas** rápido con detección automática de sábado/domingo/festivo.
- 🧮 **Cálculo automático** de horas ordinarias, extras diurnas/nocturnas, dominicales y festivas.
- 💰 **Control quincenal** (1–15 y 16–fin de mes) con liquidación e historial de pagos.
- 📅 **Calendario visual** con colores por intensidad de horas extra.
- 📊 **Estadísticas** con gráficos ligeros (Recharts).
- 📤 **Exportación** a PDF y Excel (quincena, mes o año).
- 🌙 **Modo oscuro/claro** y diseño premium optimizado para uso táctil.
- 🇨🇴 **Festivos colombianos** calculados automáticamente (Ley Emiliani + Semana Santa).

---

## Stack

React 19 · Vite 7 · TypeScript (estricto) · Tailwind CSS v4 · shadcn/ui (patrón) · Recharts · vite-plugin-pwa · almacenamiento en LocalStorage.

---

## Instalación local

Requisitos: **Node.js 18+**.

```bash
# 1. Instalar dependencias
npm install

# 2. (Opcional) Generar los iconos de la PWA
npm run icons

# 3. Levantar en modo desarrollo
npm run dev
```

Abre la URL que muestra la terminal (por defecto `http://localhost:5173`).

### Compilar para producción

```bash
npm run build      # genera la carpeta dist/
npm run preview    # sirve la build para probarla
```

La carpeta `dist/` es 100% estática: puedes abrirla desde cualquier hosting estático
(Netlify, Vercel, GitHub Pages) o incluso un servidor local. No requiere backend.

---

## Instalar como app en el celular

1. Compila y publica (o sirve) la app sobre **HTTPS**.
2. **iPhone (Safari):** botón Compartir → «Añadir a pantalla de inicio».
3. **Android (Chrome):** menú ⋮ → «Instalar aplicación» / «Añadir a pantalla de inicio».

Una vez instalada funciona sin conexión y se abre en pantalla completa.

---

## Cómo funcionan los cálculos

Toda la lógica está centralizada en [`src/lib/calculations.ts`](src/lib/calculations.ts) para
facilitar mejoras futuras. Es una **aproximación confiable para control personal**, no una
liquidación jurídica de nómina.

- **Jornada diaria estándar** = `jornada legal semanal ÷ días laborales por semana` (ambos
  editables en Configuración). En Colombia la jornada se reduce gradualmente (Ley 2101 de 2021):
  cada 15 de julio puede cambiar, por eso **no está fija en el código**.
- **Día normal:** los minutos hasta la jornada estándar son ordinarios; el resto son extras,
  clasificados en diurnos o nocturnos según la franja nocturna configurable.
- **Sábado:** todo cuenta como extra (la jornada habitual es lunes a viernes).
- **Domingo/festivo:** todas las horas van a la categoría dominical/festiva con su recargo.
- **Valor estimado** = solo el **pago adicional** por extras y recargos (las horas ordinarias
  se asumen cubiertas por el salario base).

Recargos por defecto (editables en Configuración): extra diurna +25 %, extra nocturna +75 %,
recargo nocturno +35 %, dominical/festivo +80 %. Franja nocturna por defecto 19:00–06:00
(la reforma laboral movió el inicio a las 19:00).

---

## Estructura del proyecto

```
horas-extras-dashboard/
├── public/icons/            # iconos PWA (generados)
├── scripts/generate-icons.mjs
├── src/
│   ├── lib/                 # LÓGICA (sin UI): cálculos, fechas, festivos, quincenas, export, storage
│   ├── context/             # estado global (AppContext) + persistencia
│   ├── components/
│   │   ├── ui/              # componentes base reutilizables (Button, Card, Dialog…)
│   │   ├── DashboardView.tsx
│   │   ├── RegisterView.tsx
│   │   ├── QuincenaView.tsx
│   │   ├── CalendarView.tsx
│   │   ├── HistoryView.tsx
│   │   ├── StatsView.tsx    # carga diferida (Recharts)
│   │   ├── ExportView.tsx   # carga diferida (jsPDF/xlsx)
│   │   └── SettingsView.tsx
│   ├── App.tsx              # shell + navegación
│   └── main.tsx
└── vite.config.ts          # config + manifest PWA
```

---

## Respaldo de datos

Como todo se guarda **solo en tu dispositivo**, en **Configuración → Datos y respaldo** puedes:

- **Exportar respaldo** (archivo `.json` con todos tus registros y pagos).
- **Restaurar** desde un respaldo previo.
- **Borrar** todos los datos.

Haz respaldos periódicos para no perder información si limpias el navegador o cambias de equipo.

---

## Privacidad

No hay cuentas, ni servidores, ni analítica, ni conexiones externas. Tus horarios y pagos
nunca salen de tu dispositivo.
