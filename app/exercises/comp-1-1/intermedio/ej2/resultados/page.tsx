"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import CL_MULTI from "../data/results.cl.multi.json";

type ExercisePack = {
  id: string;
  title: string;
  prompt: string;
  keywordGroups: string[][];
  intents: Record<string, string[]>;
  results: { title: string; url: string; site: string; meta: string; snippet: string }[];
  videos: { img: string; title: string; channel: string; dur: string }[];
  boost?: { tlds?: string[]; sites?: string[] };
};

type MultiCfg = {
  schemaVersion: number;
  country: string;
  exercises: ExercisePack[];
};

const CFG = CL_MULTI as MultiCfg;

// ---------- utils ----------
const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function detectIntents(q: string, intents: ExercisePack["intents"]) {
  const nq = norm(q);
  return Object.keys(intents).filter((k) =>
    intents[k].some((alias) => nq.includes(norm(alias)))
  );
}

function scoreResult(
  r: ExercisePack["results"][number],
  intentsFound: string[],
  pack: ExercisePack
) {
  const n = norm(`${r.title} ${r.snippet}`);
  let score = 0;
  intentsFound.forEach((k) => {
    const matched = (pack.intents[k] || []).some((alias) =>
      n.includes(norm(alias))
    );
    if (matched) score += 1;
  });
  const host = r.url.split("/")[2] || "";
  if (pack.boost?.tlds?.some((tld) => host.endsWith(tld))) score += 0.5;
  if (pack.boost?.sites?.includes(r.site)) score += 0.4;
  if (intentsFound.includes("receta")) {
    const t = norm(r.title);
    if ((pack.intents["receta"] || []).some((a) => t.includes(norm(a))))
      score += 0.2;
  }
  return score;
}

function highlight(text: string, intentsFound: string[], rawQuery: string, pack: ExercisePack) {
  let out = text;
  const words = rawQuery.split(/\s+/).map((w) => w.trim()).filter(Boolean);
  words.forEach((w) => {
    const re = new RegExp(`(${escapeRegExp(w)})`, "gi");
    out = out.replace(re, "<mark>$1</mark>");
  });
  intentsFound.forEach((k) => {
    (pack.intents[k] || []).forEach((alias) => {
      const re = new RegExp(`(${escapeRegExp(alias)})`, "gi");
      out = out.replace(re, "<mark>$1</mark>");
    });
  });
  return out;
}

function approxCount(q: string) {
  const base = 160000;
  const bonus = Math.min(50000, q.length * 900);
  return (base + bonus).toLocaleString("es-CL");
}

// ---------- page ----------
export default function SearchPreviewChile() {
  const params = useSearchParams();
  const q = (params.get("q") || "").trim();

  // Si hay slug en la URL, úsalo; si no, elige un pack al azar
  const pack: ExercisePack = useMemo(() => {
    const exercises = CFG.exercises;
    if (params.get("slug")) {
      const slug = params.get("slug")!;
      return exercises.find((e) => e.id === slug) || exercises[0];
    }
    // 👇 random
    return exercises[Math.floor(Math.random() * exercises.length)];
  }, [params]);


  const intentsFound = useMemo(() => detectIntents(q, pack.intents), [q, pack]);
  const ranked = useMemo(() => {
    if (!q) return pack.results;
    const s = pack.results.map((r) => ({ r, s: scoreResult(r, intentsFound, pack) }));
    s.sort((a, b) => b.s - a.s);
    return s.map((x) => x.r);
  }, [q, pack, intentsFound]);

  const totalApprox = useMemo(() => approxCount(q), [q]);

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Aviso */}
      <div className="w-full bg-yellow-300 text-black text-sm md:text-base">
        <div className="max-w-5xl mx-auto px-3 py-2 text-center">
          Resultados simulados · <b>Chile</b> · Ejercicio: <b>{pack.title}</b>
        </div>
      </div>

      {/* Barra */}
      <div className="border-b">
        <div className="max-w-5xl mx-auto px-3">
          <div className="flex items-center gap-6 text-sm md:text-base">
            <nav className="flex gap-5 py-3">
              <span className="text-blue-700 font-medium border-b-2 border-blue-700 pb-2 -mb-0.5">Web</span>
              <span className="text-gray-600">Imágenes</span>
              <span className="text-gray-600">Noticias</span>
              <span className="text-gray-600">Vídeos</span>
              <span className="text-gray-600">Mapas</span>
              <span className="text-gray-600">Más</span>
            </nav>
            <div className="ml-auto hidden md:flex items-center gap-5 text-sm">
              <button className="text-gray-600">⚙ Configuración</button>
              <button className="text-gray-600">🛠 Herramientas</button>
            </div>
          </div>
        </div>
      </div>

      {/* Cuerpo */}
      <main className="max-w-5xl mx-auto px-3">
        <p className="mt-3 text-sm text-gray-700">
          {pack.prompt}
        </p>

        <div className="text-xs md:text-sm text-gray-500 mt-2 mb-2">
          Aproximadamente {totalApprox} resultados (0,32 s)
          {q ? <> — consulta: <b>{q}</b></> : null}
        </div>

        {ranked.map((res, i) => (
          <article key={i} className="py-3">
            <a
              href="#"
              className="text-xl text-blue-700 hover:underline font-medium"
              onClick={(e) => e.preventDefault()}
              dangerouslySetInnerHTML={{ __html: highlight(res.title, intentsFound, q, pack) }}
            />
            <div className="text-xs text-green-700">{res.url}</div>
            <div className="text-sm text-gray-600 mt-1">{res.meta}</div>
            <p
              className="text-[15px] mt-1 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlight(res.snippet, intentsFound, q, pack) }}
            />
          </article>
        ))}

        {/* Videos */}
        <section className="mt-4">
          <h3 className="text-lg text-gray-800 mb-2">
            Vídeos relacionados
          </h3>
          <div className="grid md:grid-cols-3 gap-3">
            {pack.videos.map((v, idx) => (
              <a key={idx} href="#" onClick={(e) => e.preventDefault()} className="block group border rounded-lg overflow-hidden hover:shadow">
                <div className="relative aspect-video bg-gray-100">
                  <img src={v.img} alt={v.title} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 text-xs bg-black/70 text-white px-1 rounded">{v.dur}</span>
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="bg-black/40 rounded-full p-2 text-white text-xl">▶</span>
                  </span>
                </div>
                <div className="p-2">
                  <div className="font-medium group-hover:underline line-clamp-2">{v.title}</div>
                  <div className="text-xs text-gray-500">YouTube · {v.channel}</div>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
