/**
 * app/admin/limites/page.tsx  →  /admin/limites
 * Configuración de límites globales de compra (aplica igual a todas las sucursales).
 * - Monto máximo total por pedido en pesos (semanal, opcional)
 * - Cantidad máxima total en piezas/kg por pedido (semanal, opcional)
 * - Cantidad máxima por producto (global, por producto)
 */
import { prisma } from "@/lib/prisma";
import { getMondayUTC } from "@/lib/validaciones";
import LimitesForm from "@/components/admin/LimitesForm";

export const metadata = { title: "Límites | Admin Coliman" };

export default async function AdminLimitesPage() {
  const semana = getMondayUTC();

  const [limiteGlobal, productos] = await Promise.all([
    prisma.limiteCompra.findUnique({ where: { semana } }),
    prisma.producto.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, maxCantidad: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Límites de compra</h1>
        <p className="text-sm text-gray-400">
          Configuración global · Semana del {semana.toISOString().slice(0, 10)}
        </p>
      </div>
      <LimitesForm
        montoMaximo={limiteGlobal?.montoMaximo != null ? Number(limiteGlobal.montoMaximo) : null}
        cantidadMaxima={limiteGlobal?.cantidadMaxima ?? null}
        comprasAbiertas={limiteGlobal?.comprasAbiertas ?? true}
        productos={productos}
        semana={semana.toISOString()}
      />
    </div>
  );
}
