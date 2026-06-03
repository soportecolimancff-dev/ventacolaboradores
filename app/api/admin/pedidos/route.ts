/**
 * GET  /api/admin/pedidos?sucursalId=1&semana=2025-01-06
 * POST /api/admin/pedidos/:id/estado  →  { estado: "CONFIRMADO" | "CANCELADO" }
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMondayUTC } from "@/lib/validaciones";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sucursalId = searchParams.get("sucursalId")
    ? Number(searchParams.get("sucursalId"))
    : undefined;
  const semanaParam = searchParams.get("semana");
  const semana = semanaParam ? new Date(semanaParam) : getMondayUTC();

  const pedidos = await prisma.pedido.findMany({
    where: {
      semana,
      ...(sucursalId ? { sucursalId } : {}),
    },
    include: {
      sucursal: { select: { nombre: true } },
      items: {
        include: { producto: { select: { nombre: true, cantidadPorCaja: true, unidad: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pedidosSerial = pedidos.map((p) => ({
    ...p,
    total: Number(p.total),
    items: p.items.map((i) => ({
      ...i,
      precioUnit: Number(i.precioUnit),
      subtotal: Number(i.subtotal),
    })),
  }));
  return Response.json(pedidosSerial);
}
