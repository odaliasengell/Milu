"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

function leerTemaGuardado(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function ThemeToggle() {
  const [tema, setTema] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTema(leerTemaGuardado());
  }, []);

  function alternar() {
    const nuevo = tema === "dark" ? "light" : "dark";
    setTema(nuevo);
    document.documentElement.classList.toggle("dark", nuevo === "dark");
    localStorage.setItem("theme", nuevo);
  }

  return (
    <button
      onClick={alternar}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition hover:bg-bg-surface-2 hover:text-text-primary"
      aria-label="Cambiar tema"
      title={tema === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {tema === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
