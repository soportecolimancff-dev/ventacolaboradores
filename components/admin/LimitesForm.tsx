"use client";
/**
 * components/admin/LimitesForm.tsx
 * Formulario para configurar límites globales de compra (todas las sucursales):
 *  1. Monto máximo en pesos por pedido (semanal, opcional)
 *  2. Cantidad máxima total en piezas/kg por pedido (semanal, opcional)
 *  3. Cantidad máxima por producto individual (global, permanente)
 */
import { useState } from "react";

interface Producto {
  id: number;
  nombre: string;
  maxCantidad: number;
}

interface Props {
  montoMaximo: number | null;
  cantidadMaxima: number | null;
  comprasAbiertas?: boolean;
  productos: Producto[];
  semana: string;
}

export default function LimitesForm({
  montoMaximo: initMonto,
  cantidadMaxima: initCantidadTotal,
  comprasAbiertas: initComprasAbiertas = true,
  productos: initProductos,
  semana,
}: Props) {
  const [monto, setMonto] = useState(initMonto !== null ? String(initMonto) : "");
  const [guardandoMonto, setGuardandoMonto] = useState(false);
  const [exitoMonto, setExitoMonto] = useState(false);

  const [cantidadTotal, setCantidadTotal] = useState(
    initCantidadTotal !== null ? String(initCantidadTotal) : ""
  );
  const [guardandoCantidadTotal, setGuardandoCantidadTotal] = useState(false);
  const [exitoCantidadTotal, setExitoCantidadTotal] = useState(false);

  const [cantidades, setCantidades] = useState<Record<number, string>>(() => {
    const m: Record<number, string> = {};
    for (const p of initProductos) m[p.id] = String(p.maxCantidad);
    return m;
  });
  const [guardandoCantidad, setGuardandoCantidad] = useState<number | null>(null);
  const [exitoCantidad, setExitoCantidad] = useState<number | null>(null);
  const [comprasAbiertas, setComprasAbiertas] = useState<boolean>(initComprasAbiertas ?? true);
  const [guardandoCompras, setGuardandoCompras] = useState(false);

  const guardarMonto = async () => {
    const valor = monto.trim() === "" ? null : parseFloat(monto);
    if (valor !== null && (isNaN(valor) || valor <= 0)) return;
    setGuardandoMonto(true);
    setExitoMonto(false);
    try {
      await fetch("/api/admin/limites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montoMaximo: valor, semana }),
      });
      setExitoMonto(true);
      setTimeout(() => setExitoMonto(false), 2000);
    } finally {
      setGuardandoMonto(false);
    }
  };

  const guardarCantidadTotal = async () => {
    const valor = cantidadTotal.trim() === "" ? null : parseInt(cantidadTotal, 10);
    if (valor !== null && (isNaN(valor) || valor < 1)) return;
    setGuardandoCantidadTotal(true);
    setExitoCantidadTotal(false);
    try {
      await fetch("/api/admin/limites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidadMaxima: valor, semana }),
      });
      setExitoCantidadTotal(true);
      setTimeout(() => setExitoCantidadTotal(false), 2000);
    } finally {
      setGuardandoCantidadTotal(false);
    }
  };

  const guardarCantidad = async (productoId: number) => {
    const valor = parseInt(cantidades[productoId], 10);
    if (isNaN(valor) || valor < 1) return;
    setGuardandoCantidad(productoId);
    setExitoCantidad(null);
    try {
      await fetch(`/api/admin/productos/${productoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxCantidad: valor }),
      });
      setExitoCantidad(productoId);
      setTimeout(() => setExitoCantidad(null), 2000);
    } finally {
      setGuardandoCantidad(null);
    }
  };

  const toggleCompras = async () => {
    setGuardandoCompras(true);
    try {
      await fetch("/api/admin/limites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semana, comprasAbiertas: !comprasAbiertas }),
      });
      setComprasAbiertas((v) => !v);
    } finally {
      setGuardandoCompras(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Límites semanales */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 border-l-4 border-green-500 pl-3 font-bold text-gray-800">Limites del pedido semanal</h2>
        <p className="mb-4 text-xs text-gray-400">
          Aplican igual a todas las sucursales. Deja en blanco para no limitar.
        </p>
        <div className="space-y-4">
            {/* Toggle de apertura de compras */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-gray-700">Compras abiertas</label>
                <p className="text-xs text-gray-400">Si está desactivado, no se podrán crear pedidos esta semana.</p>
              </div>
              <button
                onClick={toggleCompras}
                disabled={guardandoCompras}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${comprasAbiertas ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                {guardandoCompras ? '…' : comprasAbiertas ? 'Abierto' : 'Cerrado'}
              </button>
            </div>
          {/* Monto en pesos */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Monto máximo en pesos ($)
            </label>
            <div className="flex items-center gap-3">
              <span className="text-gray-400">$</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Sin límite"
                className="w-36 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
              />
              <button
                onClick={guardarMonto}
                disabled={guardandoMonto}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white
                  transition hover:bg-green-700 disabled:opacity-40"
              >
                {guardandoMonto ? "…" : exitoMonto ? "✓ Guardado" : "Guardar"}
              </button>
            </div>
          </div>

          {/* Cantidad total en piezas/kg */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cantidad máxima total (piezas / kg)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                step="1"
                value={cantidadTotal}
                onChange={(e) => setCantidadTotal(e.target.value)}
                placeholder="Sin límite"
                className="w-36 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
              />
              <span className="text-sm text-gray-400">pzas/kg</span>
              <button
                onClick={guardarCantidadTotal}
                disabled={guardandoCantidadTotal}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white
                  transition hover:bg-green-700 disabled:opacity-40"
              >
                {guardandoCantidadTotal ? "…" : exitoCantidadTotal ? "✓ Guardado" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cantidad máxima por producto */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 border-l-4 border-green-500 pl-3 font-bold text-gray-800">Cantidad maxima por producto</h2>
        <p className="mb-4 text-xs text-gray-400">
          Límite individual en kg o piezas por pedido. Aplica igual para todas las sucursales.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {initProductos.map((p) => (
            <div key={p.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="mb-3 truncate text-sm font-semibold text-gray-700">{p.nombre}</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={cantidades[p.id] ?? ""}
                  onChange={(e) =>
                    setCantidades((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                />
                <span className="text-xs text-gray-400">pzas/kg</span>
                <button
                  onClick={() => guardarCantidad(p.id)}
                  disabled={guardandoCantidad === p.id}
                  className={`ml-auto rounded-xl px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-40 ${
                    exitoCantidad === p.id
                      ? "bg-emerald-500"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {guardandoCantidad === p.id ? "..." : exitoCantidad === p.id ? "Guardado" : "Guardar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
