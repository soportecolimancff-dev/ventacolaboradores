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

/**
 * Renderiza un emoji en un <canvas> usando la fuente de emoji del navegador
 * y devuelve un Data URL PNG listo para addImage().
 */
function emojiPng(emoji: string, sizePx = 64): string {
  const canvas = document.createElement("canvas");
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, sizePx, sizePx);
  ctx.font = `${Math.round(sizePx * 0.78)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, sizePx / 2, sizePx / 2 + 2);
  return canvas.toDataURL("image/png");
}

export async function generarPdfPedido(datos: DatosPedidoPdf): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W    = 210;       // ancho A4 mm
  const M    = 16;        // margen lateral
  const CONT = W - M * 2; // ancho de contenido

  // ── Paleta ──────────────────────────────────────────────────────────────────
  const VERDE_OSCURO  = hex("#14532d");
  const VERDE_MED     = hex("#166534");
  const VERDE_BRIGHT  = hex("#16a34a");
  const VERDE_LIGHT   = hex("#dcfce7");
  const VERDE_XLIGHT  = hex("#f0fdf4");
  const VERDE_TEXT    = hex("#15803d");
  const VERDE_BORDER  = hex("#86efac");
  const GRIS_CLARO    = hex("#f8fafc");
  const GRIS_BORDE    = hex("#e2e8f0");
  const TEXTO         = hex("#0f172a");
  const SUBTEXTO      = hex("#64748b");
  const AMBER_BG      = hex("#fffbeb");
  const AMBER_BORDE   = hex("#fcd34d");
  const AMBER_TEXT    = hex("#92400e");
  const AMBER_DARK    = hex("#78350f");
  const BLANCO: [number, number, number] = [255, 255, 255];
  const GREEN_300: [number, number, number] = [187, 247, 208];

  // ── Logo de marca (único emoji) ──────────────────────────────────────────────
  const imgFruta = emojiPng("🍊", 80);

  let y = 0;

  // ════════════════════════════════════════════════════════════════════════════
  // HEADER
  // ════════════════════════════════════════════════════════════════════════════

  // Fondo principal
  doc.setFillColor(...VERDE_OSCURO);
  doc.rect(0, 0, W, 52, "F");

  // Franja derecha más clara
  doc.setFillColor(...VERDE_MED);
  doc.rect(W * 0.56, 0, W * 0.44, 52, "F");

  // Círculos decorativos de fondo
  doc.setFillColor(...VERDE_BRIGHT);
  doc.circle(W - 6, -8, 28, "F");
  doc.circle(W - 28, 58, 18, "F");
  doc.setFillColor(...VERDE_MED);
  doc.circle(6, 58, 14, "F");

  // Logo emoji fruta
  doc.addImage(imgFruta, "PNG", M, 7, 18, 18);

  // Nombre empresa
  doc.setFontSize(19);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLANCO);
  doc.text("FRUTA COLIMAN", M + 21, 17);

  // Subtítulo empresa
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREEN_300);
  doc.text("FRUTAS FINAS DE COLIMA", M + 21, 23);

  // Línea decorativa
  doc.setDrawColor(...GREEN_300);
  doc.setLineWidth(0.5);
  doc.line(M + 21, 25.5, M + 21 + 62, 25.5);

  // Etiqueta comprobante
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLANCO);
  doc.text("COMPROBANTE DE PEDIDO", M + 21, 32);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREEN_300);
  doc.text("Venta a colaboradores", M + 21, 38);

  // Badge número de pedido (esquina superior derecha)
  const bX = W - M - 40;
  doc.setFillColor(...BLANCO);
  doc.roundedRect(bX, 8, 42, 22, 4, 4, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE_TEXT);
  doc.text("N° PEDIDO", bX + 21, 14.5, { align: "center" });

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE_OSCURO);
  doc.text(`#${datos.pedidoId}`, bX + 21, 22.5, { align: "center" });

  y = 58;

  // ════════════════════════════════════════════════════════════════════════════
  // SALUDO
  // ════════════════════════════════════════════════════════════════════════════
  doc.setFontSize(12.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXTO);
  doc.text(`¡Hola, ${datos.nombreEmpleado}!`, M + 6, y);

  y += 5.5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SUBTEXTO);
  doc.text("Tu pedido fue registrado exitosamente. Guarda este comprobante.", M + 6, y);
  y += 9;

  // ════════════════════════════════════════════════════════════════════════════
  // TARJETA COLABORADOR
  // ════════════════════════════════════════════════════════════════════════════
  const CARD_H = 44;

  // Sombra
  doc.setFillColor(...VERDE_LIGHT);
  doc.roundedRect(M + 1.2, y + 1.2, CONT, CARD_H, 4, 4, "F");

  // Cuerpo
  doc.setFillColor(...VERDE_XLIGHT);
  doc.setDrawColor(...VERDE_BORDER);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, y, CONT, CARD_H, 4, 4, "FD");

  // Franja izquierda verde (tapa las esquinas redondeadas del lado izq)
  doc.setFillColor(...VERDE_BRIGHT);
  doc.rect(M, y, 5, CARD_H, "F");
  // Redondear solo las esquinas izquierdas de la franja
  doc.setFillColor(...VERDE_BRIGHT);
  doc.roundedRect(M, y, 5, CARD_H, 2, 2, "F");

  // Título tarjeta
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE_TEXT);
  doc.text("INFORMACIÓN DEL COLABORADOR", M + 9, y + 6);

  // Separador
  doc.setDrawColor(...VERDE_BORDER);
  doc.setLineWidth(0.3);
  doc.line(M + 7, y + 8, M + CONT - 7, y + 8);

  const c1 = M + 9;
  const c2 = M + CONT / 2 + 4;

  // — Fila 1: N° Empleado | Sucursal —
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE_TEXT);
  doc.text("N° EMPLEADO",  c1, y + 14);
  doc.text("SUCURSAL",     c2, y + 14);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXTO);
  doc.text(datos.noEmpleado, c1, y + 21);

  doc.setFontSize(9.5);
  const sucTxt = doc.splitTextToSize(datos.sucursal, CONT / 2 - 12)[0] as string;
  doc.text(sucTxt, c2, y + 21);

  // Separador central
  doc.setDrawColor(...VERDE_BORDER);
  doc.setLineWidth(0.25);
  doc.line(M + 7, y + 24, M + CONT - 7, y + 24);

  // — Fila 2: Nombre | Fecha —
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE_TEXT);
  doc.text("NOMBRE",       c1, y + 30);
  doc.text("FECHA Y HORA", c2, y + 30);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXTO);
  doc.text(datos.nombreEmpleado, c1, y + 37);

  doc.setFontSize(7.5);
  doc.text(fmtFecha(datos.fechaPedido), c2, y + 37);

  y += CARD_H + 9;

  // ════════════════════════════════════════════════════════════════════════════
  // TABLA DE PRODUCTOS
  // ════════════════════════════════════════════════════════════════════════════

  // Título sección
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXTO);
  doc.text("PRODUCTOS DEL PEDIDO", M, y + 4.5);

  // Línea decorativa al lado del título
  doc.setDrawColor(...GRIS_BORDE);
  doc.setLineWidth(0.4);
  doc.line(M + 72, y + 2, M + CONT, y + 2);

  y += 10;

  // Cabecera tabla — fondo verde oscuro
  doc.setFillColor(...VERDE_OSCURO);
  doc.roundedRect(M, y, CONT, 8.5, 2, 2, "F");
  // Cuadrar las esquinas inferiores del roundedRect de cabecera
  doc.rect(M, y + 4, CONT, 4.5, "F");

  const COL_PROD = M + 4;
  const COL_CANT = M + CONT * 0.60;
  const COL_PREC = M + CONT * 0.745;
  const COL_SUB  = M + CONT - 3;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN_300);
  doc.text("PRODUCTO",   COL_PROD, y + 5.5);
  doc.text("CANT.",      COL_CANT, y + 5.5, { align: "center" });
  doc.text("PRECIO U.",  COL_PREC, y + 5.5, { align: "right" });
  doc.text("SUBTOTAL",   COL_SUB,  y + 5.5, { align: "right" });

  y += 8.5;

  // Filas
  datos.items.forEach((item, idx) => {
    const rowH    = 9;
    const subtotal = item.precio * item.cantidad;

    // Fondo alternado
    doc.setFillColor(...(idx % 2 === 0 ? BLANCO : GRIS_CLARO));
    doc.rect(M, y, CONT, rowH, "F");

    // Acento lateral por fila (verde claro)
    doc.setFillColor(...VERDE_BRIGHT);
    doc.rect(M, y, 3, rowH, "F");

    // Borde inferior
    doc.setDrawColor(...GRIS_BORDE);
    doc.setLineWidth(0.15);
    doc.line(M, y + rowH, M + CONT, y + rowH);

    // Nombre
    const nombre = doc.splitTextToSize(item.nombre, CONT * 0.55)[0] as string;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXTO);
    doc.text(nombre, COL_PROD + 2, y + 6);

    // Cantidad — badge redondeado
    const cantW = 10;
    doc.setFillColor(...VERDE_LIGHT);
    doc.roundedRect(COL_CANT - cantW / 2, y + 1.5, cantW, 6, 1.5, 1.5, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...VERDE_TEXT);
    doc.text(String(item.cantidad), COL_CANT, y + 6, { align: "center" });

    // Precio unitario
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SUBTEXTO);
    doc.text(`$${fmt(item.precio)}`, COL_PREC, y + 6, { align: "right" });

    // Subtotal
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXTO);
    doc.text(`$${fmt(subtotal)}`, COL_SUB, y + 6, { align: "right" });

    y += rowH;
  });

  // Línea cierre tabla
  doc.setDrawColor(...GRIS_BORDE);
  doc.setLineWidth(0.4);
  doc.line(M, y, M + CONT, y);

  y += 6;

  // ════════════════════════════════════════════════════════════════════════════
  // TOTAL
  // ════════════════════════════════════════════════════════════════════════════
  const tW = 76;
  const tX = M + CONT - tW;

  // Sombra
  doc.setFillColor(...VERDE_OSCURO);
  doc.roundedRect(tX + 1.5, y + 1.5, tW, 17, 3, 3, "F");

  // Cuerpo
  doc.setFillColor(...VERDE_BRIGHT);
  doc.roundedRect(tX, y, tW, 17, 3, 3, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN_300);
  doc.text("TOTAL DEL PEDIDO", tX + tW / 2, y + 6.5, { align: "center" });

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLANCO);
  doc.text(`$${fmt(datos.total)}`, tX + tW / 2, y + 14, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SUBTEXTO);
  doc.text(`${datos.items.length} producto${datos.items.length !== 1 ? "s" : ""} en este pedido`, M, y + 9);

  y += 25;

  // ════════════════════════════════════════════════════════════════════════════
  // NOTA DE AVISO
  // ════════════════════════════════════════════════════════════════════════════

  // Sombra
  doc.setFillColor(...AMBER_BORDE);
  doc.roundedRect(M + 1.2, y + 1.2, CONT, 21, 3, 3, "F");

  // Cuerpo
  doc.setFillColor(...AMBER_BG);
  doc.setDrawColor(...AMBER_BORDE);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, y, CONT, 21, 3, 3, "FD");

  // Franja lateral ámbar
  doc.setFillColor(...AMBER_BORDE);
  doc.roundedRect(M, y, 5, 21, 2, 2, "F");
  doc.rect(M + 3, y, 2, 21, "F");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...AMBER_DARK);
  doc.text("Nota importante", M + 9, y + 8);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...AMBER_TEXT);
  const nota =
    "Este documento es únicamente un comprobante de que tu pedido fue registrado. " +
    "El pago y la entrega del producto se realizarán conforme al proceso habitual de tu sucursal.";
  const notaLines = doc.splitTextToSize(nota, CONT - 16) as string[];
  doc.text(notaLines, M + 9, y + 14);

  y += 29;

  // ════════════════════════════════════════════════════════════════════════════
  // CORREO (opcional)
  // ════════════════════════════════════════════════════════════════════════════
  if (datos.emailEmpleado) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SUBTEXTO);
    doc.text(`Correo registrado: ${datos.emailEmpleado}`, M, y + 4.5);
    y += 10;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PIE DE PÁGINA
  // ════════════════════════════════════════════════════════════════════════════
  const footerY = 282;

  // Banda verde footer
  doc.setFillColor(...VERDE_OSCURO);
  doc.rect(0, footerY, W, 15, "F");

  // Emoji fruta
  doc.addImage(imgFruta, "PNG", M, footerY + 2, 11, 11);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLANCO);
  doc.text("Fruta Coliman · Sistema de pedidos colaboradores", M + 14, footerY + 7.5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREEN_300);
  doc.text("Documento generado automáticamente — no requiere firma.", M + 14, footerY + 12.5);

  // Número de pedido (derecha del footer)
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN_300);
  doc.text(`Pedido #${datos.pedidoId}`, W - M, footerY + 10, { align: "right" });

  // ── Descargar ────────────────────────────────────────────────────────────────
  doc.save(`comprobante_pedido_${datos.pedidoId}.pdf`);
}
