"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Producto } from "@/types/database";

const CATEGORIAS = ["Cejas", "Labios", "Rostro", "Pestañas", "Herramientas", "Otro"];

export default function ProductoForm({
  producto,
  onSaved,
  onCancel,
}: {
  producto?: Producto | null;
  onSaved: (producto: Producto) => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [categoria, setCategoria] = useState(producto?.categoria ?? CATEGORIAS[0]);
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? "");
  const [costo, setCosto] = useState(producto?.costo?.toString() ?? "");
  const [precio, setPrecio] = useState(producto?.precio?.toString() ?? "");
  const [cantidadInicial, setCantidadInicial] = useState("0");
  const [visibleCatalogo, setVisibleCatalogo] = useState(producto?.visible_catalogo ?? false);

  const [imagenActual, setImagenActual] = useState<string | null>(producto?.imagen_url ?? null);
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(producto?.imagen_url ?? null);

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function elegirImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen.");
      return;
    }
    setError(null);
    setImagenFile(file);
    setImagenPreview(URL.createObjectURL(file));
  }

  function quitarImagen() {
    setImagenFile(null);
    setImagenPreview(null);
    setImagenActual(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    const costoNum = Number(costo) || 0;
    const precioNum = Number(precio) || 0;
    const inicialNum = Math.max(0, Math.floor(Number(cantidadInicial) || 0));

    setGuardando(true);

    let imagenUrl = imagenActual;

    if (imagenFile) {
      const ext = imagenFile.name.split(".").pop() || "jpg";
      const ruta = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("productos").upload(ruta, imagenFile, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) {
        setGuardando(false);
        setError("No se pudo subir la imagen: " + uploadError.message);
        return;
      }
      imagenUrl = supabase.storage.from("productos").getPublicUrl(ruta).data.publicUrl;
    }

    if (producto) {
      const { data, error } = await supabase
        .from("productos")
        .update({
          nombre: nombre.trim(),
          categoria,
          descripcion: descripcion.trim() || null,
          costo: costoNum,
          precio: precioNum,
          visible_catalogo: visibleCatalogo,
          imagen_url: imagenUrl,
        })
        .eq("id", producto.id)
        .select()
        .single();
      setGuardando(false);
      if (error) {
        setError(error.message);
        return;
      }
      onSaved(data as Producto);
    } else {
      const { data, error } = await supabase
        .from("productos")
        .insert({
          nombre: nombre.trim(),
          categoria,
          descripcion: descripcion.trim() || null,
          costo: costoNum,
          precio: precioNum,
          cantidad_ingresada: inicialNum,
          cantidad_actual: inicialNum,
          visible_catalogo: visibleCatalogo,
          imagen_url: imagenUrl,
        })
        .select()
        .single();
      setGuardando(false);
      if (error) {
        setError(error.message);
        return;
      }
      onSaved(data as Producto);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary">Foto del producto</label>
        <div className="mt-1 flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-bg-surface-2">
            {imagenPreview ? (
              <Image src={imagenPreview} alt="" width={64} height={64} unoptimized className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-text-muted">Sin foto</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-surface-2">
              {imagenPreview ? "Cambiar foto" : "Subir foto"}
              <input type="file" accept="image/*" onChange={elegirImagen} className="hidden" />
            </label>
            {imagenPreview && (
              <button
                type="button"
                onClick={quitarImagen}
                className="text-left text-xs text-text-muted hover:text-negative"
              >
                Quitar foto
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary">Nombre *</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Base líquida mate"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary">Categoría</label>
        <select
          value={categoria ?? ""}
          onChange={(e) => setCategoria(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Describe el producto: acabado, tono, beneficios..."
        />
        <p className="mt-1 text-xs text-text-muted">Se mostrará en el catálogo público, debajo del producto.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-text-secondary">Costo</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary">Precio de venta</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="0.00"
          />
        </div>
      </div>

      {!producto && (
        <div>
          <label className="block text-sm font-medium text-text-secondary">Cantidad inicial en stock</label>
          <input
            type="number"
            min="0"
            step="1"
            value={cantidadInicial}
            onChange={(e) => setCantidadInicial(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <p className="mt-1 text-xs text-text-muted">
            Después podrás registrar nuevas entradas de mercancía desde &quot;Reponer stock&quot;.
          </p>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={visibleCatalogo}
          onChange={(e) => setVisibleCatalogo(e.target.checked)}
          className="h-4 w-4 rounded accent-accent"
        />
        Mostrar en el catálogo público
      </label>

      {error && <p className="rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-surface-2"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
        >
          {guardando ? "Guardando..." : producto ? "Guardar cambios" : "Agregar producto"}
        </button>
      </div>
    </form>
  );
}
