"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

/* ======================== Datos de ejemplo (LATAM) ======================== */

type ResultItem = { title: string; source: string; excerpt: string };

const BLOG_RESULTS: ResultItem[] = [
  {
    title: "La famosa invasión de los osos en Sicilia",
    source: "Butaca Latina (blog)",
    excerpt:
      "Crítica y análisis de la cinta animada, su estética ilustrada y su recepción en festivales de la región…",
  },
  {
    title: "Animación latinoamericana: 10 películas clave para empezar",
    source: "Animados Hoy (blog)",
    excerpt:
      "Un recorrido por obras de Argentina, México, Chile y Colombia que marcaron la última década…",
  },
  {
    title: "Stop motion en Latinoamérica: estudios y técnicas que marcan tendencia",
    source: "Blog Andino (blog)",
    excerpt:
      "Del papel recortado al híbrido digital, repasamos los talleres más influyentes de la región…",
  },
  {
    title: "Guía práctica: animación 2D con software libre",
    source: "Animar desde Cero (blog)",
    excerpt:
      "Krita, OpenToonz y Synfig: pipeline básico, atajos y plantillas descargables…",
  },
  {
    title: "Latin American Animation You Should Watch",
    source: "Frame by Frame (blog) [EN]",
    excerpt:
      "From experimental shorts to family features, a curated list with streaming availability…",
  },
  {
    title: "Behind the Scenes of ‘Voyages of Light’ (Chile)",
    source: "Indie Toon Journal (blog) [EN]",
    excerpt:
      "Concept art, color scripts and production notes from the award-winning studio…",
  },
];

const PRESS_RESULTS: ResultItem[] = [
  {
    title: "Festival de Annecy: la animación latinoamericana gana terreno",
    source: "El Tiempo (Colombia)",
    excerpt:
      "Productoras de México y Chile destacaron con estrenos mundiales y coproducciones regionales…",
  },
  {
    title: "Industria del cine de animación crece en el Cono Sur",
    source: "La Nación (Argentina)",
    excerpt:
      "Estudios locales multiplican su presencia en plataformas y abren espacios para nuevos talentos…",
  },
  {
    title: "México impulsa incentivos para largometrajes animados",
    source: "El Universal (México)",
    excerpt:
      "Nuevas líneas de financiamiento y deducciones buscan atraer coproducciones…",
  },
  {
    title: "Perú abre fondo para cortos de animación",
    source: "El Comercio (Perú)",
    excerpt:
      "El programa prioriza proyectos con formación de públicos y foco regional…",
  },
  {
    title: "Brazil becomes a co-production hub for animation",
    source: "Variety [EN]",
    excerpt:
      "Tax rebates and a growing talent pool are fueling partnerships across the region…",
  },
  {
    title: "LatAm animation boom draws streamers’ attention",
    source: "The Hollywood Reporter [EN]",
    excerpt:
      "Platforms ramp up original slates as regional studios deliver distinctive aesthetics…",
  },
];

const WEB_RESULTS: ResultItem[] = [
  {
    title: "Historia del cine de animación en América Latina — Enciclopedia",
    source: "WikiLat",
    excerpt:
      "Desde los pioneros hasta los estudios contemporáneos; técnicas, países y obras destacadas…",
  },
  {
    title: "Catálogo de películas de animación latinoamericanas",
    source: "CineDatos LATAM",
    excerpt:
      "Base de datos colaborativa con fichas técnicas, festivales y disponibilidad en streaming…",
  },
  {
    title: "Mapa de festivales de animación en LATAM",
    source: "FestivalesLatam.org",
    excerpt:
      "Calendario, convocatorias abiertas, requisitos y consejos para postular…",
  },
  {
    title: "Guía de fondos, becas y laboratorios de animación",
    source: "FomentoCultural LATAM",
    excerpt:
      "Programas por país, montos, cronogramas y criterios de evaluación…",
  },
  {
    title: "Open dataset of Latin American animated films",
    source: "GitHub · latam-anim-data [EN]",
    excerpt:
      "CSV + JSON with titles, countries, years, festivals and streaming links…",
  },
  {
    title: "A concise history of Latin American animation",
    source: "Animation Notes Archive [EN]",
    excerpt:
      "An overview of schools, studios and landmark works with further reading…",
  },
];

