/**
 * PATCH /api/admin/pedidos/[id]/estado
 * Cambia el estado de un pedido respetando las transiciones permitidas:
 *   PENDIENTE  -> CONFIRMADO | CANCELADO
 *   CONFIRMADO -> PAGADO
 *   CANCELADO  -> (terminal, sin transiciones)
 *   PAGADO     -> (terminal, sin transiciones)
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  estado: z.enum(["CONFIRMADO", "CANCELADO", "PAGADO"]),
});

// Mapa de transiciones permitidas
const TRANSICIONES: Record<string, string[]> = {
  PENDIENTE:  ["CONFIRMADO", "CANCELADO"],
  CONFIRMADO: ["PAGADO", "CANCELADO"],
  CANCELADO:  [],
  PAGADO:     [],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pedidoId = Number(id);
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) {
    return Response.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  const permitidos = TRANSICIONES[pedido.estado] ?? [];
  if (!permitidos.includes(parsed.data.estado)) {
    return Response.json(
      { error: `Transicion no permitida: ${pedido.estado} -> ${parsed.data.estado}` },
      { status: 409 }
    );
  }

  const actualizado = await prisma.pedido.update({
    where: { id: pedidoId },
    data: { estado: parsed.data.estado },
  });

  return Response.json(actualizado);
}
