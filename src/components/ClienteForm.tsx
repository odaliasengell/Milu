"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Cliente } from "@/types/database";

export default function ClienteForm({
  cliente,
  onSaved,
  onCancel,
}: {
  cliente?: Cliente | null;
  onSaved: (cliente: Cliente) => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const [nombre, setNombre] = useState(cliente?.nombre ?? "");
  const [telefono, setTelefono] = useState(cliente?.telefono ?? "");
  const [email, setEmail] = useState(cliente?.email ?? "");
  const [notas, setNotas] = useState(cliente?.notas ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setGuardando(true);

    const payload = {
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      notas: notas.trim() || null,
    };

    const query = cliente
      ? supabase.from("clientes").update(payload).eq("id", cliente.id).select().single()
      : supabase.from("clientes").insert(payload).select().single();

    const { data, error } = await query;

    setGuardando(false);

    if (error) {
      setError(error.message);
      return;
    }

    onSaved(data as Cliente);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary">Nombre *</label>
        <input
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Nombre del cliente"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary">Teléfono</label>
        <input
          value={telefono ?? ""}
          onChange={(e) => setTelefono(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="55 1234 5678"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary">Correo</label>
        <input
          type="email"
          value={email ?? ""}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="correo@ejemplo.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary">Notas</label>
        <textarea
          value={notas ?? ""}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Preferencias, dirección, etc."
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
          {guardando ? "Guardando..." : cliente ? "Guardar cambios" : "Agregar cliente"}
        </button>
      </div>
    </form>
  );
}
