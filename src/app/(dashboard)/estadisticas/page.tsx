"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import type { VentaConDetalle } from "@/types/database";

function money(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

const RANGOS = [
  { id: "7", label: "Últimos 7 días", dias: 7 },
  { id: "30", label: "Últimos 30 días", dias: 30 },
  { id: "90", label: "Últimos 90 días", dias: 90 },
  { id: "all", label: "Todo" },
] as const;

export default function EstadisticasPage() {
  const supabase = createClient();
  const [ventas, setVentas] = useState<VentaConDetalle[]>([]);
  const [cargando, setCargando] = useState(true);
  const [rango, setRango] = useState<(typeof RANGOS)[number]["id"]>("30");

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from("ventas")
        .select("*, cliente:clientes(id,nombre), venta_items(*, producto:productos(id,nombre))")
        .order("fecha", { ascending: true });
      if (!error) setVentas((data as unknown as VentaConDetalle[]) ?? []);
      setCargando(false);
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ventasFiltradas = useMemo(() => {
    const rangoDef = RANGOS.find((r) => r.id === rango);
    if (!rangoDef || !("dias" in rangoDef)) return ventas;
    const desde = new Date();
    desde.setDate(desde.getDate() - rangoDef.dias);
    return ventas.filter((v) => new Date(v.fecha) >= desde);
  }, [ventas, rango]);

  const resumen = useMemo(() => {
    let ingresos = 0;
    let costo = 0;
    for (const v of ventasFiltradas) {
      for (const item of v.venta_items) {
        ingresos += Number(item.subtotal);
        costo += Number(item.costo_unitario) * item.cantidad;
      }
    }
    return { ingresos, costo, ganancia: ingresos - costo };
  }, [ventasFiltradas]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, { ventas: number; ganancia: number }>();
    for (const v of ventasFiltradas) {
      const dia = new Date(v.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
      const costoVenta = v.venta_items.reduce((acc, i) => acc + Number(i.costo_unitario) * i.cantidad, 0);
      const actual = mapa.get(dia) ?? { ventas: 0, ganancia: 0 };
      actual.ventas += Number(v.total);
      actual.ganancia += Number(v.total) - costoVenta;
      mapa.set(dia, actual);
    }
    return Array.from(mapa.entries()).map(([dia, valores]) => ({ dia, ...valores }));
  }, [ventasFiltradas]);

  const topProductos = useMemo(() => {
    const mapa = new Map<string, { nombre: string; ingresos: number }>();
    for (const v of ventasFiltradas) {
      for (const item of v.venta_items) {
        const nombre = item.producto?.nombre ?? "Producto";
        const actual = mapa.get(item.producto_id) ?? { nombre, ingresos: 0 };
        actual.ingresos += Number(item.subtotal);
        mapa.set(item.producto_id, actual);
      }
    }
    return Array.from(mapa.values())
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 6);
  }, [ventasFiltradas]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Estadísticas</h1>
        <div className="flex gap-1 rounded-lg bg-bg-surface p-1 ring-1 ring-border">
          {RANGOS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRango(r.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                rango === r.id ? "bg-accent text-accent-foreground" : "text-text-muted hover:bg-bg-surface-2"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <p className="mt-8 text-center text-sm text-text-muted">Cargando...</p>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-bg-surface p-5">
              <p className="text-sm text-text-muted">Ventas totales</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{money(resumen.ingresos)}</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-surface p-5">
              <p className="text-sm text-text-muted">Costo de mercancía vendida</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{money(resumen.costo)}</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-surface p-5">
              <p className="text-sm text-text-muted">Ganancia</p>
              <p className={`mt-1 text-2xl font-semibold ${resumen.ganancia >= 0 ? "text-positive" : "text-negative"}`}>
                {money(resumen.ganancia)}
              </p>
            </div>
          </div>

          {/* Ventas y ganancia por día */}
          <div className="mt-6 rounded-xl border border-border bg-bg-surface p-5">
            <p className="mb-4 text-sm font-medium text-text-secondary">Ventas por día</p>
            {porDia.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-muted">No hay ventas en este periodo.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={porDia} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => money(v)}
                    width={70}
                  />
                  <Tooltip
                    formatter={(value) => money(Number(value))}
                    contentStyle={{
                      borderRadius: 8,
                      borderColor: "var(--chart-tooltip-border)",
                      backgroundColor: "var(--chart-tooltip-bg)",
                      color: "var(--color-text-primary)",
                      fontSize: 13,
                    }}
                    labelStyle={{ color: "var(--color-text-secondary)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ventas"
                    name="Ventas"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    fill="url(#colorVentas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top productos */}
          <div className="mt-6 rounded-xl border border-border bg-bg-surface p-5">
            <p className="mb-4 text-sm font-medium text-text-secondary">Productos más vendidos (por ingresos)</p>
            {topProductos.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-muted">No hay ventas en este periodo.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, topProductos.length * 44)}>
                <BarChart
                  data={topProductos}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                  barCategoryGap={12}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => money(v)}
                    tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
                    axisLine={false}
                    tickLine={false}
                    width={140}
                  />
                  <Tooltip
                    formatter={(value) => money(Number(value))}
                    contentStyle={{
                      borderRadius: 8,
                      borderColor: "var(--chart-tooltip-border)",
                      backgroundColor: "var(--chart-tooltip-bg)",
                      color: "var(--color-text-primary)",
                      fontSize: 13,
                    }}
                    labelStyle={{ color: "var(--color-text-secondary)" }}
                    cursor={{ fill: "var(--color-bg-surface-2)" }}
                  />
                  <Bar dataKey="ingresos" name="Ingresos" fill="var(--color-accent)" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}
