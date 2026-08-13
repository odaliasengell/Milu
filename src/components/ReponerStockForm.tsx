"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Producto } from "@/types/database";

export default function ReponerStockForm({
  producto,
  onSaved,
  onCancel,
}: {
  producto: Producto;
  onSaved: (producto: Producto) => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const [cantidad, setCantidad] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cant = Math.floor(Number(cantidad));

    if (!cant || cant <= 0) {
      setError("Ingresa una cantidad válida mayor a 0.");
      return;
    }

    setGuardando(true);
    const { error } = await supabase.rpc("reponer_stock", {
      p_producto_id: producto.id,
      p_cantidad: cant,
    });

    if (error) {
      setGuardando(false);
      setError(error.message);
      return;
    }

    const { data, error: fetchError } = await supabase.from("productos").select("*").eq("id", producto.id).single();
    setGuardando(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    onSaved(data as Producto);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-text-secondary">
        Registrando entrada de mercancía para <span className="font-medium text-text-primary">{producto.nombre}</span>.
        Stock actual: <span className="font-medium">{producto.cantidad_actual}</span>.
      </p>
      <div>
        <label className="block text-sm font-medium text-text-secondary">Cantidad que ingresa</label>
        <input
          autoFocus
          type="number"
          min="1"
          step="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Ej. 12"
        />
      </div>

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
          {guardando ? "Guardando..." : "Registrar entrada"}
        </button>
      </div>
    </form>
  );
}
