export const dynamic = "force-static";

export default function FredericFalseSite() {
  const ARTICLES = [
    {
      n: 1,
      href: "https://www.legorafi.fr/2022/06/14/climat-des-chercheurs-developpent-une-creme-solaire-indice-450/",
      title:
        "Clima – Investigadores desarrollan protector solar con FPS 450",
      img: "https://images.unsplash.com/photo-1610465299996-31cf5e5cfdde?q=80&w=1200&auto=format&fit=crop",
      source: "LEGORAFI.FR",
      satirical: true, // (pista para quienes vuelvan a la consigna)
    },
    {
      n: 2,
      href: "https://www.who.int/health-topics/ultraviolet-radiation#tab=tab_1",
      title: "OMS – Radiación ultravioleta: datos clave",
      img: "https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=1200&auto=format&fit=crop",
      source: "WHO.INT",
    },
    {
      n: 3,
      href: "https://example.com/blog/opinion-mi-experiencia-con-filtros-solares",
      title: "Opinión – Mi experiencia con filtros solares caseros",
      img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1200&auto=format&fit=crop",
      source: "BLOG PERSONAL",
    },
    {
      n: 4,
      href: "https://www.nature.com/articles/d41586-022-00000-0",
      title: "Nature – Evidencia reciente sobre daño UV y protección",
      img: "https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=1200&auto=format&fit=crop",
      source: "NATURE.COM",
    },
    {
      n: 5,
      href: "https://www.cancer.org/healthy/be-safe-in-sun.html",
      title: "American Cancer Society – Seguridad bajo el sol",
      img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
      source: "CANCER.ORG",
    },
  ];

  return (
    <main
      className="
        min-h-screen
        bg-[#f3fbfb]
        [background-image:radial-gradient(1px_1px_at_1px_1px,#ffffff66_1px,transparent_1px)]
        [background-size:14px_14px]
        text-white
      "
    >
      {/* Contenido */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {ARTICLES.map((a) => (
          <article
            key={a.n}
            className="bg-white text-gray-900 rounded-xl shadow-2xl mb-8 overflow-hidden"
          >
            <div className="px-5 pt-5">
              <div className="text-sm text-gray-600 mb-2">
                Frederic False en busca de la verdad compartió un enlace.
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                ARTÍCULO {a.n}
              </h2>
              <a
                href={a.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1a73e8] underline break-all"
              >
                {a.href}
              </a>
            </div>

            {/* Imagen grande (como en tu captura) */}
            <div className="mt-3">
              <img
                src={a.img}
                alt={a.title}
                className="w-full aspect-[16/9] object-cover"
                loading="lazy"
              />
            </div>

            {/* Pie de tarjeta */}
            <div className="px-5 py-4 border-t">
              <div className="text-[11px] tracking-wider text-gray-500">
                {a.source}
              </div>
              <div className="mt-1 text-lg font-semibold">{a.title}</div>
              {a.satirical && (
                <div className="mt-1 text-[12px] text-amber-700 bg-amber-50 inline-block px-2 py-1 rounded">
                  Sitio satírico (útil para detectar desinformación).
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
