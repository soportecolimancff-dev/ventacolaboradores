/**
 * app/tienda/[slug]/layout.tsx
 * Layout del catálogo: provee el contexto del carrito.
 * El `key` basado en el slug fuerza re-mount del CarritoProvider al cambiar
 * de sucursal, vaciando el carrito automáticamente.
 */
import { type ReactNode } from "react";
import { CarritoProvider } from "@/context/CarritoContext";

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function TiendaSlugLayout({ children, params }: Props) {
  const { slug } = await params;
  return <CarritoProvider key={slug}>{children}</CarritoProvider>;
}
