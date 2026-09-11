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

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { items: true },
  });
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

  const actualizado = await prisma.$transaction(async (tx) => {
    // Si se cancela un pedido que estaba PENDIENTE o CONFIRMADO, devolver el stock
    if (parsed.data.estado === "CANCELADO" && pedido.estado !== "CANCELADO") {
      for (const item of pedido.items) {
        const ps = await tx.productoSucursal.findFirst({
          where: {
            productoId: item.productoId,
            sucursalId: pedido.sucursalId,
            semana: pedido.semana,
          },
        });

        if (ps) {
          if (ps.stock !== null) {
            await tx.productoSucursal.update({
              where: { id: ps.id },
              data: {
                stock: { increment: item.cantidad },
                disponible: true,
              },
            });
          } else {
            // Producto con stock ilimitado (stock null): asegurar disponible
            await tx.productoSucursal.update({
              where: { id: ps.id },
              data: {
                disponible: true,
              },
            });
          }
        }
      }
    }

    return tx.pedido.update({
      where: { id: pedidoId },
      data: { estado: parsed.data.estado },
    });
  });

  return Response.json(actualizado);
}
