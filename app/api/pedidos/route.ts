/**
 * POST /api/pedidos
 * Crea un nuevo pedido con todas las validaciones de negocio aplicadas.
 *
 * Validaciones:
 *  1. Cada ítem no supera maxPorPedido del ProductoSucursal.
 *  2. El total no supera el LimiteCompra de la semana.
 *  3. El empleado no tiene ya un pedido en la misma sucursal y semana.
 *  4. Los productos están disponibles y tienen stock suficiente.
 *
 * GET /api/pedidos?empleadoId=1&sucursalId=2
 * Devuelve el pedido activo del empleado en esa sucursal para la semana.
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import {
  CrearPedidoSchema,
  getMondayUTC,
  type ErrorValidacion,
} from "@/lib/validaciones";

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sucursalId = Number(searchParams.get("sucursalId"));

  if (!sucursalId) {
    return Response.json({ error: "sucursalId es requerido" }, { status: 400 });
  }

  const semana = getMondayUTC();
  const noEmpleadoQ = searchParams.get("noEmpleado") ?? "";
  const pedido = await prisma.pedido.findUnique({
    where: { noEmpleado_sucursalId_semana: { noEmpleado: noEmpleadoQ, sucursalId, semana } },
    include: { items: { include: { producto: true } } },
  });

  return Response.json(pedido ?? null);
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CrearPedidoSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { noEmpleado, nombreEmpleado, emailEmpleado, sucursalId, items } = parsed.data;
  const semana = getMondayUTC();

  const sucursal = await prisma.sucursal.findUnique({ where: { id: sucursalId } });
  if (!sucursal) {
    return Response.json({ error: { code: "SUCURSAL_NO_ENCONTRADA", message: "Sucursal no encontrada" } }, { status: 400 });
  }

  // Verificar que no existe pedido previo esta semana para este colaborador
  const pedidoExistente = await prisma.pedido.findUnique({
    where: { noEmpleado_sucursalId_semana: { noEmpleado, sucursalId, semana } },
  });
  if (pedidoExistente) {
    const error: ErrorValidacion = { tipo: "PEDIDO_DUPLICADO" };
    return Response.json({ error }, { status: 409 });
  }

  // Cargar los ProductoSucursal de los ítems solicitados
  const productoSucursalIds = items.map((i) => i.productoSucursalId);
  const catálogo = await prisma.productoSucursal.findMany({
    where: {
      id: { in: productoSucursalIds },
      sucursalId,
      semana,
      disponible: true,
    },
    include: { producto: { select: { nombre: true, maxCantidad: true } } },
  });
  if (catálogo.length !== items.length) {
    const catálogoIds = catálogo.map((c) => c.id);
    const faltantes = productoSucursalIds.filter((id) => !catálogoIds.includes(id));
    return Response.json(
      { error: { code: "PRODUCTOS_NO_DISPONIBLES", message: "Uno o más productos no están disponibles en esta sucursal.", faltantes } },
      { status: 400 }
    );
  }

  // Validar cantidad por producto y stock
  for (const item of items) {
    const ps = catálogo.find((c: (typeof catálogo)[number]) => c.id === item.productoSucursalId)!;

    if (item.cantidad > ps.producto.maxCantidad) {
      const error: ErrorValidacion = {
        tipo: "CANTIDAD_EXCEDIDA",
        productoNombre: ps.producto.nombre,
        max: ps.producto.maxCantidad,
      };
      return Response.json({ error }, { status: 400 });
    }

    if (ps.stock > 0 && item.cantidad > ps.stock) {
      const error: ErrorValidacion = {
        tipo: "STOCK_INSUFICIENTE",
        productoNombre: ps.producto.nombre,
        disponible: ps.stock,
      };
      return Response.json({ error }, { status: 400 });
    }
  }

  // Calcular total
  const total = items.reduce((acc: number, item: (typeof items)[number]) => {
    const ps = catálogo.find((c: (typeof catálogo)[number]) => c.id === item.productoSucursalId)!;
    return acc + Number(ps.precio) * item.cantidad;
  }, 0);

  // Validar límite de compra (global — igual para todas las sucursales)
  const limite = await prisma.limiteCompra.findUnique({
    where: { semana },
  });

  // Si las compras están cerradas para la semana, bloquear creación de pedidos
  if (limite && limite.comprasAbiertas === false) {
    const error: ErrorValidacion = { tipo: "COMPRAS_CERRADAS" };
    return Response.json({ error }, { status: 403 });
  }

  if (limite && limite.montoMaximo !== null && total > Number(limite.montoMaximo)) {
    const error: ErrorValidacion = {
      tipo: "MONTO_EXCEDIDO",
      montoMaximo: Number(limite.montoMaximo),
      montoActual: total,
    };
    return Response.json({ error }, { status: 400 });
  }

  // Validar límite de cantidad total (piezas/kg)
  if (limite && limite.cantidadMaxima !== null) {
    const totalCantidad = items.reduce(
      (acc: number, item: (typeof items)[number]) => acc + item.cantidad,
      0
    );
    if (totalCantidad > limite.cantidadMaxima) {
      const error: ErrorValidacion = {
        tipo: "CANTIDAD_TOTAL_EXCEDIDA",
        cantidadMaxima: limite.cantidadMaxima,
        cantidadActual: totalCantidad,
      };
      return Response.json({ error }, { status: 400 });
    }
  }

  // Crear pedido en transacción atómica
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pedido = await prisma.$transaction(async (tx: any) => {
      const nuevoPedido = await tx.pedido.create({
        data: {
          noEmpleado,
          nombreEmpleado,
          emailEmpleado: emailEmpleado || null,
          sucursalId,
          semana,
          total,
          items: {
            create: items.map((item: (typeof items)[number]) => {
              const ps = catálogo.find((c: (typeof catálogo)[number]) => c.id === item.productoSucursalId)!;
              return {
                productoId: ps.productoId,
                cantidad: item.cantidad,
                precioUnit: ps.precio,
                subtotal: Number(ps.precio) * item.cantidad,
              };
            }),
          },
        },
        include: { items: true },
      });

      // Decrementar stock solo si es stock controlado (> 0)
      for (const item of items) {
        const ps = catálogo.find((c: (typeof catálogo)[number]) => c.id === item.productoSucursalId)!;
        if (ps.stock > 0) {
          await tx.productoSucursal.update({
            where: { id: ps.id },
            data: { stock: { decrement: item.cantidad } },
          });
        }
      }

      return nuevoPedido;
    });

    return Response.json(pedido, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return Response.json({ error: { code: "PRISMA_KNOWN_ERROR", message: err.message } }, { status: 400 });
    }

    // Error inesperado
    // eslint-disable-next-line no-console
    console.error("Error creando pedido:", err);
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Error interno al crear el pedido" } }, { status: 500 });
  }
}
