"use client";
/**
 * components/tienda/ProductoCard.tsx
 * Tarjeta de producto con control de cantidad +/-, validación en tiempo real y stock disponible.
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

  const tieneStockLimitado = producto.stock !== null && producto.stock !== undefined;
  const estaAgotado = tieneStockLimitado && producto.stock === 0;
  const maxPermitido = tieneStockLimitado
    ? Math.min(producto.maxCantidad, Math.max(0, producto.stock!))
    : producto.maxCantidad;

  // ¿Puede el usuario agregar una unidad más?
  const puedeAgregar =
    !estaAgotado &&
    cantidad < maxPermitido &&
    (limiteCompra === null || total + producto.precio <= limiteCompra) &&
    (cantidadMaxima === null || itemCount + 1 <= cantidadMaxima);

  const handleAgregar = () => {
    if (!puedeAgregar) return;
    if (!itemEnCarrito) {
      agregar({
        productoSucursalId: producto.productoSucursalId,
        productoId: producto.productoId,
        nombre: producto.nombre,
        precio: producto.precio,
        maxCantidad: maxPermitido,
        stock: producto.stock,
      });
    } else {
      setCantidad(producto.productoSucursalId, cantidad + 1);
    }
  };

  const handleRestar = () => {
    setCantidad(producto.productoSucursalId, cantidad - 1);
  };

  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:shadow-md ${
      estaAgotado ? "opacity-75" : ""
    }`}>
      {/* Icono / Emoji */}
      <div className={`relative flex h-36 w-full items-center justify-center bg-linear-to-br ${
        estaAgotado ? "from-gray-100 to-gray-200" : "from-green-50 to-emerald-100"
      }`}>
        <span className={`text-7xl drop-shadow-sm ${estaAgotado ? "grayscale opacity-50" : ""}`}>
          {producto.imagenUrl || "🍎"}
        </span>

        {estaAgotado && (
          <span className="absolute top-2 right-2 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white shadow">
            Agotado
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="font-bold text-gray-900">{producto.nombre}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}
            >
              {producto.unidad === "Kg" ? "Kilogramo" : "Pieza"}
            </span>

            {/* Si tiene stock limitado, mostrar stock disponible */}
            {tieneStockLimitado && (
              estaAgotado ? (
                <span className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                  0 disponibles
                </span>
              ) : producto.stock! <= 5 ? (
                <span className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  ⚠️ Solo {producto.stock} {producto.unidad === "Kg" ? "kg" : "pz"} disponibles
                </span>
              ) : (
                <span className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  📦 {producto.stock} {producto.unidad === "Kg" ? "kg" : "pz"} disponibles
                </span>
              )
            )}
          </div>
        </div>

        <div className="mt-auto flex flex-col sm:flex-row items-center sm:justify-between gap-2 pt-2 w-full">
          <span className="text-lg font-extrabold text-green-700">
            ${producto.precio.toFixed(2)}
          </span>

          <div className="shrink-0">
            {estaAgotado ? (
              <button
                disabled
                className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-400 cursor-not-allowed"
              >
                Agotado
              </button>
            ) : cantidad === 0 ? (
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
                max={maxPermitido}
                puedeAgregar={puedeAgregar}
                onSumar={handleAgregar}
                onRestar={handleRestar}
              />
            )}
          </div>
        </div>

        {!estaAgotado && cantidad > 0 && cantidad === maxPermitido && (
          <p className="text-xs text-amber-600">
            {tieneStockLimitado && producto.stock! < producto.maxCantidad
              ? `Límite por stock disponible (${producto.stock} ${producto.unidad === "Kg" ? "kg" : "pz"})`
              : `Máximo ${producto.maxCantidad} por pedido`}
          </p>
        )}
      </div>
    </div>
  );
}
