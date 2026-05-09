/**
 * GET /api/catalogo/[slug]
 * Devuelve los productos disponibles para una sucursal en la semana actual.
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMondayUTC } from "@/lib/validaciones";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const semana = getMondayUTC();

  const sucursal = await prisma.sucursal.findUnique({
    where: { slug, activa: true },
    select: { id: true, nombre: true, slug: true },
  });

  if (!sucursal) {
    return Response.json({ error: "Sucursal no encontrada" }, { status: 404 });
  }

  const productosSucursal = await prisma.productoSucursal.findMany({
    where: { sucursalId: sucursal.id, semana, disponible: true },
    include: {
      producto: {
        select: { id: true, nombre: true, descripcion: true, imagenUrl: true, maxCantidad: true },
      },
    },
    orderBy: { producto: { nombre: "asc" } },
  });

  const limite = await prisma.limiteCompra.findUnique({
    where: { semana },
  });

  return Response.json({
    sucursal,
    productos: productosSucursal.map((ps: (typeof productosSucursal)[number]) => ({
      productoSucursalId: ps.id,
      productoId: ps.productoId,
      nombre: ps.producto.nombre,
      descripcion: ps.producto.descripcion,
      imagenUrl: ps.producto.imagenUrl,
      precio: Number(ps.precio),
      maxCantidad: ps.producto.maxCantidad,
      stock: ps.stock,
    })),
    limiteCompra: limite ? Number(limite.montoMaximo) : null,
    cantidadMaxima: limite?.cantidadMaxima ?? null,
  });
}