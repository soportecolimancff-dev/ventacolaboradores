/**
 * prisma/seed.ts
 * Datos iniciales para Coliman.
 * Ejecutar con: npx prisma db seed
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  // ── Sucursales ──────────────────────────────────────────────────────────
  const sucursales = await Promise.all([
    prisma.sucursal.upsert({
      where: { slug: "mexicali-abastos" },
      update: {},
      create: { nombre: "Mexicali Abastos", slug: "mexicali-abastos" },
    }),
    prisma.sucursal.upsert({
      where: { slug: "mexicali-centro" },
      update: {},
      create: { nombre: "Mexicali Centro", slug: "mexicali-centro" },
    }),
    prisma.sucursal.upsert({
      where: { slug: "tijuana-ermita" },
      update: {},
      create: { nombre: "Tijuana Ermita", slug: "tijuana-ermita" },
    }),
    prisma.sucursal.upsert({
      where: { slug: "ensenada" },
      update: {},
      create: { nombre: "Ensenada", slug: "ensenada" },
    }),
  ]);

  console.log(`✅  ${sucursales.length} sucursales creadas`);

  // ── Productos maestros ───────────────────────────────────────────────────
  const productos = await Promise.all([
    prisma.producto.upsert({
      where: { id: 1 },
      update: {},
      create: {
        nombre: "Manzana Roja",
        unidad: "Kg",
        imagenUrl: "🍎",
        maxCantidad: 5,
      },
    }),
    prisma.producto.upsert({
      where: { id: 2 },
      update: {},
      create: {
        nombre: "Plátano Tabasco",
        unidad: "Kg",
        imagenUrl: "🍌",
        maxCantidad: 5,
      },
    }),
    prisma.producto.upsert({
      where: { id: 3 },
      update: {},
      create: {
        nombre: "Naranja Valencia",
        unidad: "Kg",
        imagenUrl: "🍊",
        maxCantidad: 5,
      },
    }),
    prisma.producto.upsert({
      where: { id: 4 },
      update: {},
      create: {
        nombre: "Uva Verde",
        unidad: "Kg",
        imagenUrl: "🍇",
        maxCantidad: 5,
      },
    }),
  ]);

  console.log(`✅  ${productos.length} productos creados`);

  // ── Catálogo semanal (periodo de jueves a miércoles) ──────────────────────
  const semana = getMonday(new Date());

  for (const sucursal of sucursales) {
    for (const producto of productos) {
      await prisma.productoSucursal.upsert({
        where: {
          productoId_sucursalId_semana: {
            productoId: producto.id,
            sucursalId: sucursal.id,
            semana,
          },
        },
        update: {},
        create: {
          productoId: producto.id,
          sucursalId: sucursal.id,
          semana,
          precio: 35.0,
          stock: 50,
          disponible: true,
        },
      });
    }
  }

  // ── Límite de compra global (una sola vez) ──────────────────────────────
  await prisma.limiteCompra.upsert({
    where: { semana },
    update: {},
    create: { semana, montoMaximo: 300.0 },
  });

  console.log(`✅  Catálogo semanal sembrado para la semana del ${semana.toISOString().slice(0, 10)}`);
}

/** Devuelve el jueves de inicio del periodo que contiene la fecha dada (00:00 UTC). */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = domingo
  const diff = day >= 4 ? 4 - day : -3 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
