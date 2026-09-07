/**
 * lib/limiteSemana.ts
 * El límite de compra (LimiteCompra) se guarda por semana, pero montoMaximo y
 * cantidadMaxima deben persistir automáticamente con el último valor capturado
 * hasta que el admin los cambie. comprasAbiertas siempre inicia en true (abierto).
 */
import { prisma } from "@/lib/prisma";
import type { LimiteCompra } from "../app/generated/prisma/client";

/** Devuelve el límite de `semana`, creándolo a partir del último capturado si no existe aún. */
export async function obtenerLimiteSemana(semana: Date): Promise<LimiteCompra | null> {
  const actual = await prisma.limiteCompra.findUnique({ where: { semana } });
  if (actual) return actual;

  const anterior = await prisma.limiteCompra.findFirst({
    where: { semana: { lt: semana } },
    orderBy: { semana: "desc" },
  });
  if (!anterior) return null;

  try {
    return await prisma.limiteCompra.create({
      data: {
        semana,
        montoMaximo: anterior.montoMaximo,
        cantidadMaxima: anterior.cantidadMaxima,
        comprasAbiertas: true,
      },
    });
  } catch {
    // Otra petición concurrente ya lo creó
    return prisma.limiteCompra.findUnique({ where: { semana } });
  }
}
