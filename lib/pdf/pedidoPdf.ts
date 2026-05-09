/**
 * lib/pdf/pedidoPdf.ts
 * Genera y descarga el PDF de confirmación de pedido con diseño Fruta Coliman.
 * Se ejecuta solo en el cliente (browser).
 */
import type { ItemCarrito } from "@/types/tienda";

export interface DatosPedidoPdf {
  pedidoId: number;
  noEmpleado: string;
  nombreEmpleado: string;
  emailEmpleado?: string;
  sucursal: string;
  items: Pick<ItemCarrito, "nombre" | "precio" | "cantidad">[];
  total: number;
  fechaPedido: Date;
}

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtFecha(d: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Convierte hex a RGB para jsPDF
function hex(h: string): [number, number, number] {
  const v = parseInt(h.replace("#", ""), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export async function generarPdfPedido(datos: DatosPedidoPdf): Promise<void> {
  // Importación dinámica para no penalizar el SSR
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210; // ancho A4 en mm
  const M = 18;  // margen lateral
  const CONT = W - M * 2; // ancho contenido

  // ── Paleta Coliman ──────────────────────────────────────────────────────────
  const VERDE_OSCURO = hex("#14532d");
  const VERDE_MED    = hex("#166534");
  const VERDE_LIGHT  = hex("#dcfce7");
  const VERDE_TEXT   = hex("#15803d");
  const GRIS_CLARO   = hex("#f9fafb");
  const GRIS_BORDE   = hex("#e5e7eb");
  const TEXTO        = hex("#1a1a1a");
  const SUBTEXTO     = hex("#6b7280");
  const AMBER_BG     = hex("#fffbeb");
  const AMBER_BORDE  = hex("#fde68a");
  const AMBER_TEXT   = hex("#92400e");

  let y = 0;

  // ── Header verde ────────────────────────────────────────────────────────────
  doc.setFillColor(...VERDE_OSCURO);
  doc.rect(0, 0, W, 42, "F");

  // Degradado simulado (segunda capa más clara)
  doc.setFillColor(...VERDE_MED);
  doc.rect(W / 2, 0, W / 2, 42, "F");

  // Emoji / icono (texto)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("VENTA A COLABORADORES", W / 2, 14, { align: "center" });

  // Título
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("COLIMAN FRUTAS FINAS", W / 2, 24, { align: "center" });

  // Subtítulo
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(187, 247, 208); // green-300
  doc.text("Comprobante de pedido registrado", W / 2, 31, { align: "center" });

  // N° Pedido badge
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(W / 2 - 22, 33, 44, 7, 2, 2, "F");
  doc.setTextColor(...VERDE_TEXT);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`PEDIDO  #${datos.pedidoId}`, W / 2, 37.8, { align: "center" });

  y = 50;

  // ── Mensaje de saludo ───────────────────────────────────────────────────────
  doc.setTextColor(...TEXTO);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Hola, ${datos.nombreEmpleado}`, M, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...SUBTEXTO);
  doc.text("Tu pedido ha sido registrado exitosamente. Conserva este comprobante.", M, y);
  y += 10;

  // ── Tarjeta de datos del pedido ─────────────────────────────────────────────
  doc.setFillColor(...VERDE_LIGHT);
  doc.setDrawColor(...VERDE_TEXT);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, CONT, 28, 3, 3, "FD");

  const col1 = M + 5;
  const col2 = M + CONT / 2 + 3;

  // Fila 1
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE_TEXT);
  doc.text("N° EMPLEADO", col1, y + 6);
  doc.text("SUCURSAL", col2, y + 6);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXTO);
  doc.text(datos.noEmpleado, col1, y + 12);
  doc.text(datos.sucursal, col2, y + 12);

  // Separador horizontal
  doc.setDrawColor(...VERDE_TEXT);
  doc.setLineWidth(0.2);
  doc.line(M + 4, y + 15, M + CONT - 4, y + 15);

  // Fila 2
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE_TEXT);
  doc.text("NOMBRE EMPLEADO", col1, y + 21);
  doc.text("FECHA Y HORA", col2, y + 21);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXTO);
  doc.text(datos.nombreEmpleado, col1, y + 26);
  doc.setFontSize(8);
  doc.text(fmtFecha(datos.fechaPedido), col2, y + 26);

  y += 35;

  // ── Encabezado tabla de productos ────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SUBTEXTO);
  doc.text("PRODUCTOS DEL PEDIDO", M, y);
  y += 4;

  // Cabecera tabla
  doc.setFillColor(...GRIS_CLARO);
  doc.setDrawColor(...GRIS_BORDE);
  doc.setLineWidth(0.2);
  doc.rect(M, y, CONT, 7, "FD");

  const COL_PROD  = M + 3;
  const COL_CANT  = M + CONT * 0.62;
  const COL_PREC  = M + CONT * 0.75;
  const COL_SUB   = M + CONT - 3;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SUBTEXTO);
  doc.text("PRODUCTO", COL_PROD, y + 4.7);
  doc.text("CANT.", COL_CANT, y + 4.7, { align: "center" });
  doc.text("PRECIO U.", COL_PREC, y + 4.7, { align: "right" });
  doc.text("SUBTOTAL", COL_SUB, y + 4.7, { align: "right" });
  y += 7;

  // Filas de productos
  datos.items.forEach((item, idx) => {
    const rowH = 8;
    const subtotal = item.precio * item.cantidad;

    // Fondo alternado
    if (idx % 2 === 1) {
      doc.setFillColor(...GRIS_CLARO);
      doc.rect(M, y, CONT, rowH, "F");
    }

    // Borde inferior fila
    doc.setDrawColor(...GRIS_BORDE);
    doc.setLineWidth(0.15);
    doc.line(M, y + rowH, M + CONT, y + rowH);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXTO);

    // Nombre puede ser largo — recortar si es necesario
    const nombre = doc.splitTextToSize(item.nombre, CONT * 0.58)[0] as string;
    doc.text(nombre, COL_PROD, y + 5.2);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...VERDE_TEXT);
    doc.text(String(item.cantidad), COL_CANT, y + 5.2, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SUBTEXTO);
    doc.text(`$${fmt(item.precio)}`, COL_PREC, y + 5.2, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXTO);
    doc.text(`$${fmt(subtotal)}`, COL_SUB, y + 5.2, { align: "right" });

    y += rowH;
  });

  y += 4;

  // ── Total ───────────────────────────────────────────────────────────────────
  const totalBoxW = 64;
  const totalBoxX = M + CONT - totalBoxW;
  doc.setFillColor(...VERDE_OSCURO);
  doc.roundedRect(totalBoxX, y, totalBoxW, 14, 3, 3, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(187, 247, 208);
  doc.text("TOTAL DEL PEDIDO", totalBoxX + totalBoxW / 2, y + 5, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`$${fmt(datos.total)}`, totalBoxX + totalBoxW / 2, y + 11.5, { align: "center" });

  y += 22;

  // ── Nota de aviso ────────────────────────────────────────────────────────────
  doc.setFillColor(...AMBER_BG);
  doc.setDrawColor(...AMBER_BORDE);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, CONT, 18, 3, 3, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...AMBER_TEXT);
  doc.text("Nota importante", M + 4, y + 6);

  doc.setFont("helvetica", "normal");
  const nota =
    "Este documento es únicamente un comprobante de que tu pedido fue registrado. " +
    "El pago y la entrega del producto se realizarán conforme al proceso habitual de tu sucursal.";
  const notaLines = doc.splitTextToSize(nota, CONT - 8) as string[];
  doc.text(notaLines, M + 4, y + 11);

  y += 24;

  // ── Email si existe ─────────────────────────────────────────────────────────
  if (datos.emailEmpleado) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SUBTEXTO);
    doc.text(`Correo registrado: ${datos.emailEmpleado}`, M, y);
    y += 7;
  }

  // ── Pie de página ────────────────────────────────────────────────────────────
  const footerY = 285;
  doc.setDrawColor(...GRIS_BORDE);
  doc.setLineWidth(0.3);
  doc.line(M, footerY, W - M, footerY);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SUBTEXTO);
  doc.text("Fruta Coliman · Sistema de pedidos colaboradores", W / 2, footerY + 5, { align: "center" });
  doc.text("Documento generado automáticamente — no requiere firma.", W / 2, footerY + 9, { align: "center" });

  // ── Descargar ────────────────────────────────────────────────────────────────
  doc.save(`comprobante_pedido_${datos.pedidoId}.pdf`);
}
