/**
 * app/tienda/[slug]/page.tsx  →  /tienda/mexicali-centro  etc.
 * Catálogo de productos para la sucursal seleccionada.
 * Server Component: obtiene datos de DB + pasa al cliente solo lo necesario.
 */
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMondayUTC } from "@/lib/validaciones";
import ProductoCard from "@/components/tienda/ProductoCard";
import CarritoDrawer from "@/components/tienda/CarritoDrawer";
import LimiteIndicator from "@/components/tienda/LimiteIndicator";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sucursal = await prisma.sucursal.findUnique({
    where: { slug },
    select: { nombre: true },
  });
  return { title: `${sucursal?.nombre ?? "Sucursal"} | Fruta Coliman` };
}

export default async function CatalogoPage({ params }: Props) {
  const { slug } = await params;
  const semana = getMondayUTC();

  const sucursal = await prisma.sucursal.findUnique({
    where: { slug, activa: true },
    select: { id: true, nombre: true, slug: true },
  });

  if (!sucursal) notFound();

  const productosSucursal = await prisma.productoSucursal.findMany({
    where: { sucursalId: sucursal.id, semana, disponible: true },
    include: {
      producto: { select: { id: true, nombre: true, descripcion: true, imagenUrl: true, maxCantidad: true } },
    },
    orderBy: { producto: { nombre: "asc" } },
  });

  const limite = await prisma.limiteCompra.findUnique({
    where: { semana },
  });

  // Si las compras están cerradas para la semana, redirigir al selector de sucursal
  if (limite && limite.comprasAbiertas === false) {
    redirect("/tienda");
  }

  const productos = productosSucursal.map((ps: (typeof productosSucursal)[number]) => ({
    productoSucursalId: ps.id,
    productoId: ps.productoId,
    nombre: ps.producto.nombre,
    descripcion: ps.producto.descripcion,
    imagenUrl: ps.producto.imagenUrl,
    precio: Number(ps.precio),
    maxCantidad: ps.producto.maxCantidad,
    stock: ps.stock,
  }));

  const limiteCompra = limite && limite.montoMaximo !== null ? Number(limite.montoMaximo) : null;
  const cantidadMaxima = limite && limite.cantidadMaxima !== null ? Number(limite.cantidadMaxima) : null;

  return (
    <main className="min-h-screen bg-gray-50 pb-32">
      {/* Header de sucursal */}
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <a
            href="/tienda"
            className="rounded-lg p-2 text-gray-400 text-3xl hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cambiar sucursal"
          >
            ←
          </a>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Sucursal</p>
            <h1 className="text-lg font-extrabold text-green-800">{sucursal.nombre}</h1>
          </div>
          {(limiteCompra !== null || cantidadMaxima !== null) && (
            <LimiteIndicator monto={limiteCompra} cantidad={cantidadMaxima} />
          )}
        </div>
      </header>

      {/* Catálogo */}
      <section className="mx-auto max-w-2xl px-4 pt-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Productos disponibles esta semana
        </h2>

        {productos.length === 0 ? (
          <div className="mt-20 text-center text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p>No hay productos disponibles esta semana.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {productos.map((p: (typeof productos)[number]) => (
              <ProductoCard
                key={p.productoSucursalId}
                producto={p}
                limiteCompra={limiteCompra}
                cantidadMaxima={cantidadMaxima}
              />
            ))}
          </div>
        )}
      </section>

      {/* Carrito flotante */}
      <CarritoDrawer sucursalId={sucursal.id} sucursalNombre={sucursal.nombre} />
    </main>
  );
}
