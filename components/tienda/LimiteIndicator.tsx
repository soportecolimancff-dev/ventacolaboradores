"use client";
/**
 * components/tienda/LimiteIndicator.tsx
 * Muestra el límite de compra en el header de forma compacta.
 * Lee el total del carrito en tiempo real.
 */
import { useCarrito } from "@/context/CarritoContext";
import { useEffect } from "react";

interface Props {
  monto: number | null;
  cantidad: number | null;
}

export default function LimiteIndicator({ monto, cantidad }: Props) {
  const { total, setLimite, itemCount } = useCarrito();

  // Registra los límites en el contexto al montar
  useEffect(() => {
    setLimite({ monto, cantidad });
    return () => setLimite({ monto: null, cantidad: null });
  }, [monto, cantidad, setLimite]);

  // Ocultar si el carrito está vacío
  if (itemCount === 0) return null;

  const porcentaje =
    cantidad !== null
      ? Math.min((itemCount / cantidad) * 100, 100)
      : monto !== null
      ? Math.min((total / monto) * 100, 100)
      : 0;

  const supero =
    cantidad !== null ? itemCount > cantidad : monto !== null ? total > monto : false;

  return (
    <div className="ml-auto flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2 text-xs">
        <span className={`font-bold ${supero ? "text-red-600" : "text-green-700"}`}>
          🛒 ${total.toFixed(2)}
        </span>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-gray-500">
          {monto !== null ? `💰 $${monto.toFixed(2)}` : ""}
        </span>
      </div>
      <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200 shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            supero ? "bg-red-500" : porcentaje > 80 ? "bg-amber-400" : "bg-green-500"
          }`}
          style={{ width: (cantidad !== null || monto !== null) ? `${porcentaje}%` : "0%" }}
        />
      </div>
      {supero && (
        <span className="text-[10px] font-bold text-red-600 animate-pulse">
          ⚠️ Límite excedido
        </span>
      )}
      {cantidad !== null && (
        <span className="text-[10px] text-gray-500">Cantidad máxima: {cantidad}</span>
      )}
    </div>
  );
}
