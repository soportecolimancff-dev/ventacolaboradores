/**
 * app/admin/page.tsx  ->  /admin
 * Dashboard con metricas de la semana actual.
 */
import { type ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { getMondayUTC } from "@/lib/validaciones";

export const metadata = { title: "Dashboard | Admin Coliman" };

export default async function AdminDashboard() {
  const semana = getMondayUTC();

  const [
    totalPedidos,
    pedidosPorSucursal,
    pedidosRecientes,
    totalPedidosPagados,
  ] = await Promise.all([
    prisma.pedido.count({ where: { semana } }),
    prisma.pedido.groupBy({
      by: ["sucursalId"],
      where: { semana, estado: "PAGADO" },
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.pedido.findMany({
      where: { semana },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        sucursal: { select: { nombre: true } },
      },
    }),
    prisma.pedido.count({ where: { semana, estado: "PAGADO" } }),
  ]);

  const sucursales = await prisma.sucursal.findMany({
    select: { id: true, nombre: true },
  });
  const nombreSucursal = Object.fromEntries(
    sucursales.map((s: { id: number; nombre: string }) => [s.id, s.nombre])
  );

  const totalVentas = pedidosPorSucursal.reduce(
    (acc: number, p: (typeof pedidosPorSucursal)[number]) =>
      acc + Number(p._sum.total ?? 0),
    0
  );
  const maxVenta = Math.max(
    ...pedidosPorSucursal.map((p: (typeof pedidosPorSucursal)[number]) =>
      Number(p._sum.total ?? 0)
    ),
    1
  );

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            Semana del {semana.toISOString().slice(0, 10)}
          </p>
        </div>
        <span className="hidden rounded-xl bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 ring-1 ring-green-200 md:block">
          Semana activa
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Pedidos"
          value={String(totalPedidos)}
          sub="esta semana"
          icon={<CartIcon />}
          color="blue"
        />
        <StatCard
          label="Ventas totales"
          value={`$${totalVentas.toFixed(2)}`}
          sub="en pesos MXN"
          icon={<TrendIcon />}
          color="green"
          highlight
        />
        <StatCard
          label="Sucursales"
          value={String(pedidosPorSucursal.length)}
          sub="con pedidos"
          icon={<BuildingIcon />}
          color="amber"
        />
        <StatCard
          label="Promedio"
            value={
              totalPedidosPagados > 0
                ? `$${(totalVentas / totalPedidosPagados).toFixed(2)}`
                : "sin datos"
            }
          sub="por pedido"
          icon={<AvgIcon />}
          color="purple"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Por sucursal con barra de progreso */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-gray-700">Ventas por sucursal</h2>
          <div className="space-y-4">
            {pedidosPorSucursal.map((p: (typeof pedidosPorSucursal)[number]) => {
              const venta = Number(p._sum.total ?? 0);
              const pct = Math.round((venta / maxVenta) * 100);
              return (
                <div key={p.sucursalId}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {nombreSucursal[p.sucursalId] ?? `Sucursal ${p.sucursalId}`}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-400">{p._count.id} pedidos</span>
                      <span className="font-bold text-green-700">${venta.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {pedidosPorSucursal.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">
                Sin pedidos esta semana.
              </p>
            )}
          </div>
        </div>

        {/* Pedidos recientes */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-gray-700">Pedidos recientes</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                <th className="pb-2 pr-4">Empleado</th>
                <th className="pb-2 pr-4">Sucursal</th>
                <th className="pb-2 pr-2 text-right">Total</th>
                <th className="pb-2 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pedidosRecientes.map((p: (typeof pedidosRecientes)[number]) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="py-2.5 pr-4 font-medium text-gray-800">
                    {p.nombreEmpleado}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500">{p.sucursal.nombre}</td>
                  <td className="py-2.5 pr-2 text-right font-bold text-green-700">
                    ${Number(p.total).toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.estado === "CONFIRMADO"
                          ? "bg-green-100 text-green-700"
                          : p.estado === "CANCELADO"
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {p.estado}
                    </span>
                  </td>
                </tr>
              ))}
              {pedidosRecientes.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                    Sin pedidos recientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Iconos ───────────────────────────────────────────────────────────────────
function TrendIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function AvgIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────────
type CardColor = "green" | "blue" | "amber" | "purple";

const COLOR: Record<CardColor, string> = {
  green: "bg-green-50 text-green-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  purple: "bg-purple-50 text-purple-600",
};

function StatCard({
  label,
  value,
  sub,
  icon,
  color = "green",
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  color?: CardColor;
  highlight?: boolean;
}) {
  if (highlight) {
    return (
      <div className="rounded-2xl bg-green-600 p-5 text-white shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-green-100">
            {label}
          </span>
          <div className="rounded-lg bg-green-500 p-1.5 text-green-100">{icon}</div>
        </div>
        <p className="text-2xl font-extrabold">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-green-200">{sub}</p>}
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </span>
        <div className={`rounded-lg p-1.5 ${COLOR[color]}`}>{icon}</div>
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
