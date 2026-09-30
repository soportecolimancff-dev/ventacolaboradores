/**
 * GET  /api/admin/catalogo
 * POST /api/admin/catalogo
 * Gestiona el catálogo semanal (ProductoSucursal).
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMondayUTC } from "@/lib/validaciones";
import { asegurarCatalogoSemana } from "@/lib/catalogoSemana";

// GET – lista productos de la semana para todas las sucursales
// Filtros opcionales: sucursalId, disponibles=1 (solo disponible + producto activo)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const semanaParam = searchParams.get("semana");
  const semana = semanaParam ? new Date(semanaParam) : getMondayUTC();
  const sucursalId = searchParams.get("sucursalId") ? Number(searchParams.get("sucursalId")) : undefined;
  const soloDisponibles = searchParams.get("disponibles") === "1";

  await asegurarCatalogoSemana(semana);

  const items = await prisma.productoSucursal.findMany({
    where: {
      semana,
      ...(sucursalId ? { sucursalId } : {}),
      ...(soloDisponibles ? { disponible: true, producto: { activo: true } } : {}),
    },
    include: {
      producto: {
        select: { id: true, nombre: true, imagenUrl: true, activo: true, maxCantidad: true, cantidadPorCaja: true, unidad: true },
      },
      sucursal: { select: { id: true, nombre: true, slug: true } },
    },
    orderBy: [{ sucursal: { nombre: "asc" } }, { producto: { nombre: "asc" } }],
  });

  const itemsSerial = items.map((i) => ({ ...i, precio: Number(i.precio) }));

  return Response.json(itemsSerial);
}

const CrearItemSchema = z.object({
  productoId: z.number().int().positive(),
  sucursalId: z.number().int().positive(),
  semana: z.string().datetime().optional(),
  precio: z.number().positive(),
  stock: z.number().int().min(0).nullable().optional(),
  disponible: z.boolean().default(true),
});

// POST – crea o actualiza un ítem del catálogo
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CrearItemSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { semana: semanaStr, ...data } = parsed.data;
  const semana = semanaStr ? new Date(semanaStr) : getMondayUTC();

  // Stock: 0, null o undefined se interpreta como stock ilimitado (null en BD)
  // Valores > 0 se guardan como stock controlado
  const stockNormalizado = data.stock === 0 || data.stock === null || data.stock === undefined ? null : data.stock;

  const item = await prisma.productoSucursal.upsert({
    where: {
      productoId_sucursalId_semana: {
        productoId: data.productoId,
        sucursalId: data.sucursalId,
        semana,
      },
    },
    update: {
      precio: data.precio,
      stock: stockNormalizado,
      disponible: data.disponible,
    },
    create: {
      ...data,
      stock: stockNormalizado,
      semana,
    },
    include: { producto: true, sucursal: true },
  });

  return Response.json(item, { status: 201 });
}
