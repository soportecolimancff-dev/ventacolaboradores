/**
 * PATCH /api/admin/productos/[id]  — edita nombre, descripcion, imagenUrl, maxCantidad, activo
 * DELETE /api/admin/productos/[id] — elimina el producto maestro
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const BodySchema = z
  .object({
    nombre: z.string().min(1).max(100).optional(),
    descripcion: z.string().optional().nullable(),
    imagenUrl: z.string().optional().nullable(),
    maxCantidad: z.number().int().min(1).optional(),
    activo: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.maxCantidad !== undefined ||
      d.activo !== undefined ||
      d.nombre !== undefined ||
      d.descripcion !== undefined ||
      d.imagenUrl !== undefined,
    { message: "Debe enviar al menos un campo a actualizar" }
  );

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productoId = Number(id);
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.nombre !== undefined) data.nombre = d.nombre;
  if (d.descripcion !== undefined) data.descripcion = d.descripcion;
  if (d.imagenUrl !== undefined) data.imagenUrl = d.imagenUrl;
  if (d.maxCantidad !== undefined) data.maxCantidad = d.maxCantidad;
  if (d.activo !== undefined) data.activo = d.activo;

  const producto = await prisma.producto.update({
    where: { id: productoId },
    data,
    select: { id: true, nombre: true, descripcion: true, imagenUrl: true, maxCantidad: true, activo: true },
  });

  return Response.json(producto);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productoId = Number(id);

  // Verificar que no tenga pedidos activos
  const enUso = await prisma.itemPedido.findFirst({ where: { productoId } });
  if (enUso) {
    return Response.json(
      { error: "No se puede eliminar: el producto tiene pedidos registrados." },
      { status: 409 }
    );
  }

  // Eliminar registros de ProductoSucursal primero (FK)
  await prisma.productoSucursal.deleteMany({ where: { productoId } });
  await prisma.producto.delete({ where: { id: productoId } });

  return new Response(null, { status: 204 });
}
