/**
 * app/admin/pedidos/page.tsx  →  /admin/pedidos
 * Visualización y gestión de pedidos por sucursal.
 */
import { prisma } from "@/lib/prisma";
import { getMondayUTC } from "@/lib/validaciones";
import PedidosTable from "@/components/admin/PedidosTable";

export const metadata = { title: "Pedidos | Admin Coliman" };

export default async function AdminPedidosPage() {
  const semana = getMondayUTC();

  const [pedidos, sucursales] = await Promise.all([
    prisma.pedido.findMany({
      where: { semana },
      include: {
        sucursal: { select: { nombre: true } },
        items: {
          include: { producto: { select: { nombre: true } } },
        },
      },
      orderBy: [{ sucursal: { nombre: "asc" } }, { createdAt: "desc" }],
    }),
    prisma.sucursal.findMany({
      where: { activa: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  // Serializar Decimal → number para el cliente
  const pedidosSerial = pedidos.map((p: (typeof pedidos)[number]) => ({
    ...p,
    total: Number(p.total),
    items: p.items.map((i: (typeof p.items)[number]) => ({
      ...i,
      precioUnit: Number(i.precioUnit),
      subtotal: Number(i.subtotal),
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Pedidos</h1>
        <p className="text-sm text-gray-400">
          Semana del {semana.toISOString().slice(0, 10)}
        </p>
      </div>
      <PedidosTable pedidos={pedidosSerial} sucursales={sucursales} />
    </div>
  );
}
