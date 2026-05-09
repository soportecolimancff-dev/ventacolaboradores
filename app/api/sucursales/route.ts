/**
 * GET /api/sucursales
 * Devuelve la lista de sucursales activas.
 */
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sucursales = await prisma.sucursal.findMany({
    where: { activa: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, slug: true },
  });
  return Response.json(sucursales);
}
