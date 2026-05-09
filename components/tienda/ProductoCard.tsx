"use client";
/**
 * components/tienda/ProductoCard.tsx
 * Tarjeta de producto con control de cantidad +/- y validación en tiempo real.
 */
import type { ProductoCatalogo } from "@/types/tienda";
import { useCarrito } from "@/context/CarritoContext";
import ControlCantidad from "./ControlCantidad";

interface Props {
  producto: ProductoCatalogo;
  limiteCompra: number | null;
  cantidadMaxima: number | null;
}

export default function ProductoCard({ producto, limiteCompra, cantidadMaxima }: Props) {
  const { items, agregar, setCantidad, total, itemCount } = useCarrito();

  const itemEnCarrito = items.find(
    (i) => i.productoSucursalId === producto.productoSucursalId
  );
  const cantidad = itemEnCarrito?.cantidad ?? 0;

  // ¿Puede el usuario agregar una unidad más?
  const puedeAgregar =
    cantidad < producto.maxCantidad &&
    (limiteCompra === null || total + producto.precio <= limiteCompra) &&
    (cantidadMaxima === null || itemCount + 1 <= cantidadMaxima);

  const handleAgregar = () => {
    if (!itemEnCarrito) {
      agregar({
        productoSucursalId: producto.productoSucursalId,
        productoId: producto.productoId,
        nombre: producto.nombre,
        precio: producto.precio,
        maxCantidad: producto.maxCantidad,
      });
    } else {
      setCantidad(producto.productoSucursalId, cantidad + 1);
    }
  };

  const handleRestar = () => {
    setCantidad(producto.productoSucursalId, cantidad - 1);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:shadow-md">
      {/* Icono / Emoji */}
      <div className="flex h-36 w-full items-center justify-center bg-linear-to-br from-green-50 to-emerald-100">
        <span className="text-7xl drop-shadow-sm">
          {producto.imagenUrl || "🍎"}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-bold text-gray-900">{producto.nombre}</h3>
        {producto.descripcion && (
          <p className="text-xs text-gray-500">{producto.descripcion}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-extrabold text-green-700">
            ${producto.precio.toFixed(2)}
          </span>

          {cantidad === 0 ? (
            <button
              onClick={handleAgregar}
              disabled={!puedeAgregar}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition
                hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
            >
              Agregar
            </button>
          ) : (
            <ControlCantidad
              cantidad={cantidad}
              max={producto.maxCantidad}
              puedeAgregar={puedeAgregar}
              onSumar={handleAgregar}
              onRestar={handleRestar}
            />
          )}
        </div>

        {cantidad === producto.maxCantidad && (
          <p className="text-xs text-amber-600">
            Máximo {producto.maxCantidad} por pedido
          </p>
        )}
      </div>
    </div>
  );
}
