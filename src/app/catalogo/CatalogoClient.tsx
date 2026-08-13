"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Sparkles,
  Palette,
  Droplet,
  Gem,
  Heart,
  Star,
  Paintbrush,
  ShoppingBag,
  ImageOff,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ProductoPublico } from "@/types/database";
import ThemeToggle from "@/components/ThemeToggle";

// Edita aquí tus contactos de WhatsApp (número con código de país, sin espacios ni signos).
const CONTACTOS_WHATSAPP = [
  { numero: "593978653938", etiqueta: "Vendedor 1" },
  { numero: "593963119623", etiqueta: "Vendedor 2" },
];

const ICONOS_CATEGORIA = [Sparkles, Palette, Droplet, Gem, Heart, Star, Paintbrush, ShoppingBag];

function money(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function slug(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
}

function mensajeWhatsapp() {
  return encodeURIComponent("Hola 👋, vi su catálogo y quiero más información sobre sus productos.");
}

export default function CatalogoClient() {
  const supabase = createClient();
  const [productos, setProductos] = useState<ProductoPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from("productos")
        .select("id, nombre, categoria, precio, imagen_url, cantidad_actual")
        .eq("visible_catalogo", true)
        .order("categoria")
        .order("nombre");
      setProductos((data as ProductoPublico[]) ?? []);
      setCargando(false);
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categorias = useMemo(() => {
    const vistas = new Set<string>();
    const lista: string[] = [];
    for (const p of productos) {
      const categoria = p.categoria || "Otros";
      if (!vistas.has(categoria)) {
        vistas.add(categoria);
        lista.push(categoria);
      }
    }
    return lista;
  }, [productos]);

  const secciones = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = q ? productos.filter((p) => p.nombre.toLowerCase().includes(q)) : productos;
    const mapa = new Map<string, ProductoPublico[]>();
    for (const p of filtrados) {
      const categoria = p.categoria || "Otros";
      const lista = mapa.get(categoria) ?? [];
      lista.push(p);
      mapa.set(categoria, lista);
    }
    return Array.from(mapa.entries());
  }, [productos, busqueda]);

  const imagenesHero = useMemo(() => {
    const vistas = new Set<string>();
    const lista: string[] = [];
    for (const p of productos) {
      if (p.imagen_url && !vistas.has(p.imagen_url)) {
        vistas.add(p.imagen_url);
        lista.push(p.imagen_url);
      }
      if (lista.length >= 6) break;
    }
    return lista;
  }, [productos]);

  const [indiceHero, setIndiceHero] = useState(0);
  const indiceHeroSeguro = imagenesHero.length ? indiceHero % imagenesHero.length : 0;

  useEffect(() => {
    if (imagenesHero.length < 2) return;
    const id = setInterval(() => {
      setIndiceHero((i) => (i + 1) % imagenesHero.length);
    }, 4000);
    return () => clearInterval(id);
  }, [imagenesHero]);

  const primerWhatsapp = CONTACTOS_WHATSAPP[0]?.numero;

  return (
    <div className="min-h-screen bg-bg-app" id="inicio">
      <header className="sticky top-0 z-20 border-b border-border bg-bg-sidebar/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-4 sm:px-8">
          <a href="#inicio" className="flex shrink-0 items-center gap-2.5">
            <Image src="/logo.png" alt="Milu Beauty" width={36} height={36} className="h-9 w-9 rounded-xl object-cover" />
            <span className="text-base font-semibold text-text-primary sm:text-lg">Milu Beauty</span>
          </a>

          <nav className="hidden gap-1 lg:flex">
            <a
              href="#inicio"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
            >
              Inicio
            </a>
            {categorias.slice(0, 6).map((categoria) => (
              <a
                key={categoria}
                href={`#${slug(categoria)}`}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
              >
                {categoria}
              </a>
            ))}
          </nav>

          <div className="order-last flex w-full items-center gap-2 sm:order-none sm:ml-auto sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full rounded-lg border border-border bg-bg-surface-2 py-2 pl-9 pr-8 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-accent-soft via-bg-app to-bg-app">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-8 sm:py-16 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Belleza a tu alcance</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
              Descubre nuestros productos de maquillaje
            </h1>
            <p className="mt-3 text-text-secondary">
              Explora el catálogo por categorías y escríbenos para hacer tu pedido.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#productos"
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
              >
                Ver productos
              </a>
              {primerWhatsapp && (
                <a
                  href={`https://wa.me/${primerWhatsapp}?text=${mensajeWhatsapp()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-surface-2"
                >
                  <MessageCircle size={16} />
                  Escríbenos
                </a>
              )}
            </div>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-bg-surface shadow-sm">
            {imagenesHero.length === 0 ? (
              <Image src="/logo.png" alt="Milu Beauty" fill className="object-cover" />
            ) : (
              imagenesHero.map((src, i) => (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  fill
                  unoptimized
                  className={`object-cover transition-opacity duration-1000 ${i === indiceHeroSeguro ? "opacity-100" : "opacity-0"}`}
                />
              ))
            )}
            {imagenesHero.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {imagenesHero.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setIndiceHero(i)}
                    aria-label={`Ver imagen ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === indiceHeroSeguro ? "w-5 bg-white" : "w-1.5 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Comprar por categoría */}
      {categorias.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
          <p className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-text-muted">
            Comprar por categoría
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            {categorias.map((categoria, i) => {
              const Icono = ICONOS_CATEGORIA[i % ICONOS_CATEGORIA.length];
              return (
                <a
                  key={categoria}
                  href={`#${slug(categoria)}`}
                  className="flex w-20 flex-col items-center gap-2 text-center"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-surface-2 text-accent transition hover:bg-accent-soft">
                    <Icono size={22} />
                  </span>
                  <span className="text-xs font-medium text-text-secondary">{categoria}</span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Productos por sección */}
      <main id="productos" className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        {cargando ? (
          <p className="py-16 text-center text-sm text-text-muted">Cargando productos...</p>
        ) : secciones.length === 0 ? (
          <p className="py-16 text-center text-sm text-text-muted">
            {busqueda ? `No encontramos productos para "${busqueda}".` : "Todavía no hay productos publicados."}
          </p>
        ) : (
          <div className="space-y-12">
            {secciones.map(([categoria, items]) => (
              <section key={categoria} id={slug(categoria)} className="scroll-mt-20">
                <h2 className="mb-4 text-xl font-semibold text-text-primary">{categoria}</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((p) => {
                    const agotado = p.cantidad_actual <= 0;
                    return (
                      <div
                        key={p.id}
                        className="overflow-hidden rounded-2xl border border-border bg-bg-surface transition hover:border-accent/40 hover:shadow-sm"
                      >
                        <div className="relative aspect-square w-full bg-bg-surface-2">
                          {p.imagen_url ? (
                            <Image
                              src={p.imagen_url}
                              alt={p.nombre}
                              fill
                              unoptimized
                              className={`object-cover ${agotado ? "opacity-40 grayscale" : ""}`}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-text-muted">
                              <ImageOff size={28} />
                            </div>
                          )}
                          {agotado && (
                            <span className="absolute left-2 top-2 rounded-full bg-negative px-2.5 py-1 text-xs font-semibold text-white">
                              Agotado
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="truncate text-sm font-medium text-text-primary">{p.nombre}</p>
                          <p className="mt-0.5 text-sm font-semibold text-accent">{money(p.precio)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Contacto */}
      {CONTACTOS_WHATSAPP.length > 0 && (
        <section className="border-t border-border bg-bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-8">
            <h2 className="text-xl font-semibold text-text-primary">¿Te gustó algo?</h2>
            <p className="mt-1 text-text-secondary">Escríbenos por WhatsApp para hacer tu pedido.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {CONTACTOS_WHATSAPP.map((contacto) => (
                <a
                  key={contacto.numero}
                  href={`https://wa.me/${contacto.numero}?text=${mensajeWhatsapp()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
                >
                  <MessageCircle size={16} />
                  {contacto.etiqueta}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-bg-sidebar">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div>
              <a href="#inicio" className="flex items-center gap-2.5">
                <Image src="/logo.png" alt="Milu Beauty" width={36} height={36} className="h-9 w-9 rounded-xl object-cover" />
                <span className="text-base font-semibold text-text-primary">Milu Beauty</span>
              </a>
              <p className="mt-3 max-w-xs text-sm text-text-muted">
                Maquillaje de calidad, elegido con cariño para ti.
              </p>
            </div>

            {categorias.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-text-primary">Categorías</h3>
                <ul className="mt-3 space-y-2">
                  {categorias.map((categoria) => (
                    <li key={categoria}>
                      <a href={`#${slug(categoria)}`} className="text-sm text-text-muted hover:text-accent">
                        {categoria}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {CONTACTOS_WHATSAPP.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-text-primary">Contacto</h3>
                <ul className="mt-3 space-y-2">
                  {CONTACTOS_WHATSAPP.map((contacto) => (
                    <li key={contacto.numero}>
                      <a
                        href={`https://wa.me/${contacto.numero}?text=${mensajeWhatsapp()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent"
                      >
                        <MessageCircle size={14} />
                        {contacto.etiqueta}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-border pt-6 text-center text-xs text-text-muted">
            © {new Date().getFullYear()} Milu Beauty. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
