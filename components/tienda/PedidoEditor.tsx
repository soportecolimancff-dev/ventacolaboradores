"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCarrito } from "@/context/CarritoContext";
import type { ItemCarrito, ProductoCatalogo } from "@/types/tienda";
import ProductoCard from "./ProductoCard";

interface Props {
  pedidoId: number;
  noEmpleado: string;
  sucursalNombre: string;
  productos: ProductoCatalogo[];
  itemsIniciales: ItemCarrito[];
  limiteCompra: number | null;
  cantidadMaxima: number | null;
}

export default function PedidoEditor({
  pedidoId,
  noEmpleado,
  sucursalNombre,
  productos,
  itemsIniciales,
  limiteCompra,
  cantidadMaxima,
}: Props) {
  const router = useRouter();
  const { items, total, itemCount, cargar } = useCarrito();
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargar(itemsIniciales, { monto: limiteCompra, cantidad: cantidadMaxima });
  }, [cargar, itemsIniciales, limiteCompra, cantidadMaxima]);

  const actualizarPedido = async () => {
    if (items.length === 0) {
      setError("El pedido debe conservar al menos un producto.");
      return;
    }
    setGuardando(true);
    setMensaje(null);
    setError(null);
    try {
      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noEmpleado,
          items: items.map((item) => ({ productoSucursalId: item.productoSucursalId, cantidad: item.cantidad })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const detalle = data?.error;
        setError(
          detalle?.tipo === "STOCK_INSUFICIENTE"
            ? `Solo quedan ${detalle.disponible} unidades de ${detalle.productoNombre}.`
            : detalle?.tipo === "MONTO_EXCEDIDO"
            ? `El total supera el límite de $${detalle.montoMaximo}.`
            : detalle?.tipo === "CANTIDAD_TOTAL_EXCEDIDA"
            ? `El pedido excede la cantidad máxima de ${detalle.cantidadMaxima}.`
            : detalle?.tipo === "COMPRAS_CERRADAS"
            ? "Las compras están cerradas esta semana."
            : detalle?.message ?? "No se pudo actualizar el pedido."
        );
        return;
      }
      setMensaje(`Pedido actualizado correctamente. Total: $${Number(data.total).toFixed(2)}`);
    } catch {
      setError("No se pudo actualizar el pedido. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-bold text-green-800">Pedido #{pedidoId}</p>
        <p className="mt-1 text-xs text-green-700">Empleado {noEmpleado} · {sucursalNombre}</p>
        <p className="mt-2 text-xs text-green-700">Conserva tus cantidades actuales o agrega productos disponibles.</p>
      </div>

      {productos.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500">No hay productos disponibles para agregar.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {productos.map((producto) => (
            <ProductoCard
              key={producto.productoSucursalId}
              producto={producto}
              limiteCompra={limiteCompra}
              cantidadMaxima={cantidadMaxima}
            />
          ))}
        </div>
      )}

      <div className="sticky bottom-4 mt-6 rounded-2xl border border-green-200 bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between text-sm text-gray-600">
          <span>{itemCount} producto{itemCount === 1 ? "" : "s"}</span>
          <span className="text-xl font-extrabold text-green-700">${total.toFixed(2)}</span>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        {mensaje && <p className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{mensaje}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/tienda")}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={actualizarPedido}
            disabled={guardando || items.length === 0}
            className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Actualizar pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
