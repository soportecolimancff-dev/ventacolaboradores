"use client";
/**
 * components/admin/PedidosTable.tsx
 * Tabla de pedidos con filtro por sucursal y cambio de estado.
 */
import { useState, Fragment, useMemo } from "react";
import * as XLSX from "xlsx";

interface ItemPedidoAdmin {
  id: number;
  productoId: number;
  cantidad: number;
  precioUnit: number;
  subtotal: number;
  producto: { nombre: string };
}

interface PedidoAdmin {
  id: number;
  noEmpleado: string;
  nombreEmpleado: string;
  emailEmpleado: string | null;
  total: number;
  estado: string;
  createdAt: Date | string;
  sucursal: { nombre: string };
  items: ItemPedidoAdmin[];
}

interface Sucursal {
  id: number;
  nombre: string;
}

interface Props {
  pedidos: PedidoAdmin[];
  sucursales: Sucursal[];
}

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

function formatShortDate(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" }).format(d);
}

export default function PedidosTable({ pedidos, sucursales }: Props) {
  const [filtroSucursal, setFiltroSucursal] = useState<string>("todas");
  const [search, setSearch] = useState<string>("");
  const [expandido, setExpandido] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = semana actual, -1 = anterior, +1 = siguiente
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [estados, setEstados] = useState<Record<number, string>>(
    Object.fromEntries(pedidos.map((p) => [p.id, p.estado]))
  );
  const [cargando, setCargando] = useState<number | null>(null);

  // Transiciones permitidas por estado actual
  const transiciones: Record<string, { label: string; estado: string; style: string }[]> = {
    PENDIENTE: [
      { label: "Confirmar",  estado: "CONFIRMADO", style: "bg-green-100 text-green-700 hover:bg-green-200" },
      { label: "Cancelar",   estado: "CANCELADO",  style: "bg-red-100 text-red-600 hover:bg-red-200" },
    ],
    CONFIRMADO: [
      { label: "Marcar pagado", estado: "PAGADO", style: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
    ],
    CANCELADO: [],
    PAGADO: [],
  };

  const weekRange = useMemo(() => {
    const today = new Date();
    const ref = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const offsetDays = weekOffset * 7;
    ref.setDate(ref.getDate() + offsetDays);
    const day = ref.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(ref);
    monday.setDate(ref.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { monday, sunday };
  }, [weekOffset]);

  const pedidosFiltrados = useMemo(() => {
    const base = filtroSucursal === "todas"
      ? pedidos
      : pedidos.filter((p) => p.sucursal.nombre === filtroSucursal);
    const q = search.trim().toLowerCase();
    // aplicar búsqueda
    const buscados = !q
      ? base
      : base.filter(
          (p) =>
            p.nombreEmpleado.toLowerCase().includes(q) ||
            p.noEmpleado.toLowerCase().includes(q)
        );
    // filtrar por semana usando weekRange
    return buscados.filter((p) => {
      const d = new Date(p.createdAt);
      return d >= weekRange.monday && d <= weekRange.sunday;
    });
  }, [pedidos, filtroSucursal, search, weekRange]);

  const pedidosOrdenados = useMemo(() => {
    const arr = [...pedidosFiltrados];
    if (!sortBy) return arr;
    arr.sort((a, b) => {
      if (sortBy === "empleado") {
        return a.nombreEmpleado.localeCompare(b.nombreEmpleado);
      }
      if (sortBy === "sucursal") {
        return a.sucursal.nombre.localeCompare(b.sucursal.nombre);
      }
      if (sortBy === "total") {
        return a.total - b.total;
      }
      if (sortBy === "estado") {
        const ea = estados[a.id] ?? "";
        const eb = estados[b.id] ?? "";
        return ea.localeCompare(eb);
      }
      return 0;
    });
    if (sortDir === "desc") arr.reverse();
    return arr;
  }, [pedidosFiltrados, sortBy, sortDir, estados]);

  // ── Utilidades de semana ────────────────────────────────────────────────────
  function getWeekNumber(d: Date): number {
    const start = new Date(d.getFullYear(), 0, 1);
    const diff = d.getTime() - start.getTime();
    return Math.ceil((diff / 86_400_000 + start.getDay() + 1) / 7);
  }

  // ── Exportación Excel ─────────────────────────────────────────────────────
  function exportarExcel() {
    const pagados = pedidosFiltrados.filter((p) => estados[p.id] === "PAGADO");
    if (pagados.length === 0) {
      alert("No hay pedidos con estado PAGADO en la selección actual.");
      return;
    }

    const ahora = new Date();
    const semanaNum = getWeekNumber(weekRange.monday);
    const fmtLargo = (d: Date) =>
      new Intl.DateTimeFormat("es-MX", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }).format(d);
    const fmtCorto = (d: Date) =>
      new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(d);

    // ── Hoja 1: Portada / Resumen ────────────────────────────────────────────
    const portadaData: (string | number)[][] = [
      ["FRUTA COLIMAN — Lista de Picking"],
      [],
      ["Semana del año:", `Semana ${semanaNum}`],
      ["Período:", `${fmtCorto(weekRange.monday)} — ${fmtCorto(weekRange.sunday)}`],
      ["Sucursal:", filtroSucursal === "todas" ? "Todas" : filtroSucursal],
      ["Pedidos PAGADOS:", pagados.length],
      ["Total general ($):", pagados.reduce((s, p) => s + p.total, 0)],
      ["Generado el:", fmtLargo(ahora)],
      [],
    ];

    // Resumen consolidado de productos (suma por producto)
    const consolidado: Record<string, { producto: string; cantidad: number; total: number }> = {};
    for (const pedido of pagados) {
      for (const item of pedido.items) {
        const k = item.producto.nombre;
        if (!consolidado[k]) consolidado[k] = { producto: k, cantidad: 0, total: 0 };
        consolidado[k].cantidad += item.cantidad;
        consolidado[k].total += item.subtotal;
      }
    }

    portadaData.push(["── CONSOLIDADO DE PRODUCTOS ──"]);
    portadaData.push(["Producto", "Piezas totales", "Subtotal ($)"]);
    for (const v of Object.values(consolidado).sort((a, b) => b.cantidad - a.cantidad)) {
      portadaData.push([v.producto, v.cantidad, v.total]);
    }

    const wsPortada = XLSX.utils.aoa_to_sheet(portadaData);
    wsPortada["!cols"] = [{ wch: 34 }, { wch: 22 }, { wch: 16 }];

    // ── Hoja 2: Detalle de picking por pedido ────────────────────────────────
    const pickingData: (string | number | null)[][] = [
      ["#Pedido", "No. Empleado", "Nombre Empleado", "Email", "Sucursal",
       "Fecha Pedido", "Producto", "Cantidad", "Precio Unitario ($)", "Subtotal ($)", "Total Pedido ($)"],
    ];

    for (const pedido of pagados) {
      const fechaPedido = new Intl.DateTimeFormat("es-MX", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }).format(new Date(pedido.createdAt));

      pedido.items.forEach((item, idx) => {
        pickingData.push([
          idx === 0 ? pedido.id : null,
          idx === 0 ? pedido.noEmpleado : null,
          idx === 0 ? pedido.nombreEmpleado : null,
          idx === 0 ? (pedido.emailEmpleado ?? "—") : null,
          idx === 0 ? pedido.sucursal.nombre : null,
          idx === 0 ? fechaPedido : null,
          item.producto.nombre,
          item.cantidad,
          item.precioUnit,
          item.subtotal,
          idx === 0 ? pedido.total : null,
        ]);
      });
      // fila separadora entre pedidos
      pickingData.push(new Array(11).fill(""));
    }

    const wsPicking = XLSX.utils.aoa_to_sheet(pickingData);
    wsPicking["!cols"] = [
      { wch: 10 }, { wch: 14 }, { wch: 26 }, { wch: 28 }, { wch: 18 },
      { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 16 }, { wch: 16 },
    ];

    // ── Libro y descarga ─────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsPortada, "Resumen");
    XLSX.utils.book_append_sheet(wb, wsPicking, "Picking");

    const nombreArchivo = `picking_semana${semanaNum}_${ahora.getFullYear()}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  }

  function toggleSort(col: string) {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  const cambiarEstado = async (pedidoId: number, nuevoEstado: string) => {
    setCargando(pedidoId);
    try {
      const res = await fetch(`/api/admin/pedidos/${pedidoId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (res.ok) {
        setEstados((prev) => ({ ...prev, [pedidoId]: nuevoEstado }));
      }
    } finally {
      setCargando(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtro por sucursal */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Sucursal:</span>
        {(["todas", ...sucursales.map((s) => s.nombre)] as string[]).map((nombre) => {
          const sel = filtroSucursal === nombre;
          return (
            <button
              key={nombre}
              onClick={() => setFiltroSucursal(nombre)}
              className="relative rounded-xl px-4 py-1.5 text-sm font-bold transition-all"
              style={sel
                ? { background: "#15803d", color: "#ffffff", boxShadow: "0 0 0 3px #bbf7d0, 0 4px 12px rgba(21,128,61,0.35)" }
                : { background: "#ffffff", color: "#6b7280", border: "1px solid #e5e7eb" }
              }
            >
              {sel && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "#4ade80" }} />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full" style={{ background: "#16a34a" }} />
                </span>
              )}
              {nombre === "todas" ? "Todas" : nombre}
            </button>
          );
        })}
        {/* Selector de semana */}
        <div className="ml-3 flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((s) => s - 1)}
            className="rounded-lg px-3 py-1 text-xs font-semibold bg-white border border-gray-200"
            aria-label="Semana anterior"
          >
            ←
          </button>
          <div className="text-xs text-gray-600">
            Semana: <span className="font-semibold text-gray-800">{formatShortDate(weekRange.monday)} — {formatShortDate(weekRange.sunday)}</span>
          </div>
          <button
            onClick={() => setWeekOffset(0)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800"
            title="Ir a semana actual"
          >
            Hoy
          </button>
          <button
            onClick={() => setWeekOffset((s) => s + 1)}
            className="rounded-lg px-3 py-1 text-xs font-semibold bg-white border border-gray-200"
            aria-label="Semana siguiente"
          >
            →
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o número de empleado..."
              className="w-64 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-200"
              aria-label="Buscar pedidos por empleado"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded px-1.5 text-xs text-gray-500 hover:text-gray-700"
                aria-label="Limpiar búsqueda"
              >
                
              </button>
            )}
          </div>
          <span className="text-xs text-gray-400">{pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? "s" : ""}</span>
          <button
            onClick={exportarExcel}
            className="flex items-center gap-1.5 rounded-xl border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 active:scale-95 transition-all"
            title="Exportar pedidos PAGADOS a Excel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Exportar pagados
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold uppercase text-gray-400">
              <th className="px-4 py-3">
                <button onClick={() => toggleSort("empleado")} className="flex items-center gap-2">
                  Empleado
                  {sortBy === "empleado" && <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort("sucursal")} className="flex items-center gap-2">
                  Sucursal
                  {sortBy === "sucursal" && <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort("total")} className="flex items-center gap-2">
                  Total
                  {sortBy === "total" && <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort("estado")} className="flex items-center gap-2">
                  Estado
                  {sortBy === "estado" && <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
                </button>
              </th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pedidosOrdenados.map((p) => (
              <Fragment key={p.id}>
                <tr
                  key={p.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.nombreEmpleado}</p>
                    <p className="text-xs text-gray-400">#{p.noEmpleado} · {formatDate(p.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.sucursal.nombre}</td>
                  <td className="px-4 py-3 font-bold text-green-700">
                    ${p.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        estados[p.id] === "CONFIRMADO"
                          ? "bg-green-100 text-green-700"
                          : estados[p.id] === "CANCELADO"
                          ? "bg-red-100 text-red-600"
                          : estados[p.id] === "PAGADO"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {estados[p.id]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {(transiciones[estados[p.id]] ?? []).map((t) => (
                        <button
                          key={t.estado}
                          disabled={cargando === p.id}
                          onClick={() => cambiarEstado(p.id, t.estado)}
                          className={`rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-40 ${t.style}`}
                        >
                          {t.label}
                        </button>
                      ))}
                      {(transiciones[estados[p.id]] ?? []).length === 0 && (
                        <span className="text-xs text-gray-300 italic">Sin acciones</span>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Detalle expandible */}
                {expandido === p.id && (
                  <tr key={`${p.id}-detail`} className="bg-green-50/40">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="flex-1">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {p.items.length} producto{p.items.length !== 1 ? "s" : ""} en el pedido
                          </p>
                          <ul className="space-y-2">
                            {p.items.map((item) => (
                              <li key={item.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                                    {item.cantidad}
                                  </span>
                                  <span className="text-gray-700">{item.producto.nombre}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-semibold text-gray-800">${item.subtotal.toFixed(2)}</span>
                                  <span className="ml-2 text-xs text-gray-400">${item.precioUnit.toFixed(2)}/u</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="shrink-0 rounded-xl border border-green-200 bg-white px-5 py-3 text-right">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total pedido</p>
                          <p className="text-2xl font-extrabold text-green-700">${p.total.toFixed(2)}</p>
                          {/* <p className="mt-1 text-xs text-gray-400">{p.emailEmpleado ?? "—"}</p> */}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>

        {pedidosFiltrados.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
            <svg className="h-10 w-10 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            <p className="text-sm font-medium">Sin pedidos esta semana</p>
            <p className="text-xs">Los pedidos de los colaboradores apareceran aqui.</p>
          </div>
        )}
      </div>
    </div>
  );
}
