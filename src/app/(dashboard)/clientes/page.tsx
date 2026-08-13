"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Cliente } from "@/types/database";
import Modal from "@/components/Modal";
import ClienteForm from "@/components/ClienteForm";

export default function ClientesPage() {
  const supabase = createClient();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);

  async function cargar() {
    const { data } = await supabase.from("clientes").select("*").order("nombre");
    setClientes((data as Cliente[]) ?? []);
    setCargando(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function eliminar(cliente: Cliente) {
    if (!confirm(`¿Eliminar a "${cliente.nombre}"? Sus ventas anteriores no se eliminarán.`)) return;
    const { error } = await supabase.from("clientes").delete().eq("id", cliente.id);
    if (error) {
      alert("No se pudo eliminar: " + error.message);
      return;
    }
    setClientes((prev) => prev.filter((c) => c.id !== cliente.id));
  }

  function abrirNuevo() {
    setEditando(null);
    setModalAbierto(true);
  }

  function abrirEditar(cliente: Cliente) {
    setEditando(cliente);
    setModalAbierto(true);
  }

  function onGuardado(cliente: Cliente) {
    setClientes((prev) => {
      const existe = prev.some((c) => c.id === cliente.id);
      const nueva = existe ? prev.map((c) => (c.id === cliente.id ? cliente : c)) : [...prev, cliente];
      return nueva.sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
    setModalAbierto(false);
  }

  const filtrados = clientes.filter((c) =>
    [c.nombre, c.telefono, c.email].filter(Boolean).some((v) => v!.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Clientes</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cliente..."
              className="rounded-lg border border-border bg-bg-surface-2 py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <button
            onClick={abrirNuevo}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
          >
            <Plus size={16} />
            Nuevo cliente
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-bg-surface">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-bg-surface-2 text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Notas</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cargando && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  Cargando...
                </td>
              </tr>
            )}
            {!cargando && filtrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  No hay clientes todavía.
                </td>
              </tr>
            )}
            {filtrados.map((c) => (
              <tr key={c.id} className="hover:bg-bg-surface-2">
                <td className="px-4 py-3 font-medium text-text-primary">{c.nombre}</td>
                <td className="px-4 py-3 text-text-secondary">{c.telefono || "—"}</td>
                <td className="px-4 py-3 text-text-secondary">{c.email || "—"}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-text-muted">{c.notas || "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => abrirEditar(c)}
                      title="Editar"
                      aria-label="Editar"
                      className="rounded-lg p-2 text-text-muted hover:bg-bg-surface-2 hover:text-text-primary"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => eliminar(c)}
                      title="Eliminar"
                      aria-label="Eliminar"
                      className="rounded-lg p-2 text-text-muted hover:bg-negative/10 hover:text-negative"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <Modal title={editando ? "Editar cliente" : "Nuevo cliente"} onClose={() => setModalAbierto(false)}>
          <ClienteForm cliente={editando} onSaved={onGuardado} onCancel={() => setModalAbierto(false)} />
        </Modal>
      )}
    </div>
  );
}