const VIDEO_RESULTS: ResultItem[] = [
  {
    title: "Top 10 películas de animación latinoamericanas",
    source: "YouTube · Canal Cine en Español",
    excerpt:
      "Un conteo comentado con clips y datos curiosos de producciones de la región (12:34)…",
  },
  {
    title: "Cómo se hizo: stop motion en Chile",
    source: "YouTube · Estudio Andino",
    excerpt:
      "Detrás de cámaras del proceso artesanal con miniaturas, iluminación y posproducción (8:57)…",
  },
  {
    title: "Highlights: Anima Festival 2024",
    source: "YouTube · Animar Córdoba",
    excerpt:
      "Resumen con trailers, Q&A y premiaciones del encuentro regional (6:12)…",
  },
  {
    title: "Storyboard paso a paso (caso real)",
    source: "YouTube · Taller Sur",
    excerpt:
      "Desde el guion a la animática: tips de ritmo, encuadre y continuidad (14:05)…",
  },
  {
    title: "How LatAm studios animate on a budget",
    source: "YouTube · Indie Pipeline [EN]",
    excerpt:
      "Production workflows, outsourcing and toolchains for small teams (9:41)…",
  },
  {
    title: "Interview: Directors of ‘The Wolf House’",
    source: "YouTube · FilmTalk [EN]",
    excerpt:
      "Visual language, craft and the eerie stop-motion process behind the film (11:28)…",
  },
];
/* ============================ Componente UI ============================ */

type Freq = "asap" | "daily" | "weekly";
type Results = "best" | "all";

