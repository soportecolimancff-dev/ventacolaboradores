/**
 * POST /api/admin/pedidos/[id]/items — agrega un producto del catálogo de la semana al pedido
 *
 * Solo se permite agregar productos a pedidos en estado PENDIENTE.
 * El producto debe pertenecer al catálogo (ProductoSucursal) de la misma
 * sucursal y semana del pedido, estar disponible y con el producto activo.
 * Si el producto ya existe en el pedido, se suma la cantidad al ítem existente.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const PostSchema = z.object({
  productoSucursalId: z.number().int().positive(),
  cantidad: z.number().int().min(1),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const pedidoId = Number(id);

  const body = await req.json();
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { productoSucursalId, cantidad } = parsed.data;

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    select: { id: true, estado: true, sucursalId: true, semana: true },
  });

  if (!pedido) {
    return Response.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (pedido.estado !== "PENDIENTE") {
    return Response.json({ error: "Solo se pueden agregar productos a pedidos pendientes" }, { status: 409 });
  }

  const ps = await prisma.productoSucursal.findUnique({
    where: { id: productoSucursalId },
    include: { producto: true },
  });

  if (!ps || ps.sucursalId !== pedido.sucursalId || ps.semana.getTime() !== pedido.semana.getTime()) {
    return Response.json({ error: "El producto no pertenece al catálogo de esta sucursal/semana" }, { status: 404 });
  }

  if (!ps.disponible || !ps.producto.activo) {
    return Response.json({ error: "El producto no está disponible esta semana" }, { status: 409 });
  }

  const itemExistente = await prisma.itemPedido.findFirst({
    where: { pedidoId, productoId: ps.productoId },
  });

  const cantidadTotalDeseada = (itemExistente?.cantidad ?? 0) + cantidad;

  if (cantidadTotalDeseada > ps.producto.maxCantidad) {
    return Response.json(
      { error: `La cantidad máxima permitida para ${ps.producto.nombre} es ${ps.producto.maxCantidad}` },
      { status: 422 }
    );
  }

  if (ps.stock !== null && cantidad > ps.stock) {
    return Response.json(
      { error: `Stock insuficiente de ${ps.producto.nombre}. Disponible: ${ps.stock}` },
      { status: 409 }
    );
  }

  const precioUnit = Number(ps.precio);

  const [itemResultado, pedidoActualizado] = await prisma.$transaction(async (tx) => {
    if (ps.stock !== null) {
      await tx.productoSucursal.update({
        where: { id: ps.id },
        data: { stock: { decrement: cantidad } },
      });
    }

    const item = itemExistente
      ? await tx.itemPedido.update({
          where: { id: itemExistente.id },
          data: {
            cantidad: cantidadTotalDeseada,
            subtotal: precioUnit * cantidadTotalDeseada,
          },
        })
      : await tx.itemPedido.create({
          data: {
            pedidoId,
            productoId: ps.productoId,
            cantidad,
            precioUnit,
            subtotal: precioUnit * cantidad,
          },
        });

    const items = await tx.itemPedido.findMany({ where: { pedidoId }, select: { subtotal: true } });
    const nuevoTotal = items.reduce((s, i) => s + Number(i.subtotal), 0);

    const pedidoUpd = await tx.pedido.update({
      where: { id: pedidoId },
      data: { total: nuevoTotal },
      select: { id: true, total: true },
    });

    return [item, pedidoUpd];
  });

  return Response.json(
    {
      item: {
        id: itemResultado.id,
        productoId: itemResultado.productoId,
        cantidad: itemResultado.cantidad,
        precioUnit: Number(itemResultado.precioUnit),
        subtotal: Number(itemResultado.subtotal),
        producto: {
          nombre: ps.producto.nombre,
          cantidadPorCaja: ps.producto.cantidadPorCaja,
          unidad: ps.producto.unidad,
        },
      },
      pedido: { id: pedidoActualizado.id, total: Number(pedidoActualizado.total) },
      esNuevo: !itemExistente,
    },
    { status: 201 }
  );
}
