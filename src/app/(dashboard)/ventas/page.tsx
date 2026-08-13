"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VentaConDetalle } from "@/types/database";
import Modal from "@/components/Modal";
import VentaForm from "@/components/VentaForm";

function money(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fecha(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

export default function VentasPage() {
  const supabase = createClient();
  const [ventas, setVentas] = useState<VentaConDetalle[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalVenta, setModalVenta] = useState<"nueva" | VentaConDetalle | null>(null);
  const [detalle, setDetalle] = useState<VentaConDetalle | null>(null);

  async function cargar() {
    setCargando(true);
    const { data, error } = await supabase
      .from("ventas")
      .select("*, cliente:clientes(id,nombre), venta_items(*, producto:productos(id,nombre))")
      .order("fecha", { ascending: false });
    if (!error) setVentas((data as unknown as VentaConDetalle[]) ?? []);
    setCargando(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onGuardada() {
    setModalVenta(null);
    setDetalle(null);
    cargar();
  }

  async function eliminar(venta: VentaConDetalle) {
    if (!confirm("¿Eliminar esta venta? El stock de los productos vendidos se restituirá.")) return;
    const { error } = await supabase.rpc("eliminar_venta", { p_venta_id: venta.id });
    if (error) {
      alert("No se pudo eliminar: " + error.message);
      return;
    }
    setVentas((prev) => prev.filter((v) => v.id !== venta.id));
    setDetalle(null);
  }

  const totalHoy = ventas
    .filter((v) => new Date(v.fecha).toDateString() === new Date().toDateString())
    .reduce((acc, v) => acc + Number(v.total), 0);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Ventas</h1>
          <p className="text-sm text-text-muted">Vendido hoy: {money(totalHoy)}</p>
        </div>
        <button
          onClick={() => setModalVenta("nueva")}
          className="whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
        >
          + Nueva venta
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-bg-surface">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-bg-surface-2 text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Productos</th>
              <th className="px-4 py-3 font-medium">Total</th>
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
            {!cargando && ventas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  Todavía no hay ventas registradas.
                </td>
              </tr>
            )}
            {ventas.map((v) => (
              <tr key={v.id} className="hover:bg-bg-surface-2">
                <td className="px-4 py-3 text-text-secondary">{fecha(v.fecha)}</td>
                <td className="px-4 py-3 text-text-primary">{v.cliente?.nombre ?? "General"}</td>
                <td className="px-4 py-3 text-text-muted">
                  {v.venta_items.length} artículo{v.venta_items.length !== 1 ? "s" : ""}
                </td>
                <td className="px-4 py-3 font-medium text-text-primary">{money(Number(v.total))}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => setDetalle(v)} className="mr-3 text-accent hover:underline">
                    Ver detalle
                  </button>
                  <button onClick={() => setModalVenta(v)} className="mr-3 text-text-secondary hover:underline">
                    Editar
                  </button>
                  <button onClick={() => eliminar(v)} className="text-text-muted hover:text-negative hover:underline">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalVenta && (
        <Modal title={modalVenta === "nueva" ? "Nueva venta" : "Editar venta"} onClose={() => setModalVenta(null)} wide>
          <VentaForm venta={modalVenta === "nueva" ? null : modalVenta} onSaved={onGuardada} onCancel={() => setModalVenta(null)} />
        </Modal>
      )}

      {detalle && (
        <Modal title="Detalle de venta" onClose={() => setDetalle(null)}>
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-text-muted">Fecha: </span>
              {fecha(detalle.fecha)}
            </p>
            <p>
              <span className="text-text-muted">Cliente: </span>
              {detalle.cliente?.nombre ?? "General"}
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left">
                <thead className="bg-bg-surface-2 text-text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Producto</th>
                    <th className="px-3 py-2 font-medium">Cant.</th>
                    <th className="px-3 py-2 font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {detalle.venta_items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">{item.producto?.nombre}</td>
                      <td className="px-3 py-2">{item.cantidad}</td>
                      <td className="px-3 py-2">{money(Number(item.subtotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-medium text-text-secondary">Total</span>
              <span className="text-lg font-semibold text-accent">{money(Number(detalle.total))}</span>
            </div>
            <div className="flex justify-end gap-4">
              <button onClick={() => setModalVenta(detalle)} className="text-sm text-accent hover:underline">
                Editar esta venta
              </button>
              <button onClick={() => eliminar(detalle)} className="text-sm text-negative hover:underline">
                Eliminar esta venta
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
