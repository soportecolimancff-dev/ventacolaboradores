"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ConsultarPedido() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pedidoId, setPedidoId] = useState("");
  const [noEmpleado, setNoEmpleado] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [consultando, setConsultando] = useState(false);

  const consultar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const id = Number(pedidoId);
    if (!Number.isInteger(id) || id <= 0 || !noEmpleado.trim()) {
      setError("Ingresa un número de pedido y tu número de empleado.");
      return;
    }

    setConsultando(true);
    try {
      const params = new URLSearchParams({ pedidoId: String(id), noEmpleado: noEmpleado.trim() });
      const response = await fetch(`/api/pedidos?${params.toString()}`);
      const data = await response.json();
      if (!response.ok || !data?.sucursal?.slug) {
        setError("No encontramos un pedido activo con esos datos.");
        return;
      }
      router.push(`/tienda/${data.sucursal.slug}/editar-pedido?pedidoId=${data.id}&noEmpleado=${encodeURIComponent(noEmpleado.trim())}`);
    } catch {
      setError("No se pudo consultar el pedido. Intenta de nuevo.");
    } finally {
      setConsultando(false);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-green-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => { setAbierto((actual) => !actual); setError(null); }}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={abierto}
      >
        <span>
          <span className="block text-sm font-bold text-green-800">¿Ya hiciste un pedido?</span>
          <span className="block text-xs text-gray-500">Consúltalo y modifica sus productos</span>
        </span>
        <span className="text-xl text-green-600" aria-hidden="true">{abierto ? "−" : "+"}</span>
      </button>

      {abierto && (
        <form onSubmit={consultar} className="mt-4 space-y-3 border-t border-green-100 pt-4">
          <div>
            <label htmlFor="pedido-id" className="mb-1 block text-xs font-semibold text-gray-700">Número de pedido</label>
            <input
              id="pedido-id"
              type="number"
              min="1"
              value={pedidoId}
              onChange={(event) => setPedidoId(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              placeholder="Ej. 123"
            />
          </div>
          <div>
            <label htmlFor="pedido-empleado" className="mb-1 block text-xs font-semibold text-gray-700">Número de empleado</label>
            <input
              id="pedido-empleado"
              type="text"
              inputMode="numeric"
              value={noEmpleado}
              onChange={(event) => setNoEmpleado(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              placeholder="Ej. 00123"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={consultando}
            className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {consultando ? "Consultando..." : "Consultar y modificar pedido"}
          </button>
        </form>
      )}
    </section>
  );
}
