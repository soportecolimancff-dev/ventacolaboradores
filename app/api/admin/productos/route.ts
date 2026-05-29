/**
 * POST /api/admin/productos
 * Crea un nuevo producto en el catálogo maestro.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CrearProductoSchema = z.object({
  nombre: z.string().min(1).max(100),
  unidad: z.enum(["Pz", "Kg"]).default("Pz"),
  imagenUrl: z.string().optional().nullable(),
  maxCantidad: z.number().int().min(1).default(5),
  cantidadPorCaja: z.number().int().min(1).default(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CrearProductoSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const producto = await prisma.producto.create({
    data: parsed.data,
    select: { id: true, nombre: true, unidad: true, imagenUrl: true, activo: true, maxCantidad: true, cantidadPorCaja: true },
  });

  return Response.json(producto, { status: 201 });
}
