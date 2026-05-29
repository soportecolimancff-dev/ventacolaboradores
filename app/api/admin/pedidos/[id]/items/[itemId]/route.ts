/**
 * PATCH  /api/admin/pedidos/[id]/items/[itemId]  — cambia cantidad de un ítem
 * DELETE /api/admin/pedidos/[id]/items/[itemId]  — elimina un ítem del pedido
 *
 * Solo se permite modificar ítems de pedidos en estado PENDIENTE.
 * Ambas operaciones recalculan el total del pedido.
 * Si al eliminar el pedido queda sin ítems, se cancela automáticamente.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const PatchSchema = z.object({
  cantidad: z.number().int().min(1),
});

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, itemId } = await params;
  const pedidoId = Number(id);
  const itemIdNum = Number(itemId);

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const item = await prisma.itemPedido.findUnique({
    where: { id: itemIdNum },
    select: { id: true, pedidoId: true, precioUnit: true, pedido: { select: { estado: true } } },
  });

  if (!item || item.pedidoId !== pedidoId) {
    return Response.json({ error: "Ítem no encontrado en este pedido" }, { status: 404 });
  }

  if (item.pedido.estado !== "PENDIENTE") {
    return Response.json({ error: "Solo se pueden editar ítems de pedidos pendientes" }, { status: 409 });
  }

  const nuevaCantidad = parsed.data.cantidad;
  const nuevoSubtotal = Number(item.precioUnit) * nuevaCantidad;

  // Actualizar ítem y recalcular total del pedido en una transacción
  const [itemActualizado, pedidoActualizado] = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.itemPedido.update({
      where: { id: itemIdNum },
      data: { cantidad: nuevaCantidad, subtotal: nuevoSubtotal },
    });

    // Recalcular total sumando todos los ítems
    const items = await tx.itemPedido.findMany({
      where: { pedidoId },
      select: { subtotal: true },
    });
    const nuevoTotal = items.reduce((s, i) => s + Number(i.subtotal), 0);

    const updatedPedido = await tx.pedido.update({
      where: { id: pedidoId },
      data: { total: nuevoTotal },
      select: { id: true, total: true },
    });

    return [updatedItem, updatedPedido];
  });

  return Response.json({
    item: { ...itemActualizado, subtotal: Number(itemActualizado.subtotal), precioUnit: Number(itemActualizado.precioUnit) },
    pedido: { id: pedidoActualizado.id, total: Number(pedidoActualizado.total) },
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, itemId } = await params;
  const pedidoId = Number(id);
  const itemIdNum = Number(itemId);

  const item = await prisma.itemPedido.findUnique({
    where: { id: itemIdNum },
    select: { pedidoId: true, pedido: { select: { estado: true } } },
  });

  if (!item || item.pedidoId !== pedidoId) {
    return Response.json({ error: "Ítem no encontrado en este pedido" }, { status: 404 });
  }

  if (item.pedido.estado !== "PENDIENTE") {
    return Response.json({ error: "Solo se pueden eliminar ítems de pedidos pendientes" }, { status: 409 });
  }

  const pedidoActualizado = await prisma.$transaction(async (tx) => {
    await tx.itemPedido.delete({ where: { id: itemIdNum } });

    const itemsRestantes = await tx.itemPedido.findMany({
      where: { pedidoId },
      select: { subtotal: true },
    });

    const nuevoTotal = itemsRestantes.reduce((s, i) => s + Number(i.subtotal), 0);

    // Si no quedan ítems, cancelar el pedido
    if (itemsRestantes.length === 0) {
      return tx.pedido.update({
        where: { id: pedidoId },
        data: { total: 0, estado: "CANCELADO" },
        select: { id: true, total: true, estado: true },
      });
    }

    return tx.pedido.update({
      where: { id: pedidoId },
      data: { total: nuevoTotal },
      select: { id: true, total: true, estado: true },
    });
  });

  return Response.json({
    pedido: { ...pedidoActualizado, total: Number(pedidoActualizado.total) },
    itemsRestantes: await prisma.itemPedido.count({ where: { pedidoId } }),
  });
}
