"use client";
/**
 * components/tienda/CatalogoCliente.tsx
 * Contenedor interactivo del catálogo para reflejar stock en tiempo real
 * cuando se realiza un pedido.
 */
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProductoCatalogo } from "@/types/tienda";
import ProductoCard from "./ProductoCard";
import CarritoDrawer from "./CarritoDrawer";

interface Props {
  sucursalId: number;
  sucursalNombre: string;
  slug: string;
  productosIniciales: ProductoCatalogo[];
  limiteCompra: number | null;
  cantidadMaxima: number | null;
}

export default function CatalogoCliente({
  sucursalId,
  sucursalNombre,
  slug,
  productosIniciales,
  limiteCompra,
  cantidadMaxima,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [productos, setProductos] = useState<ProductoCatalogo[]>(productosIniciales);

  // Sincronizar si cambian los props del servidor
  useEffect(() => {
    setProductos(productosIniciales);
  }, [productosIniciales]);

  // Función para refrescar el catálogo y el stock inmediatamente después de hacer un pedido
  const handlePedidoExitoso = async () => {
    // 1. Refrescar server components con router.refresh()
    startTransition(() => {
      router.refresh();
    });

    // 2. Fetch directo al endpoint del catálogo para actualizar el estado del cliente al instante
    try {
      const res = await fetch(`/api/catalogo/${slug}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.productos)) {
          setProductos(data.productos);
        }
      }
    } catch {
      // Si falla fetch, router.refresh() se encargará
    }
  };

  return (
    <>
      <section className="mx-auto max-w-2xl px-4 pt-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Productos disponibles esta semana
        </h2>

        {productos.length === 0 ? (
          <div className="mt-20 text-center text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p>No hay productos disponibles esta semana.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {productos.map((p) => (
              <ProductoCard
                key={p.productoSucursalId}
                producto={p}
                limiteCompra={limiteCompra}
                cantidadMaxima={cantidadMaxima}
              />
            ))}
          </div>
        )}
      </section>

      {/* Carrito flotante con callback de éxito */}
      <CarritoDrawer
        sucursalId={sucursalId}
        sucursalNombre={sucursalNombre}
        onPedidoExitoso={handlePedidoExitoso}
      />
    </>
  );
}
