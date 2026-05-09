"use client";
/**
 * components/tienda/CarritoDrawer.tsx
 * Panel lateral/bottom del carrito siempre accesible.
 * En mobile abre desde abajo; en desktop desde la derecha.
 */
import { useState } from "react";
import { useCarrito } from "@/context/CarritoContext";
import type { DatosPedidoPdf } from "@/lib/pdf/pedidoPdf";

interface Props {
  sucursalId: number;
  sucursalNombre: string;
}

// Pasos del flujo de confirmacion
type Paso = "carrito" | "datos" | "exito";

export default function CarritoDrawer({ sucursalId, sucursalNombre }: Props) {
  const { items, total, itemCount, limiteCompra, limiteCantidad, vaciar } =
    useCarrito();
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState<Paso>("carrito");
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Snapshot del pedido confirmado para generar el PDF
  const [pedidoSnapshot, setPedidoSnapshot] = useState<DatosPedidoPdf | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  // Datos del colaborador
  const [noEmpleado, setNoEmpleado] = useState("");
  const [nombreEmpleado, setNombreEmpleado] = useState("");
  const [emailEmpleado, setEmailEmpleado] = useState("");
  const [erroresCampos, setErroresCampos] = useState<Record<string, string>>({});

  const superoLimite = limiteCompra !== null && total > limiteCompra;
  const superoCantidad = limiteCantidad !== null && itemCount > limiteCantidad;

  const validarDatos = (): boolean => {
    const errs: Record<string, string> = {};
    if (!noEmpleado.trim()) errs.noEmpleado = "El numero de empleado es requerido";
    if (nombreEmpleado.trim().length < 2) errs.nombreEmpleado = "Ingresa tu nombre completo";
    if (emailEmpleado.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEmpleado.trim())) {
      errs.emailEmpleado = "Correo invalido";
    }
    setErroresCampos(errs);
    return Object.keys(errs).length === 0;
  };

  const handleIrADatos = () => {
    if (items.length === 0 || superoLimite || superoCantidad) return;
    setErrorMsg(null);
    setPaso("datos");
  };

  const handleConfirmar = async () => {
    if (!validarDatos()) return;
    setEnviando(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noEmpleado: noEmpleado.trim(),
          nombreEmpleado: nombreEmpleado.trim(),
          emailEmpleado: emailEmpleado.trim() || undefined,
          sucursalId,
          items: items.map((i) => ({
            productoSucursalId: i.productoSucursalId,
            cantidad: i.cantidad,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Guardar snapshot ANTES de vaciar el carrito
        const snapshot: DatosPedidoPdf = {
          pedidoId: data.id,
          noEmpleado: noEmpleado.trim(),
          nombreEmpleado: nombreEmpleado.trim(),
          emailEmpleado: emailEmpleado.trim() || undefined,
          sucursal: sucursalNombre,
          items: items.map((i) => ({ nombre: i.nombre, precio: i.precio, cantidad: i.cantidad })),
          total,
          fechaPedido: new Date(),
        };
        setPedidoSnapshot(snapshot);
        vaciar();
        setPaso("exito");
        // Generar PDF automáticamente
        const { generarPdfPedido } = await import("@/lib/pdf/pedidoPdf");
        generarPdfPedido(snapshot).catch(() => null);
      } else {
        const data = await res.json();
        const e = data?.error;
        setErrorMsg(
          e?.tipo === "MONTO_EXCEDIDO"
            ? `El total supera el limite de $${e.montoMaximo}.`
            : e?.tipo === "CANTIDAD_EXCEDIDA"
            ? `Maximo ${e.max} de ${e.productoNombre}.`
            : e?.tipo === "CANTIDAD_TOTAL_EXCEDIDA"
            ? `El pedido excede la cantidad maxima de ${e.cantidadMaxima}.`
            : e?.tipo === "PEDIDO_DUPLICADO"
            ? "Ya tienes un pedido esta semana en esta sucursal."
            : "No se pudo procesar el pedido. Intenta de nuevo."
        );
        setPaso("datos");
      }
    } finally {
      setEnviando(false);
    }
  };

  const handleDescargarPdf = async () => {
    if (!pedidoSnapshot) return;
    setGenerandoPdf(true);
    try {
      const { generarPdfPedido } = await import("@/lib/pdf/pedidoPdf");
      await generarPdfPedido(pedidoSnapshot);
    } finally {
      setGenerandoPdf(false);
    }
  };

  const handleCerrar = () => {
    setAbierto(false);
    if (paso === "exito") {
      setPaso("carrito");
      setNoEmpleado("");
      setNombreEmpleado("");
      setEmailEmpleado("");
      setPedidoSnapshot(null);
    }
  };

  return (
    <>
      {/* Boton flotante */}
      <button
        onClick={() => setAbierto(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-green-600 px-5 py-3
          text-white shadow-lg transition hover:bg-green-700 active:scale-95"
      >
        <span className="text-xl">&#x1F6D2;</span>
        {itemCount > 0 && (
          <span className="rounded-full bg-white px-2 py-0.5 text-sm font-extrabold text-green-700">
            {itemCount}
          </span>
        )}
        <span className="font-semibold">${total.toFixed(2)}</span>
      </button>

      {/* Overlay */}
      {abierto && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={handleCerrar}
        />
      )}

      {/* Panel */}
      <aside
        className={`fixed bottom-0 right-0 z-50 flex h-[90vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl transition-transform
          duration-300 md:top-0 md:h-full md:w-96 md:rounded-none md:rounded-l-3xl
          ${abierto ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full"}`}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b p-5">
          <div className="flex items-center gap-2">
            {paso === "datos" && (
              <button
                onClick={() => { setPaso("carrito"); setErrorMsg(null); }}
                className="rounded-full p-1.5 hover:bg-gray-100 text-gray-400"
                aria-label="Regresar"
              >
                &larr;
              </button>
            )}
            <h2 className="text-lg font-bold text-gray-900">
              {paso === "carrito" ? "Tu carrito" : paso === "datos" ? "Tus datos" : "Listo!"}
            </h2>
          </div>
          <button
            onClick={handleCerrar}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            &times;
          </button>
        </div>

        {/* Contenido por paso */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* PASO: exito */}
          {paso === "exito" && pedidoSnapshot && (
            <div className="flex h-full flex-col items-center justify-center gap-5 px-4">
              {/* Icono de éxito */}
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="text-center">
                <p className="text-xl font-extrabold text-green-700">¡Pedido registrado!</p>
                <p className="mt-1 text-sm text-gray-500">
                  Pedido <span className="font-semibold text-gray-700">#{pedidoSnapshot.pedidoId}</span> creado exitosamente.
                </p>
              </div>

              {/* Mini resumen */}
              <div className="w-full rounded-2xl border border-green-200 bg-green-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-green-700">Resumen</p>
                <div className="space-y-1">
                  {pedidoSnapshot.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.cantidad}× {item.nombre}</span>
                      <span className="font-semibold text-gray-800">${(item.precio * item.cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between border-t border-green-200 pt-2">
                  <span className="font-bold text-gray-700">Total</span>
                  <span className="text-lg font-extrabold text-green-700">${pedidoSnapshot.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Botón descargar comprobante */}
              <button
                onClick={handleDescargarPdf}
                disabled={generandoPdf}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-green-600 py-3 text-sm font-bold text-green-700 transition hover:bg-green-50 active:scale-95 disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {generandoPdf ? "Generando PDF…" : "Descargar comprobante PDF"}
              </button>

              <button
                onClick={handleCerrar}
                className="text-sm font-medium text-gray-400 hover:text-gray-600"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* PASO: carrito */}
          {paso === "carrito" && (
            items.length === 0 ? (
              <p className="mt-10 text-center text-gray-400">
                Tu carrito esta vacio
              </p>
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li
                    key={item.productoSucursalId}
                    className="flex items-center justify-between rounded-xl bg-gray-50 p-3"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">{item.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {item.cantidad} x ${item.precio.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-bold text-green-700">
                      ${(item.cantidad * item.precio).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )
          )}

          {/* PASO: datos del colaborador */}
          {paso === "datos" && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-500">
                Ingresa tus datos para completar el pedido.
              </p>

              {/* Numero de empleado */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Numero de empleado <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={noEmpleado}
                  onChange={(e) => setNoEmpleado(e.target.value)}
                  placeholder="Ej. 10799"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 ${
                    erroresCampos.noEmpleado ? "border-red-400 bg-red-50" : "border-gray-200"
                  }`}
                />
                {erroresCampos.noEmpleado && (
                  <p className="mt-1 text-xs text-red-500">{erroresCampos.noEmpleado}</p>
                )}
              </div>

              {/* Nombre */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Nombre y apellido <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nombreEmpleado}
                  onChange={(e) => setNombreEmpleado(e.target.value)}
                  placeholder="Ej. Salvador Ramirez"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 ${
                    erroresCampos.nombreEmpleado ? "border-red-400 bg-red-50" : "border-gray-200"
                  }`}
                />
                {erroresCampos.nombreEmpleado && (
                  <p className="mt-1 text-xs text-red-500">{erroresCampos.nombreEmpleado}</p>
                )}
              </div>

              {/* Correo (opcional) */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Correo electronico{" "}
                  <span className="font-normal text-gray-400">(opcional, para notificaciones)</span>
                </label>
                <input
                  type="email"
                  value={emailEmpleado}
                  onChange={(e) => setEmailEmpleado(e.target.value)}
                  placeholder="salvador.ramirez@coliman.com"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 ${
                    erroresCampos.emailEmpleado ? "border-red-400 bg-red-50" : "border-gray-200"
                  }`}
                />
                {erroresCampos.emailEmpleado && (
                  <p className="mt-1 text-xs text-red-500">{erroresCampos.emailEmpleado}</p>
                )}
              </div>

              {errorMsg && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {errorMsg}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Pie */}
        {paso === "carrito" && items.length > 0 && (
          <div className="border-t p-5 space-y-3">
            {/* Barra de limite */}
            {(limiteCompra !== null || limiteCantidad !== null) && (
              <div>
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>Usado</span>
                  <span className={superoLimite || superoCantidad ? "font-bold text-red-600" : ""}>
                    ${total.toFixed(2)}{limiteCompra !== null ? ` / $${limiteCompra.toFixed(2)}` : ""}
                    {limiteCantidad !== null ? ` - ${itemCount}/${limiteCantidad} pzas` : ""}
                  </span>
                </div>
                {limiteCompra !== null && (
                  <>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full transition-all ${superoLimite ? "bg-red-500" : "bg-green-500"}`}
                        style={{ width: `${Math.min((total / (limiteCompra || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    {superoLimite && (
                      <p className="mt-1 text-xs text-red-600">
                        Superas el limite de compra. Retira algunos productos.
                      </p>
                    )}
                  </>
                )}
                {limiteCantidad !== null && superoCantidad && (
                  <p className="mt-1 text-xs text-red-600">
                    Has superado la cantidad maxima permitida ({limiteCantidad} pzas).
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            <button
              onClick={handleIrADatos}
              disabled={superoLimite || superoCantidad}
              className="w-full rounded-xl bg-green-600 py-3 text-base font-bold text-white
                transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuar &rarr;
            </button>
          </div>
        )}

        {paso === "datos" && (
          <div className="border-t p-5 space-y-3">
            <div className="flex justify-between text-base font-bold text-gray-700">
              <span>Total del pedido</span>
              <span className="text-green-700">${total.toFixed(2)}</span>
            </div>
            <button
              onClick={handleConfirmar}
              disabled={enviando}
              className="w-full rounded-xl bg-green-600 py-3 text-base font-bold text-white
                transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {enviando ? "Enviando..." : "Confirmar pedido"}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}