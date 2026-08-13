"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutGrid, ShoppingBag, Users, Package, Menu, X, ChevronsUpDown, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "/estadisticas", label: "Estadísticas", icon: LayoutGrid },
  { href: "/ventas", label: "Ventas", icon: ShoppingBag },
  { href: "/inventario", label: "Inventario", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
];

function iniciales(email: string) {
  return email.slice(0, 2).toUpperCase();
}

function SidebarContent({ email, onNavigate }: { email: string | null; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuAbierto, setMenuAbierto] = useState(false);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col bg-bg-sidebar">
      <div className="flex items-center gap-3 px-5 py-5">
        <Image src="/logo.png" alt="Milu Beauty" width={36} height={36} className="h-9 w-9 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">Milu Beauty</p>
          <p className="truncate text-xs text-text-muted">Panel de ventas</p>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {LINKS.map((link) => {
          const activo = pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                activo
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
              }`}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-border p-3">
        {menuAbierto && (
          <button
            onClick={cerrarSesion}
            className="mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-negative hover:bg-bg-surface-2"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        )}
        <button
          onClick={() => setMenuAbierto((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-bg-surface-2"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
            {email ? iniciales(email) : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">{email ?? "Cuenta"}</p>
          </div>
          <ChevronsUpDown size={15} className="shrink-0 text-text-muted" />
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ email }: { email: string | null }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      {/* Barra superior móvil */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg-sidebar px-4 py-3 sm:hidden">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Milu Beauty" width={28} height={28} className="h-7 w-7 shrink-0 rounded-lg object-cover" />
          <span className="text-sm font-semibold text-text-primary">Milu Beauty</span>
        </div>
        <button
          onClick={() => setAbierto(true)}
          className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-surface-2"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Sidebar fija en escritorio */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border sm:block">
        <SidebarContent email={email} />
      </aside>

      {/* Panel deslizante en móvil */}
      {abierto && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAbierto(false)} />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-border shadow-xl">
            <div className="flex justify-end p-3">
              <button
                onClick={() => setAbierto(false)}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-surface-2"
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>
            <SidebarContent email={email} onNavigate={() => setAbierto(false)} />
          </div>
        </div>
      )}
    </>
  );
}
