/**
 * app/tienda/page.tsx  →  /tienda
 * Pantalla de selección de sucursal.
 * Server Component: fetches sucursales directamente desde la DB.
 */
import { prisma } from "@/lib/prisma";
import { getMondayUTC } from "@/lib/validaciones";
import SucursalSelector from "@/components/tienda/SucursalSelector";

export const metadata = {
  title: "Selecciona tu sucursal | Coliman Fruta",
};

export default async function TiendaPage() {
  const sucursales = await prisma.sucursal.findMany({
    where: { activa: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, slug: true },
  });
  const semana = getMondayUTC();
  const limite = await prisma.limiteCompra.findUnique({ where: { semana } });
  const comprasAbiertas = limite?.comprasAbiertas ?? true;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white px-4 py-12">
      {/* Logo / encabezado */}
      <div className="mb-10 text-center">
        <p className="text-5xl mb-3">🍊</p>
        <h1 className="text-3xl font-extrabold text-green-800">Fruta Coliman</h1>
        <p className="mt-2 text-gray-500">¿En qué sucursal recogerás tus frutas esta semana?</p>
      </div>

      <div className="w-full max-w-md">
        <SucursalSelector sucursales={sucursales} comprasAbiertas={comprasAbiertas} />
      </div>
    </main>
  );
}
