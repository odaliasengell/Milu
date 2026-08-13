import type { Metadata } from "next";
import CatalogoClient from "./CatalogoClient";

export const metadata: Metadata = {
  title: "Milu Beauty — Catálogo",
  description: "Descubre nuestros productos de maquillaje y haz tu pedido por WhatsApp.",
  openGraph: {
    title: "Milu Beauty",
    description: "Descubre nuestros productos de maquillaje y haz tu pedido por WhatsApp.",
    images: ["/logo.png"],
  },
};

export default function CatalogoPage() {
  return <CatalogoClient />;
}
