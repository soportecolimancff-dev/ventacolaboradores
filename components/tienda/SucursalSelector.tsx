"use client";
/**
 * components/tienda/SucursalSelector.tsx
 * Selector de sucursal con confirmación en dos pasos para evitar errores.
 *
 * Flujo:
 *  1. El usuario ve las 4 tarjetas de sucursal.
 *  2. Al hacer clic, se abre un modal de confirmación con nombre grande y color distintivo.
 *  3. Debe hacer clic en "Sí, esta es mi sucursal" para continuar.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Sucursal } from "@/types/tienda";

const COLORES_SUCURSAL: Record<string, { bg: string; border: string; icon: string }> = {
  "mexicali-abastos": {
    bg: "bg-orange-50",
    border: "border-orange-400",
    icon: "🌵",
  },
  "mexicali-centro": {
    bg: "bg-yellow-50",
    border: "border-yellow-400",
    icon: "🏙️",
  },
  "tijuana-ermita": {
    bg: "bg-blue-50",
    border: "border-blue-400",
    icon: "🌊",
  },
  ensenada: {
    bg: "bg-green-50",
    border: "border-green-400",
    icon: "⚓",
  },
};

interface Props {
  sucursales: Sucursal[];
  comprasAbiertas?: boolean;
}

export default function SucursalSelector({ sucursales, comprasAbiertas = true }: Props) {
  const router = useRouter();
  const [seleccionada, setSeleccionada] = useState<Sucursal | null>(null);

  const handleConfirmar = () => {
    if (!seleccionada) return;
    if (!comprasAbiertas) return;
    router.push(`/tienda/${seleccionada.slug}`);
  };

  return (
    <>
      {/* ── Tarjetas de sucursal ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sucursales.map((s) => {
          const colores = COLORES_SUCURSAL[s.slug] ?? {
            bg: "bg-gray-50",
            border: "border-gray-300",
            icon: "📍",
          };
          const disabled = comprasAbiertas === false;
          return (
            <button
              key={s.id}
              onClick={() => disabled ? undefined : setSeleccionada(s)}
              disabled={disabled}
              className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center shadow-sm transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md active:scale-95'} ${colores.bg} ${colores.border}`}
            >
              <span className="text-5xl">{colores.icon}</span>
              <span className="text-xl font-bold text-gray-800">{s.nombre}</span>
              {disabled && (
                <span className="mt-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                  Compras cerradas
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Modal de confirmación ────────────────────────────────────── */}
      {seleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
            {/* Icono de alerta */}
            <div className="mb-4 flex justify-center">
              <span className="text-6xl">
                {COLORES_SUCURSAL[seleccionada.slug]?.icon ?? "📍"}
              </span>
            </div>

            <h2 className="mb-1 text-center text-sm font-semibold uppercase tracking-widest text-gray-400">
              Confirma tu sucursal
            </h2>

            <p className="mb-6 text-center text-2xl font-extrabold text-gray-900">
              {seleccionada.nombre}
            </p>

            <p className="mb-6 text-center text-sm text-gray-500">
              Asegúrate de seleccionar la sucursal donde recogerás tus frutas.
              Los pedidos no se pueden cambiar de ruta.
            </p>

            {/* Botones */}
            <button
              onClick={handleConfirmar}
              className="mb-3 w-full rounded-xl bg-green-600 py-3 text-base font-bold text-white transition hover:bg-green-700 active:scale-95"
            >
              ✓ Sí, esta es mi sucursal
            </button>

            <button
              onClick={() => setSeleccionada(null)}
              className="w-full rounded-xl bg-gray-100 py-3 text-base font-semibold text-gray-600 transition hover:bg-gray-200"
            >
              ← Elegir otra sucursal
            </button>
          </div>
        </div>
      )}
    </>
  );
}
