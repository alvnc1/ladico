export const dynamic = "force-static";

export default function FredericFalseSite() {
  const ARTICLES = [
    {
      n: 1,
      href: "https://uchile.cl/noticias/215096/especialistas-de-la-u-de-chile-alertan-sobre-ascenso-del-dengue",
      title: "Especialistas alertan sobre ascenso del dengue en Latinoamérica y entregan recomendaciones a viajeros",
      img: "/mosquito.jpg",
      source: "UCHILE.CL",
      verified: true, // Fuente confiable - medio reconocido
    },
    {
      n: 2,
      href: "https://noticiasocultasx.com/el-tiempo-se-esta-acelerando-no-es-tu-ilusion/",
      title: "El tiempo se está acelerando, no es tu ilusión",
      img: "/tiempo.jpg",
      source: "NOTICIASOCULTASX.COM",
      verified: false, // Sitio de noticias curiosas/sensacionalistas
    },
    {
      n: 3,
      href: "https://www.meganoticias.cl/nacional/498806-bencinas-suben-precio-18-de-septiembre-fiestas-patrias-clapes-uc-brk-12-09-2025.html",
      title: "Advierten alza en precio de la bencina para el 18 de septiembre: ¿Cuánto subirían los combustibles en Fiestas Patrias?",
      img: "/bencina.jpg",
      source: "MEGANOTICIAS.CL",
      verified: true, // Medio periodístico serio y reconocido
    },
    {
      n: 4,
      href: "https://protocolodevida.com/te-de-hierbabuena-para-diabetes/#",
      title: "Té de hierbabuena para diabetes",
      img: "/té.jpg",
      source: "PROTOCOLODEVIDA.COM",
      verified: false, // Sitio de remedios caseros sin base científica
    },
    {
      n: 5,
      href: "https://www.lanacion.com.ar/politica/el-gobierno-le-lleva-a-los-gobernadores-la-reforma-laboral-e-impositiva-para-buscar-gobernabilidad-nid12092025/",
      title: "La Casa Rosada le lleva a los gobernadores la reforma laboral e impositiva para buscar gobernabilidad",
      img: "/reuArg.avif",
      source: "LANACION.COM.AR",
      verified: true, // Organización internacional reconocida
    }
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
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
