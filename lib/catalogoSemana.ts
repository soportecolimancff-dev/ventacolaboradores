/**
 * lib/catalogoSemana.ts
 * El catálogo (ProductoSucursal) se guarda por semana, pero la configuración
 * (precio, stock, disponibilidad) debe persistir automáticamente semana tras
 * semana hasta que el admin quite la disponibilidad de un producto.
 */
import { prisma } from "@/lib/prisma";

/** Copia a `semana` los ítems disponibles de la última semana configurada, si aún no existen. */
export async function asegurarCatalogoSemana(semana: Date): Promise<void> {
  const semanaAnterior = await prisma.productoSucursal.findFirst({
    where: { semana: { lt: semana } },
    orderBy: { semana: "desc" },
    select: { semana: true },
  });
  if (!semanaAnterior) return;

  const disponiblesAnteriores = await prisma.productoSucursal.findMany({
    where: { semana: semanaAnterior.semana, disponible: true, producto: { activo: true } },
    select: { productoId: true, sucursalId: true, precio: true, stock: true },
  });
  if (disponiblesAnteriores.length === 0) return;

  const actuales = await prisma.productoSucursal.findMany({
    where: { semana },
    select: { productoId: true, sucursalId: true },
  });
  const actualesSet = new Set(actuales.map((a) => `${a.productoId}-${a.sucursalId}`));

  const nuevos = disponiblesAnteriores
    .filter((ps) => !actualesSet.has(`${ps.productoId}-${ps.sucursalId}`))
    .map((ps) => ({
      productoId: ps.productoId,
      sucursalId: ps.sucursalId,
      semana,
      precio: ps.precio,
      stock: ps.stock,
      disponible: true,
    }));

  if (nuevos.length > 0) {
    await prisma.productoSucursal.createMany({ data: nuevos, skipDuplicates: true });
  }
}
