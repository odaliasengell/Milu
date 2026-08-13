"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Cliente, Producto, VentaConDetalle } from "@/types/database";
import ClienteForm from "@/components/ClienteForm";

function money(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

type ItemCarrito = {
  producto: Producto;
  cantidad: number;
};

export default function VentaForm({
  venta,
  onSaved,
  onCancel,
}: {
  venta?: VentaConDetalle | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const editando = !!venta;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [clienteId, setClienteId] = useState<string>("");
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);

  const [productoSeleccionado, setProductoSeleccionado] = useState<string>("");
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState("1");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function cargar() {
      const [{ data: clientesData }, { data: productosData }] = await Promise.all([
        supabase.from("clientes").select("*").order("nombre"),
        supabase.from("productos").select("*").order("nombre"),
      ]);
      const listaProductos = (productosData as Producto[]) ?? [];
      setClientes((clientesData as Cliente[]) ?? []);

      if (venta) {
        // Al editar, el stock que ya estaba reservado por esta venta se
        // trata como disponible de nuevo, para poder mantenerlo o ajustarlo.
        const ajustados = listaProductos.map((p) => {
          const item = venta.venta_items.find((i) => i.producto_id === p.id);
          return item ? { ...p, cantidad_actual: p.cantidad_actual + item.cantidad } : p;
        });
        setProductos(ajustados);
        setClienteId(venta.cliente_id ?? "");
        setCarrito(
          venta.venta_items
            .map((item) => {
              const producto = ajustados.find((p) => p.id === item.producto_id);
              return producto ? { producto, cantidad: item.cantidad } : null;
            })
            .filter((i): i is ItemCarrito => i !== null)
        );
      } else {
        setProductos(listaProductos);
      }

      setCargandoDatos(false);
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productosDisponibles = productos.filter((p) => p.cantidad_actual > 0);

  const total = useMemo(
    () => carrito.reduce((acc, item) => acc + item.cantidad * item.producto.precio, 0),
    [carrito]
  );

  function stockDisponibleEnCarrito(producto: Producto) {
    const enCarrito = carrito.find((i) => i.producto.id === producto.id)?.cantidad ?? 0;
    return producto.cantidad_actual - enCarrito;
  }

  function agregarAlCarrito() {
    setError(null);
    const producto = productos.find((p) => p.id === productoSeleccionado);
    const cantidad = Math.floor(Number(cantidadSeleccionada));

    if (!producto) {
      setError("Selecciona un producto.");
      return;
    }
    if (!cantidad || cantidad <= 0) {
      setError("Ingresa una cantidad válida.");
      return;
    }
    if (cantidad > stockDisponibleEnCarrito(producto)) {
      setError(`Solo hay ${stockDisponibleEnCarrito(producto)} disponibles de "${producto.nombre}".`);
      return;
    }

    setCarrito((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) {
        return prev.map((i) => (i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + cantidad } : i));
      }
      return [...prev, { producto, cantidad }];
    });
    setProductoSeleccionado("");
    setCantidadSeleccionada("1");
  }

  function quitarDelCarrito(productoId: string) {
    setCarrito((prev) => prev.filter((i) => i.producto.id !== productoId));
  }

  function onClienteCreado(cliente: Cliente) {
    setClientes((prev) => [...prev, cliente].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setClienteId(cliente.id);
    setMostrarNuevoCliente(false);
  }

  async function confirmarVenta() {
    setError(null);
    if (carrito.length === 0) {
      setError("Agrega al menos un producto a la venta.");
      return;
    }

    setGuardando(true);
    const items = carrito.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad }));
    const { error } = editando
      ? await supabase.rpc("editar_venta", {
          p_venta_id: venta!.id,
          p_cliente_id: clienteId || null,
          p_items: items,
        })
      : await supabase.rpc("crear_venta", {
          p_cliente_id: clienteId || null,
          p_items: items,
        });
    setGuardando(false);

    if (error) {
      setError(error.message);
      return;
    }

    onSaved();
  }

  if (cargandoDatos) {
    return <p className="py-8 text-center text-sm text-text-muted">Cargando datos...</p>;
  }

  return (
    <div className="space-y-5">
      {/* Cliente */}
      <div>
        <label className="block text-sm font-medium text-text-secondary">Cliente</label>
        {!mostrarNuevoCliente ? (
          <div className="mt-1 flex gap-2">
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Cliente general / sin especificar</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setMostrarNuevoCliente(true)}
              className="whitespace-nowrap rounded-lg border border-accent/40 px-3 py-2 text-sm font-medium text-accent hover:bg-accent-soft"
            >
              + Nuevo
            </button>
          </div>
        ) : (
          <div className="mt-2 rounded-lg border border-border bg-bg-surface-2 p-3">
            <p className="mb-2 text-sm font-medium text-text-secondary">Nuevo cliente</p>
            <ClienteForm onSaved={onClienteCreado} onCancel={() => setMostrarNuevoCliente(false)} />
          </div>
        )}
      </div>

      {!mostrarNuevoCliente && (
        <>
          {/* Agregar producto */}
          <div>
            <label className="block text-sm font-medium text-text-secondary">Agregar producto</label>
            <div className="mt-1 flex gap-2">
              <select
                value={productoSeleccionado}
                onChange={(e) => setProductoSeleccionado(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Selecciona un producto...</option>
                {productosDisponibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — {money(p.precio)} (disp. {stockDisponibleEnCarrito(p)})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                step="1"
                value={cantidadSeleccionada}
                onChange={(e) => setCantidadSeleccionada(e.target.value)}
                className="w-20 rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="button"
                onClick={agregarAlCarrito}
                className="whitespace-nowrap rounded-lg border border-accent/40 px-3 py-2 text-sm font-medium text-accent hover:bg-accent-soft"
              >
                Agregar
              </button>
            </div>
            {productosDisponibles.length === 0 && (
              <p className="mt-1 text-xs text-text-muted">No hay productos con stock disponible.</p>
            )}
          </div>

          {/* Carrito */}
          <div>
            <p className="mb-2 text-sm font-medium text-text-secondary">Productos en la venta</p>
            {carrito.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-text-muted">
                Aún no agregas productos.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-surface-2 text-text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Producto</th>
                      <th className="px-3 py-2 font-medium">Cant.</th>
                      <th className="px-3 py-2 font-medium">Precio</th>
                      <th className="px-3 py-2 font-medium">Subtotal</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {carrito.map((item) => (
                      <tr key={item.producto.id}>
                        <td className="px-3 py-2">{item.producto.nombre}</td>
                        <td className="px-3 py-2">{item.cantidad}</td>
                        <td className="px-3 py-2">{money(item.producto.precio)}</td>
                        <td className="px-3 py-2">{money(item.cantidad * item.producto.precio)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => quitarDelCarrito(item.producto.id)}
                            className="text-text-muted hover:text-negative"
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium text-text-secondary">Total</span>
            <span className="text-xl font-semibold text-accent">{money(total)}</span>
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
              type="button"
              disabled={guardando || carrito.length === 0}
              onClick={confirmarVenta}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
            >
              {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Registrar venta"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