export default function AlertaBusqueda() {
  // Arranca en blanco y con Automático activo
  const [query, setQuery] = useState("");
  const [freq, setFreq] = useState<Freq>("asap");
  const [results, setResults] = useState<Results>("best");
  const [sources, setSources] = useState({
    automatic: true,
    press: false,
    blogs: false,
    web: false,
    videos: false,
  });
  const [lang, setLang] = useState("en"); // Español (LatAm)
  const [submitted, setSubmitted] = useState(false); // Vista previa solo tras enviar

  // Consigna de validación (opcional)
  const isTarget = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qOk = q.includes("cine de animación") || q.includes("cine animado");
    const onlyBlogs =
      sources.blogs &&
      !sources.automatic &&
      !sources.press &&
      !sources.web &&
      !sources.videos;
    return qOk && lang === "es-419" && results === "all" && freq === "daily" && onlyBlogs;
  }, [query, lang, results, freq, sources]);

  /* 
    FUENTES EFECTIVAS PARA LA VISTA PREVIA:
    - Si aún no envían (submitted=false): no mostrar nada.
    - Si consulta vacía: todas las fuentes.
    - Si consulta NO vacía y está en Automático: todas las fuentes.  ← NUEVO
    - En otro caso: respetar los checkboxes seleccionados.
  */
  const effectiveSources = useMemo(() => {
    if (!submitted) {
      return { automatic: false, press: false, blogs: false, web: false, videos: false };
    }
    const trimmed = query.trim();
    if (!trimmed) {
      return { automatic: false, press: true, blogs: true, web: true, videos: true };
    }
    if (sources.automatic) {
      return { automatic: false, press: true, blogs: true, web: true, videos: true };
    }
    return sources;
  }, [submitted, query, sources]);

  // Secciones que se muestran en la vista previa
  const sections = useMemo(() => {
    const s = effectiveSources;
    const out: Array<{ label: string; items: ResultItem[] }> = [];
    if (s.press) out.push({ label: "PRENSA", items: PRESS_RESULTS });
    if (s.blogs) out.push({ label: "BLOGS", items: BLOG_RESULTS });
    if (s.web) out.push({ label: "WEB", items: WEB_RESULTS });
    if (s.videos) out.push({ label: "VÍDEOS", items: VIDEO_RESULTS });

    if (out.length === 0 && submitted) {
      out.push({
        label: "SUGERENCIAS",
        items: [
          {
            title: "Activa alguna fuente para ver resultados",
            source: "Sistema",
            excerpt:
              "Puedes mostrar Blogs, Prensa, Web o Vídeos; o usa ‘Automático’ para obtener todas.",
          },
        ],
      });
    }
    return out;
  }, [effectiveSources, submitted]);

  const toggleSource = (key: keyof typeof sources) =>
    setSources((s) => ({ ...s, [key]: !s[key] }));

  const setOnlyBlogs = () =>
    setSources({ automatic: false, press: false, blogs: true, web: false, videos: false });

  return (
    <div className="min-h-screen bg-[#f3fbfb] text-gray-800">
      {/* Barra superior */}
      <div className="bg-[#286675] text-white py-3 px-4 shadow">
        <div className="max-w-5xl mx-auto">
          <h1 className="flex items-center justify-between text-2xl font-semibold">Alerta de búsqueda</h1>
          <p className="text-white/80">
            Configura la alerta y pulsa <b>Editar alerta</b> para ver la vista previa.
          </p>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 gap-6">
        {/* Formulario */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <div className="grid grid-cols-1 gap-4">
            {/* Consulta */}
            <label className="text-sm font-medium">
              Consulta
              <div className="mt-1 relative">
                <input
                  value={query}
                  onChange={({ target }) => setQuery(target.value)}
                  className="w-full border rounded-xl px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#286675]"
                  placeholder=""
                />
                <span className="absolute right-3 top-2.5 text-gray-400">🔎</span>
              </div>
            </label>

            {/* Selects */}
            <div className="grid sm:grid-cols-3 gap-4">
              <label className="text-sm font-medium">
                Frecuencia
                <select
                  value={freq}
                  onChange={(e) => setFreq(e.target.value as Freq)}
                  className="mt-1 w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#286675]"
                >
                  <option value="asap">Cuando se produzca</option>
                  <option value="daily">Una vez al día</option>
                  <option value="weekly">Una vez por semana</option>
                </select>
              </label>

              <label className="text-sm font-medium">
                Número de resultados
                <select
                  value={results}
                  onChange={(e) => setResults(e.target.value as Results)}
                  className="mt-1 w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#286675]"
                >
                  <option value="best">Solo los mejores resultados</option>
                  <option value="all">Todos los resultados</option>
                </select>
              </label>

              <label className="text-sm font-medium">
                Idioma
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="mt-1 w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#286675]"
                >
                  <option value="es-419">Español (LatAm)</option>
                  <option value="es-ES">Español (España)</option>
                  <option value="en">Inglés</option>
                  <option value="pt-BR">Portugués (Brasil)</option>
                </select>
              </label>
            </div>

            {/* Fuentes */}
            <fieldset className="mt-2">
              <legend className="text-sm font-medium mb-1">Fuentes</legend>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sources.automatic}
                    onChange={() => toggleSource("automatic")}
                  />
                  Automático
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sources.press}
                    onChange={() => toggleSource("press")}
                  />
                  Prensa
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sources.blogs}
                    onChange={() => toggleSource("blogs")}
                  />
                  Blogs
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sources.web}
                    onChange={() => toggleSource("web")}
                  />
                  Web
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sources.videos}
                    onChange={() => toggleSource("videos")}
                  />
                  Vídeos
                </label>
              </div>

              {/* Atajo útil */}
              <div className="mt-2">
                <Button
                  variant="secondary"
                  className="text-xs"
                  onClick={setOnlyBlogs}
                  title="Dejar solo la fuente Blogs"
                >
                  Solo Blogs
                </Button>
              </div>
            </fieldset>

            {/* Email ficticio */}
            <label className="text-sm font-medium">
              Email
              <div className="mt-1">
                <input
                  value="alumno@ladico.org"
                  readOnly
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50 text-gray-600"
                />
              </div>
            </label>

            {/* Enviar (habilita vista previa) */}
            <div>
              <Button
                className="bg-[#286675] hover:bg-[#3a7d89] text-white rounded-xl"
                onClick={() => setSubmitted(true)}
              >
                Editar alerta
              </Button>
            </div>
          </div>
        </div>

        {/* Vista previa */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-6">
          <h2 className="text-2xl font-semibold mb-2">Resultados de su alerta de búsqueda</h2>

          {!submitted ? (
            <p className="text-gray-600">
              Configura tu alerta y pulsa <b>Editar alerta</b> para ver la vista previa.
              <br />• Si envías con la consulta vacía: verás resultados de <b>todas las fuentes</b>.
              <br />• Si escribes una consulta y dejas <b>Automático</b>: también verás <b>todas las fuentes</b>.
            </p>
          ) : (
            <>
              <p className="text-gray-700 mb-4">
                <span className="font-medium">{query || "—"}</span>
              </p>

              {sections.map((sec, idx) => (
                <div key={idx} className="mb-4">
                  <div className="text-sm text-gray-500 font-semibold mb-2">{sec.label}</div>
                  <ul className="divide-y">
                    {sec.items.map((r, i) => (
                      <li key={i} className="py-3">
                        <a
                          className="text-lg font-semibold text-blue-700 hover:underline"
                          href="#"
                          onClick={(e) => e.preventDefault()}
                        >
                          {r.title}
                        </a>
                        <div className="text-xs text-gray-400">{r.source}</div>
                        <p className="text-sm text-gray-700 mt-1">{r.excerpt}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Pista */}
              <div className="mt-4 text-xs text-gray-500">
                {!query.trim()
                  ? "🔎 Enviaste la alerta sin consulta: mostramos vista previa con todas las fuentes."
                  : sources.automatic
                  ? "🤖 Automático activado con consulta: mostramos resultados de todas las fuentes."
                  : isTarget
                  ? "✅ Configuración correcta. El primer resultado en BLOGS es “La famosa invasión de los osos en Sicilia”."
                  : "ℹ️ Para cumplir la consigna usa: consulta “cine de animación”, idioma Español (LatAm), frecuencia Una vez al día, Todos los resultados y deja solo Blogs."}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
