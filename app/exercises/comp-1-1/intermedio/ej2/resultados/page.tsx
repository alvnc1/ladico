"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";

/* ====================== Utilidades ====================== */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Intenciones y sinónimos — más realista al estilo buscador */
const INTENTS = {
  receta: [
    "receta",
    "preparación",
    "preparacion",
    "cómo hacer",
    "como hacer",
    "paso a paso",
    "guía",
    "guia",
  ],
  empanadas: [
    "empanada",
    "empanadas",
    "empanadillas",
    "salteñas",
    "saltenas",
    "pasteles criollos",
  ],
  carne: ["carne", "res", "vacuno", "picada", "molida"],
} as const;

type IntentKey = keyof typeof INTENTS;

/* ====================== Dataset LATAM ====================== */
/** Títulos y snippets plausibles en español LATAM. */
type Result = {
  title: string;
  url: string;
  site: string;
  meta: string; // rating, votos, tiempo, país
  snippet: string;
};

const RESULTS: Result[] = [
  {
    title: "Empanadas de carne tradicionales (receta fácil) — Paulina Cocina",
    url: "https://www.paulinacocina.net/receta-empanadas-carne",
    site: "paulinacocina.net",
    meta: "⭐ 4.8 · 540 votos · 45 min · Argentina",
    snippet:
      "Una receta clásica de empanadas de carne con paso a paso, tips para el relleno jugoso (carne picada, cebolla, huevo, aceitunas) y cómo lograr un buen repulgue.",
  },
  {
    title: "Empanadas chilenas de pino: receta casera",
    url: "https://www.recetaschilenas.cl/empanadas-de-pino",
    site: "recetaschilenas.cl",
    meta: "⭐ 4.6 · 310 votos · 1 h · Chile",
    snippet:
      "Preparación al estilo chileno: sofrito de cebolla, comino, ají de color y aceitunas. Masa elástica y horneado parejo.",
  },
  {
    title: "Empanadas argentinas de carne: masa y relleno paso a paso",
    url: "https://www.saborargentino.com/empanadas-carne",
    site: "saborargentino.com",
    meta: "⭐ 4.7 · 420 votos · 55 min · Argentina",
    snippet:
      "Todo lo que necesitas para una receta auténtica: ingredientes, armado, sellado y horneado. Versión salteña y criolla.",
  },
  {
    title: "Cómo hacer empanadas al horno: masa fácil y relleno de res",
    url: "https://www.saboresandinos.pe/empanadas-al-horno",
    site: "saboresandinos.pe",
    meta: "⭐ 4.6 · 310 votos · 1 h · Perú",
    snippet:
      "Preparación paso a paso: amasado, reposo, estirado y armado. Truco para mantener la carne molida jugosa sin exceso de líquido.",
  },
  {
    title: "Guía práctica: errores comunes al preparar empanadillas",
    url: "https://www.latamchef.ar/empanadillas-errores-comunes",
    site: "latamchef.ar",
    meta: "⭐ 4.5 · 260 votos · 40 min · Argentina",
    snippet:
      "Por qué se abren, cómo ajustar humedad del relleno y el grosor de la masa. Alternativas con picada de res o pollo.",
  },
  {
    title: "Pasteles criollos al horno: masa quebrada y armado parejo",
    url: "https://www.saboresdelrio.lat/pasteles-criollos",
    site: "saboresdelrio.lat",
    meta: "⭐ 4.4 · 160 votos · 50 min · Cono Sur",
    snippet:
      "Técnicas de sellado y horneado uniforme. Relleno de carne, vegetales y condimentos clásicos; tiempos por tamaño.",
  },
  {
    title: "Empanadas argentinas fritas: trucos para el repulgue",
    url: "https://www.buenprovecho.uy/empanadas-fritas",
    site: "buenprovecho.uy",
    meta: "⭐ 4.3 · 190 votos · 35 min · Uruguay",
    snippet:
      "Fritura a temperatura estable y escurrido correcto. Opción con carne molida y otra con humita.",
  },
  {
    title: "Manual básico de masas rellenas (horno y sartén)",
    url: "https://www.platofondo.lat/manual-masas-rellenas",
    site: "platofondo.lat",
    meta: "⭐ 4.2 · 120 votos · 55 min · LATAM",
    snippet:
      "Capítulos dedicados a empanadas, pastelitos y otras piezas. Uso de res, pollo y verduras con tabla de temperaturas.",
  },
];

