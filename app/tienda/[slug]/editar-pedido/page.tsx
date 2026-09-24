import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { asegurarCatalogoSemana } from "@/lib/catalogoSemana";
import { getMondayUTC, formatearNoEmpleado } from "@/lib/validaciones";
import { obtenerLimiteSemana } from "@/lib/limiteSemana";
import PedidoEditor from "@/components/tienda/PedidoEditor";
import type { ProductoCatalogo, ItemCarrito } from "@/types/tienda";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pedidoId?: string; noEmpleado?: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditarPedidoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const pedidoId = Number(query.pedidoId);
  const noEmpleado = formatearNoEmpleado(query.noEmpleado ?? "");
  const semana = getMondayUTC();

  if (!Number.isInteger(pedidoId) || pedidoId <= 0 || !noEmpleado) notFound();

  const pedido = await prisma.pedido.findFirst({
    where: { id: pedidoId, noEmpleado, semana, estado: { in: ["PENDIENTE", "CONFIRMADO"] } },
    include: {
      sucursal: { select: { id: true, nombre: true, slug: true } },
      items: { include: { producto: { select: { id: true, nombre: true } } } },
    },
  });

  if (!pedido || pedido.sucursal.slug !== slug) notFound();

  await asegurarCatalogoSemana(semana);
  const productosSucursal = await prisma.productoSucursal.findMany({
    where: {
      sucursalId: pedido.sucursalId,
      semana,
      disponible: true,
      producto: { activo: true },
    },
    include: {
      producto: { select: { id: true, nombre: true, unidad: true, imagenUrl: true, maxCantidad: true } },
    },
    orderBy: { producto: { nombre: "asc" } },
  });
  const limite = await obtenerLimiteSemana(semana);

  const productos: ProductoCatalogo[] = productosSucursal.map((productoSucursal) => {
    const itemActual = pedido.items.find((item) => item.productoId === productoSucursal.productoId);
    return {
      productoSucursalId: productoSucursal.id,
      productoId: productoSucursal.productoId,
      nombre: productoSucursal.producto.nombre,
      unidad: productoSucursal.producto.unidad,
      imagenUrl: productoSucursal.producto.imagenUrl,
      precio: Number(productoSucursal.precio),
      maxCantidad: productoSucursal.producto.maxCantidad,
      stock: productoSucursal.stock === null ? null : productoSucursal.stock + (itemActual?.cantidad ?? 0),
    };
  });

  const productosMap = new Map(productos.map((producto) => [producto.productoId, producto]));
  const itemsIniciales = pedido.items.reduce<ItemCarrito[]>((items, item) => {
      const producto = productosMap.get(item.productoId);
      if (producto) items.push({ ...producto, cantidad: item.cantidad });
      return items;
    }, []);

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <a href="/tienda" className="rounded-lg p-2 text-3xl text-gray-400 hover:bg-gray-100" aria-label="Volver a la tienda">←</a>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400">Modificar pedido #{pedido.id}</p>
            <h1 className="text-lg font-extrabold text-green-800">{pedido.sucursal.nombre}</h1>
          </div>
        </div>
      </header>
      <PedidoEditor
        pedidoId={pedido.id}
        noEmpleado={noEmpleado}
        sucursalNombre={pedido.sucursal.nombre}
        productos={productos}
        itemsIniciales={itemsIniciales}
        limiteCompra={limite?.montoMaximo === null || limite?.montoMaximo === undefined ? null : Number(limite.montoMaximo)}
        cantidadMaxima={limite?.cantidadMaxima ?? null}
      />
    </main>
  );
}
