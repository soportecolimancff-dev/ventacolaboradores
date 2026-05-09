/**
 * GET  /api/admin/limites
 * POST /api/admin/limites
 * Gestiona el límite global de compra por semana.
 * Aplica igual a todas las sucursales.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMondayUTC } from "@/lib/validaciones";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const semanaParam = searchParams.get("semana");
  const semana = semanaParam ? new Date(semanaParam) : getMondayUTC();

  const limite = await prisma.limiteCompra.findUnique({ where: { semana } });
  return Response.json(limite ?? null);
}

const LimiteSchema = z.object({
  semana: z.string().datetime().optional(),
  montoMaximo: z.number().positive().nullable().optional(),
  cantidadMaxima: z.number().int().positive().nullable().optional(),
  comprasAbiertas: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = LimiteSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { semana: semanaStr, montoMaximo, cantidadMaxima } = parsed.data;
  const semana = semanaStr ? new Date(semanaStr) : getMondayUTC();

  const limite = await prisma.limiteCompra.upsert({
    where: { semana },
    update: {
      ...(montoMaximo !== undefined && { montoMaximo }),
      ...(cantidadMaxima !== undefined && { cantidadMaxima }),
      ...(parsed.data.comprasAbiertas !== undefined && { comprasAbiertas: parsed.data.comprasAbiertas }),
    },
    create: { semana, montoMaximo: montoMaximo ?? null, cantidadMaxima: cantidadMaxima ?? null, comprasAbiertas: parsed.data.comprasAbiertas ?? true },
  });

  return Response.json(limite, { status: 201 });
}