/* ====================== Lógica de ranking ====================== */
function detectIntents(q: string): IntentKey[] {
  const nq = norm(q);
  const found: IntentKey[] = [];
  (Object.keys(INTENTS) as IntentKey[]).forEach((k) => {
    const any = INTENTS[k].some((alias) => nq.includes(norm(alias)));
    if (any) found.push(k);
  });
  return found;
}

function scoreResult(r: Result, intents: IntentKey[]) {
  const haystack = `${r.title} ${r.snippet}`;
  const n = norm(haystack);
  let score = 0;
  intents.forEach((k) => {
    const matched = INTENTS[k].some((alias) => n.includes(norm(alias)));
    if (matched) score += 1;
  });
  // desempate suave: si “receta/guía/preparación” aparece en el título
  if (intents.includes("receta")) {
    const t = norm(r.title);
    if (INTENTS.receta.some((a) => t.includes(norm(a)))) score += 0.2;
  }
  return score;
}

function highlight(text: string, intents: IntentKey[], rawQuery: string) {
  let out = text;

  // 1) palabras de la query literal
  const words = rawQuery
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
  words.forEach((w) => {
    const re = new RegExp(`(${escapeRegExp(w)})`, "gi");
    out = out.replace(re, "<mark>$1</mark>");
  });

  // 2) sinónimos de cada intención detectada
  intents.forEach((k) => {
    INTENTS[k].forEach((alias) => {
      const re = new RegExp(`(${escapeRegExp(alias)})`, "gi");
      out = out.replace(re, "<mark>$1</mark>");
    });
  });

  return out;
}

