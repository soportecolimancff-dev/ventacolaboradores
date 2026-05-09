/**
 * lib/validaciones.ts
 * Reglas de negocio compartidas: se usan en el backend (Route Handlers)
 * y se pueden importar en el frontend para feedback inmediato de UX.
 */
import { z } from "zod";

// ── Esquemas Zod ─────────────────────────────────────────────────────────────

export const ItemCarritoSchema = z.object({
  productoSucursalId: z.number().int().positive(),
  cantidad: z.number().int().min(1),
});

export const CrearPedidoSchema = z.object({
  noEmpleado: z.string().trim().min(1, "El número de empleado es requerido"),
  nombreEmpleado: z.string().trim().min(2, "El nombre es requerido"),
  emailEmpleado: z.string().trim().email("Correo inválido").optional().or(z.literal("")),
  sucursalId: z.number().int().positive(),
  items: z.array(ItemCarritoSchema).min(1, "El carrito no puede estar vacío"),
});

export type ItemCarrito = z.infer<typeof ItemCarritoSchema>;
export type CrearPedidoInput = z.infer<typeof CrearPedidoSchema>;

// ── Helpers de utilidad ───────────────────────────────────────────────────────

/** Devuelve el lunes 00:00 UTC de la semana que contiene `date`. */
export function getMondayUTC(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ── Errores tipados ───────────────────────────────────────────────────────────

export type ErrorValidacion =
  | { tipo: "CANTIDAD_EXCEDIDA"; productoNombre: string; max: number }
  | { tipo: "MONTO_EXCEDIDO"; montoMaximo: number; montoActual: number }
  | { tipo: "CANTIDAD_TOTAL_EXCEDIDA"; cantidadMaxima: number; cantidadActual: number }
  | { tipo: "PEDIDO_DUPLICADO" }
  | { tipo: "PRODUCTO_NO_DISPONIBLE"; productoNombre: string }
  | { tipo: "STOCK_INSUFICIENTE"; productoNombre: string; disponible: number };
