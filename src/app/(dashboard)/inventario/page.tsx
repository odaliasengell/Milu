"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Producto } from "@/types/database";
import Modal from "@/components/Modal";
import ProductoForm from "@/components/ProductoForm";
import ReponerStockForm from "@/components/ReponerStockForm";

function money(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

export default function InventarioPage() {
  const supabase = createClient();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [modalProducto, setModalProducto] = useState<"nuevo" | Producto | null>(null);
  const [modalReponer, setModalReponer] = useState<Producto | null>(null);

  async function cargar() {
    const { data } = await supabase.from("productos").select("*").order("nombre");
    setProductos((data as Producto[]) ?? []);
    setCargando(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function eliminar(producto: Producto) {
    if (!confirm(`¿Eliminar "${producto.nombre}" del inventario?`)) return;
    const { error } = await supabase.from("productos").delete().eq("id", producto.id);
    if (error) {
      alert("No se pudo eliminar (puede tener ventas asociadas): " + error.message);
      return;
    }
    setProductos((prev) => prev.filter((p) => p.id !== producto.id));
  }

  function onGuardadoProducto(producto: Producto) {
    setProductos((prev) => {
      const existe = prev.some((p) => p.id === producto.id);
      const nueva = existe ? prev.map((p) => (p.id === producto.id ? producto : p)) : [...prev, producto];
      return nueva.sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
    setModalProducto(null);
  }

  function onStockRepuesto(producto: Producto) {
    setProductos((prev) => prev.map((p) => (p.id === producto.id ? producto : p)));
    setModalReponer(null);
  }

  const filtrados = productos.filter((p) =>
    [p.nombre, p.categoria].filter(Boolean).some((v) => v!.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const valorInventario = productos.reduce((acc, p) => acc + p.cantidad_actual * p.costo, 0);
  const enCatalogo = productos.filter((p) => p.visible_catalogo).length;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Inventario</h1>
          <p className="text-sm text-text-muted">
            Valor del inventario actual: {money(valorInventario)} · {enCatalogo} en el catálogo público
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <Link
            href="/catalogo"
            target="_blank"
            className="whitespace-nowrap rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-surface-2"
          >
            Ver catálogo
          </Link>
          <button
            onClick={() => setModalProducto("nuevo")}
            className="whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
          >
            + Nuevo producto
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-bg-surface">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-bg-surface-2 text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Costo</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium" title="Ingresado / Disponible actual">
                Stock (ingresado/actual)
              </th>
              <th className="px-4 py-3 font-medium">Catálogo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cargando && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-text-muted">
                  Cargando...
                </td>
              </tr>
            )}
            {!cargando && filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-text-muted">
                  No hay productos todavía.
                </td>
              </tr>
            )}
            {filtrados.map((p) => {
              const bajo = p.cantidad_actual <= 0;
              const escaso = !bajo && p.cantidad_actual <= Math.max(2, Math.ceil(p.cantidad_ingresada * 0.15));
              return (
                <tr key={p.id} className="hover:bg-bg-surface-2">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-bg-surface-2">
                        {p.imagen_url ? (
                          <Image src={p.imagen_url} alt="" width={36} height={36} unoptimized className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-text-muted">—</span>
                        )}
                      </div>
                      <span className="font-medium text-text-primary">{p.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{p.categoria || "—"}</td>
                  <td className="px-4 py-3 text-text-secondary">{money(p.costo)}</td>
                  <td className="px-4 py-3 text-text-secondary">{money(p.precio)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        bajo
                          ? "bg-negative/15 text-negative"
                          : escaso
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-positive/15 text-positive"
                      }`}
                    >
                      {p.cantidad_ingresada}/{p.cantidad_actual}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        p.visible_catalogo ? "bg-accent-soft text-accent" : "bg-bg-surface-2 text-text-muted"
                      }`}
                    >
                      {p.visible_catalogo ? "Visible" : "Oculto"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setModalReponer(p)} className="mr-3 text-accent hover:underline">
                      Reponer stock
                    </button>
                    <button onClick={() => setModalProducto(p)} className="mr-3 text-text-muted hover:underline">
                      Editar
                    </button>
                    <button onClick={() => eliminar(p)} className="text-text-muted hover:text-negative hover:underline">
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalProducto && (
        <Modal
          title={modalProducto === "nuevo" ? "Nuevo producto" : "Editar producto"}
          onClose={() => setModalProducto(null)}
        >
          <ProductoForm
            producto={modalProducto === "nuevo" ? null : modalProducto}
            onSaved={onGuardadoProducto}
            onCancel={() => setModalProducto(null)}
          />
        </Modal>
      )}

      {modalReponer && (
        <Modal title="Reponer stock" onClose={() => setModalReponer(null)}>
          <ReponerStockForm producto={modalReponer} onSaved={onStockRepuesto} onCancel={() => setModalReponer(null)} />
        </Modal>
      )}
    </div>
  );
}