/* ====================== Página (estilo solicitado) ====================== */
export default function ResultadosEmpanadas() {
  const params = useSearchParams();
  // Si no viene ?q=, dejamos vacío para que respete el orden “por defecto”
  const q = (params.get("q") || "").trim();

  const intents = useMemo(() => detectIntents(q), [q]);

  const ranked = useMemo(() => {
    if (!q) return RESULTS; // sin query: sin ranking forzado
    const scored = RESULTS.map((r) => ({ r, s: scoreResult(r, intents) }));
    scored.sort((a, b) => b.s - a.s);
    return scored.map((x) => x.r);
  }, [q, intents]);

  const approxCount = useMemo(() => {
    // número verosímil (como en tu ejemplo)
    const base = 182000;
    const bonus = Math.min(40000, q.length * 900);
    return (base + bonus).toLocaleString("es-CL");
  }, [q]);

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Aviso superior */}
      <div className="w-full bg-yellow-300 text-black text-sm md:text-base">
        <div className="max-w-5xl mx-auto px-3 py-2 text-center">
          Esta página es una previsualización de resultados de un buscador. Vuelve al
          ejercicio cuando tengas la respuesta.
        </div>
      </div>

      {/* Barra de navegación del buscador */}
      <div className="border-b">
        <div className="max-w-5xl mx-auto px-3">
          <div className="flex items-center gap-6 text-sm md:text-base">
            <nav className="flex gap-5 py-3">
              <span className="text-blue-700 font-medium border-b-2 border-blue-700 pb-2 -mb-0.5">
                Web
              </span>
              <span className="text-gray-600 hover:text-black cursor-pointer">Imágenes</span>
              <span className="text-gray-600 hover:text-black cursor-pointer">Noticias</span>
              <span className="text-gray-600 hover:text-black cursor-pointer">Vídeos</span>
              <span className="text-gray-600 hover:text-black cursor-pointer">Mapas</span>
              <span className="text-gray-600 hover:text-black cursor-pointer">Más</span>
            </nav>

            <div className="ml-auto hidden md:flex items-center gap-5 text-sm">
              <button className="text-gray-600 hover:text-black">⚙ Configuración</button>
              <button className="text-gray-600 hover:text-black">🛠 Herramientas</button>
            </div>
          </div>
        </div>
      </div>

      {/* Cuerpo */}
      <main className="max-w-5xl mx-auto px-3">
        {/* Meta resultados */}
        <div className="text-xs md:text-sm text-gray-500 mt-3 mb-2">
          Aproximadamente {approxCount} resultados (0,32 s)
          {q ? (
            <>
              {" "}
              — consulta: <b>{q}</b>
            </>
          ) : null}
        </div>

        {/* Lista de resultados (ranqueados si hay query) */}
        {ranked.map((res, i) => (
          <article key={i} className="py-3">
            <a
              href="#"
              className="text-xl text-blue-700 hover:underline font-medium"
              onClick={(e) => e.preventDefault()}
              dangerouslySetInnerHTML={{
                __html: highlight(res.title, intents, q),
              }}
            />
            <div className="text-xs text-green-700">{res.url}</div>
            <div className="text-sm text-gray-600 mt-1">{res.meta}</div>
            <p
              className="text-[15px] mt-1 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: highlight(res.snippet, intents, q),
              }}
            />
          </article>
        ))}

        {/* Carrusel de videos */}
        <section className="mt-4">
          <h3 className="text-lg text-gray-800 mb-2">
            Vídeos sobre{" "}
            <span className="font-medium">
              {q || "receta empanadas de carne"}
            </span>
          </h3>

          <div className="grid md:grid-cols-3 gap-3">
            {[
              {
                img: "/emp.jpg",
                t: "Cómo hacer empanadas de carne jugosas (paso a paso)",
                ch: "Cocina en Casa",
                dur: "7:42",
              },
              {
                img: "/emparg.webp",
                t: "Empanadas argentinas de carne — masa casera y relleno",
                ch: "Sabor Criollo",
                dur: "9:10",
              },
              {
                img: "/empchl.jpg",
                t: "Empanadas chilenas de pino: receta completa",
                ch: "Cocina con Tía Ely",
                dur: "6:05",
              },
            ].map((v, idx) => (
              <a
                key={idx}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="block group border rounded-lg overflow-hidden hover:shadow"
              >
                <div className="relative aspect-video bg-gray-100">
                  <img src={v.img} alt={v.t} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 text-xs bg-black/70 text-white px-1 rounded">
                    {v.dur}
                  </span>
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="bg-black/40 rounded-full p-2 text-white text-xl">▶</span>
                  </span>
                </div>
                <div className="p-2">
                  <div className="font-medium group-hover:underline line-clamp-2">{v.t}</div>
                  <div className="text-xs text-gray-500">YouTube · {v.ch}</div>
                </div>
              </a>
            ))}
          </div>

          <div className="mt-2">
            <button className="text-blue-700 text-sm hover:underline">Mostrar más vídeos</button>
          </div>
        </section>

        {/* Más resultados (mantiene tu estilo) */}
        <article className="py-3">
          <a
            href="#"
            className="text-xl text-blue-700 hover:underline font-medium"
            onClick={(e) => e.preventDefault()}
            dangerouslySetInnerHTML={{
              __html: highlight(
                "Empanadas de carne fáciles — paso a paso",
                intents,
                q
              ),
            }}
          />
          <div className="text-xs text-green-700">
            https://www.kiwilimon.com/recetas/empanadas-carne
          </div>
          <div className="text-sm text-gray-600 mt-1">⭐ 4.5 · 210 votos · 35 min · México</div>
          <p
            className="text-[15px] mt-1 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: highlight(
                "Conoce la receta básica para empanadas horneadas: masa suave y relleno de carne sazonada. Incluye tiempos, porciones y sugerencias de salsas.",
                intents,
                q
              ),
            }}
          />
        </article>

        <article className="py-3">
          <a
            href="#"
            className="text-xl text-blue-700 hover:underline font-medium"
            onClick={(e) => e.preventDefault()}
            dangerouslySetInnerHTML={{
              __html: highlight(
                "Empanadas norteñas de carne — versión casera",
                intents,
                q
              ),
            }}
          />
          <div className="text-xs text-green-700">
            https://www.directoalpaladar.com/latam/empanadas-carne
          </div>
          <div className="text-sm text-gray-600 mt-1">⭐ 4.4 · 160 votos · 50 min · LATAM</div>
          <p
            className="text-[15px] mt-1 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: highlight(
                "Preparación clásica con cebolla, pimentón y comino. Consejos para congelar y recalentar sin perder textura.",
                intents,
                q
              ),
            }}
          />
        </article>
      </main>
    </div>
  );
}
