import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatearNoEmpleado, getMondayUTC, type ErrorValidacion } from "@/lib/validaciones";
import { obtenerLimiteSemana } from "@/lib/limiteSemana";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ItemActualizado {
  productoSucursalId: number;
  cantidad: number;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const pedidoId = Number(id);
  const body = await req.json() as { noEmpleado?: string; items?: ItemActualizado[] };
  const noEmpleado = formatearNoEmpleado(body.noEmpleado ?? "");
  const items = body.items ?? [];
  const semana = getMondayUTC();

  if (!Number.isInteger(pedidoId) || pedidoId <= 0 || !noEmpleado || !Array.isArray(body.items)) {
    return Response.json({ error: { code: "DATOS_INVALIDOS", message: "Datos de actualización inválidos" } }, { status: 400 });
  }
  if (items.length === 0) {
    return Response.json({ error: { code: "PEDIDO_VACIO", message: "El pedido debe conservar al menos un producto" } }, { status: 400 });
  }
  if (items.some((item) => !Number.isInteger(item.productoSucursalId) || !Number.isInteger(item.cantidad) || item.cantidad < 1)) {
    return Response.json({ error: { code: "CANTIDADES_INVALIDAS", message: "Revisa las cantidades del pedido" } }, { status: 400 });
  }
  if (new Set(items.map((item) => item.productoSucursalId)).size !== items.length) {
    return Response.json({ error: { code: "PRODUCTOS_DUPLICADOS", message: "Un producto no puede aparecer dos veces" } }, { status: 400 });
  }

  const pedido = await prisma.pedido.findFirst({
    where: { id: pedidoId, noEmpleado, semana, estado: { in: ["PENDIENTE", "CONFIRMADO"] } },
    include: { items: true },
  });
  if (!pedido) {
    return Response.json({ error: { code: "PEDIDO_NO_ENCONTRADO", message: "Pedido no encontrado" } }, { status: 404 });
  }

  const limite = await obtenerLimiteSemana(semana);
  if (limite?.comprasAbiertas === false) {
    const error: ErrorValidacion = { tipo: "COMPRAS_CERRADAS" };
    return Response.json({ error }, { status: 403 });
  }

  const ids = items.map((item) => item.productoSucursalId);
  const productosAnteriores = pedido.items.map((item) => item.productoId);
  const productosSucursal = await prisma.productoSucursal.findMany({
    where: {
      id: { in: ids },
      sucursalId: pedido.sucursalId,
      semana,
      producto: { activo: true },
      OR: [
        { disponible: true },
        { productoId: { in: productosAnteriores } },
      ],
    },
    include: { producto: { select: { nombre: true, maxCantidad: true } } },
  });
  const productosMap = new Map(productosSucursal.map((producto) => [producto.id, producto]));
  const productosFaltantes = ids.filter((idProducto) => !productosMap.has(idProducto));
  if (productosFaltantes.length > 0) {
    return Response.json({ error: { code: "PRODUCTOS_NO_DISPONIBLES", message: "Uno o más productos ya no están disponibles" } }, { status: 400 });
  }

  const cantidadesAnteriores = new Map(pedido.items.map((item) => [item.productoId, item.cantidad]));
  let total = 0;
  let cantidadTotal = 0;
  for (const item of items) {
    const productoSucursal = productosMap.get(item.productoSucursalId)!;
    const cantidadAnterior = cantidadesAnteriores.get(productoSucursal.productoId) ?? 0;
    const stockDisponible = productoSucursal.stock === null ? null : productoSucursal.stock + cantidadAnterior;

    if (item.cantidad > productoSucursal.producto.maxCantidad) {
      const error: ErrorValidacion = {
        tipo: "CANTIDAD_EXCEDIDA",
        productoNombre: productoSucursal.producto.nombre,
        max: productoSucursal.producto.maxCantidad,
      };
      return Response.json({ error }, { status: 400 });
    }
    if (stockDisponible !== null && item.cantidad > stockDisponible) {
      const error: ErrorValidacion = {
        tipo: "STOCK_INSUFICIENTE",
        productoNombre: productoSucursal.producto.nombre,
        disponible: Math.max(0, stockDisponible),
      };
      return Response.json({ error }, { status: 400 });
    }
    total += Number(productoSucursal.precio) * item.cantidad;
    cantidadTotal += item.cantidad;
  }

  if (limite?.montoMaximo !== null && limite?.montoMaximo !== undefined && total > Number(limite.montoMaximo)) {
    const error: ErrorValidacion = { tipo: "MONTO_EXCEDIDO", montoMaximo: Number(limite.montoMaximo), montoActual: total };
    return Response.json({ error }, { status: 400 });
  }
  if (limite?.cantidadMaxima !== null && limite?.cantidadMaxima !== undefined && cantidadTotal > limite.cantidadMaxima) {
    const error: ErrorValidacion = { tipo: "CANTIDAD_TOTAL_EXCEDIDA", cantidadMaxima: limite.cantidadMaxima, cantidadActual: cantidadTotal };
    return Response.json({ error }, { status: 400 });
  }

  try {
    const pedidoActualizado = await prisma.$transaction(async (tx) => {
      const pedidoTransaccion = await tx.pedido.findUnique({
        where: { id: pedido.id },
        include: { items: true },
      });
      if (!pedidoTransaccion || pedidoTransaccion.noEmpleado !== noEmpleado || pedidoTransaccion.semana.getTime() !== semana.getTime()) {
        throw new Error("PEDIDO_CAMBIO");
      }

      const cantidadesNuevas = new Map(
        items.map((item) => [productosMap.get(item.productoSucursalId)!.productoId, item.cantidad])
      );
      const productosAjustar = new Set([
        ...pedidoTransaccion.items.map((item) => item.productoId),
        ...cantidadesNuevas.keys(),
      ]);

      for (const productoId of productosAjustar) {
        const productoAnterior = pedidoTransaccion.items.find((item) => item.productoId === productoId);
        const productoNuevo = productosSucursal.find((item) => item.productoId === productoId);
        if (!productoNuevo) continue;
        const diferencia = (cantidadesNuevas.get(productoId) ?? 0) - (productoAnterior?.cantidad ?? 0);
        if (productoNuevo.stock !== null && diferencia !== 0) {
          const stockActual = await tx.productoSucursal.findUnique({ where: { id: productoNuevo.id }, select: { stock: true } });
          if (stockActual?.stock !== null && stockActual && diferencia > stockActual.stock) {
            throw new Error(`VALIDATION_ERROR:${JSON.stringify({ tipo: "STOCK_INSUFICIENTE", productoNombre: productoNuevo.producto.nombre, disponible: Math.max(0, stockActual.stock) })}`);
          }
          await tx.productoSucursal.update({
            where: { id: productoNuevo.id },
            data: { stock: { increment: -diferencia } },
          });
        }
      }

      await tx.itemPedido.deleteMany({ where: { pedidoId: pedido.id } });
      return tx.pedido.update({
        where: { id: pedido.id },
        data: {
          total,
          estado: "PENDIENTE",
          items: {
            create: items.map((item) => {
              const productoSucursal = productosMap.get(item.productoSucursalId)!;
              return {
                productoId: productoSucursal.productoId,
                cantidad: item.cantidad,
                precioUnit: productoSucursal.precio,
                subtotal: Number(productoSucursal.precio) * item.cantidad,
              };
            }),
          },
        },
        include: { items: true },
      });
    });

    return Response.json({ id: pedidoActualizado.id, total: Number(pedidoActualizado.total) });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("VALIDATION_ERROR:")) {
      return Response.json({ error: JSON.parse(error.message.replace("VALIDATION_ERROR:", "")) }, { status: 400 });
    }
    if (error instanceof Error && error.message === "PEDIDO_CAMBIO") {
      return Response.json({ error: { code: "PEDIDO_CAMBIO", message: "El pedido cambió mientras lo actualizabas" } }, { status: 409 });
    }
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "No se pudo actualizar el pedido" } }, { status: 500 });
  }
}
