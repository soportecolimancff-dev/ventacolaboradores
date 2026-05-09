"use client";
/**
 * components/admin/CatalogoManager.tsx
 * Dos secciones:
 *  1. Productos maestros  - crear nuevos, activar/desactivar globalmente.
 *  2. Catalogo semanal    - por sucursal: switch ON/OFF por producto + precio/stock.
 */
import { useState } from "react";
import EmojiPicker from "./EmojiPicker";

export interface ProductoBase {
  id: number;
  nombre: string;
  imagenUrl: string | null;
  activo: boolean;
}

export interface SucursalBase {
  id: number;
  nombre: string;
  slug: string;
}

export interface ItemCatalogo {
  id: number;
  productoId: number;
  sucursalId: number;
  precio: number;
  stock: number;
  disponible: boolean;
  producto: { id: number; nombre: string; imagenUrl: string | null };
  sucursal: { id: number; nombre: string; slug: string };
}

interface Props {
  items: ItemCatalogo[];
  productos: ProductoBase[];
  sucursales: SucursalBase[];
  semana: string;
}

// Toggle switch visual
function Toggle({
  checked,
  onChange,
  disabled,
  size = "md",
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const track = size === "sm" ? "h-6 w-10" : "h-7 w-12";
  const thumb = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const on = size === "sm" ? "translate-x-5" : "translate-x-6";
  const off = "translate-x-1";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`inline-flex ${track} items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-1 ${
        checked ? "bg-green-500" : "bg-gray-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block ${thumb} rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? on : off
        }`}
      />
    </button>
  );
}

export default function CatalogoManager({
  items: initItems,
  productos: initProductos,
  sucursales,
  semana,
}: Props) {
  const [productos, setProductos] = useState<ProductoBase[]>(initProductos);
  const [items, setItems] = useState<ItemCatalogo[]>(initItems);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Seccion activa
  const [seccion, setSeccion] = useState<"maestro" | "catalogo">("catalogo");

  // Maestro: crear producto
  const [formNuevo, setFormNuevo] = useState({ nombre: "", descripcion: "", imagenUrl: "", maxCantidad: "5" });
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);

  // Catalogo: tab de sucursal activa
  const [tab, setTab] = useState<number>(sucursales[0]?.id ?? 0);

  // Catalogo: edicion de precio/stock de items ya existentes
  const [editando, setEditando] = useState<Record<number, { precio: string; stock: string }>>({}); 

  // Maestro: edicion inline
  const [editandoMaestro, setEditandoMaestro] = useState<number | null>(null);
  const [formEditar, setFormEditar] = useState({ nombre: "", descripcion: "", imagenUrl: "", maxCantidad: "5" });
  // Maestro: confirmacion de borrado
  const [confirmandoBorrar, setConfirmandoBorrar] = useState<number | null>(null);
  // Catalogo: productos en proceso de activacion (no tienen item aun)
  // key = productoId, value = { precio, stock } | null (null = no activando)
  const [activando, setActivando] = useState<Record<number, { precio: string; stock: string } | null>>({});

  // ── Maestro: crear producto ───────────────────────────────────────────────
  const crearProducto = async () => {
    if (!formNuevo.nombre.trim()) { setError("El nombre es obligatorio."); return; }
    const maxCantidad = parseInt(formNuevo.maxCantidad, 10);
    if (isNaN(maxCantidad) || maxCantidad < 1) { setError("Max. cantidad debe ser >= 1."); return; }
    setSaving("crear-producto"); setError(null);
    try {
      const res = await fetch("/api/admin/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formNuevo.nombre.trim(),
          descripcion: formNuevo.descripcion.trim() || undefined,
          imagenUrl: formNuevo.imagenUrl.trim() || null,
          maxCantidad,
        }),
      });
      if (!res.ok) throw new Error();
      const nuevo: ProductoBase = await res.json();
      setProductos((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setFormNuevo({ nombre: "", descripcion: "", imagenUrl: "", maxCantidad: "5" });
      setMostrarFormNuevo(false);
    } catch { setError("No se pudo crear el producto."); }
    finally { setSaving(null); }
  };

  // ── Maestro: iniciar / guardar / cancelar edicion ────────────────────────
  const iniciarEdicionMaestro = (p: ProductoBase & { descripcion?: string | null; maxCantidad?: number }) => {
    setEditandoMaestro(p.id);
    setFormEditar({
      nombre: p.nombre,
      descripcion: "",
      imagenUrl: p.imagenUrl ?? "",
      maxCantidad: String((p as { maxCantidad?: number }).maxCantidad ?? 5),
    });
    setError(null);
  };

  const cancelarEdicionMaestro = () => { setEditandoMaestro(null); setError(null); };

  const guardarEdicionMaestro = async (productoId: number) => {
    if (!formEditar.nombre.trim()) { setError("El nombre es obligatorio."); return; }
    const maxCantidad = parseInt(formEditar.maxCantidad, 10);
    if (isNaN(maxCantidad) || maxCantidad < 1) { setError("Max. cantidad debe ser >= 1."); return; }
    setSaving(`editar-maestro-${productoId}`); setError(null);
    try {
      const res = await fetch(`/api/admin/productos/${productoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formEditar.nombre.trim(),
          descripcion: formEditar.descripcion.trim() || null,
          imagenUrl: formEditar.imagenUrl.trim() || null,
          maxCantidad,
        }),
      });
      if (!res.ok) throw new Error();
      const updated: ProductoBase = await res.json();
      setProductos((prev) => prev.map((p) => p.id === productoId ? { ...p, ...updated } : p));
      cancelarEdicionMaestro();
    } catch { setError("No se pudo guardar el producto."); }
    finally { setSaving(null); }
  };

  // ── Maestro: eliminar ─────────────────────────────────────────────────────
  const eliminarProducto = async (productoId: number) => {
    setSaving(`borrar-${productoId}`); setError(null);
    try {
      const res = await fetch(`/api/admin/productos/${productoId}`, { method: "DELETE" });
      if (res.status === 409) {
        const data = await res.json();
        setError(data.error ?? "No se puede eliminar.");
        setConfirmandoBorrar(null);
        return;
      }
      if (!res.ok) throw new Error();
      setProductos((prev) => prev.filter((p) => p.id !== productoId));
      setConfirmandoBorrar(null);
    } catch { setError("No se pudo eliminar el producto."); }
    finally { setSaving(null); }
  };

  // ── Maestro: toggle activo global ────────────────────────────────────────
  const toggleActivo = async (producto: ProductoBase) => {
    const key = `activo-${producto.id}`;
    setSaving(key); setError(null);
    try {
      const res = await fetch(`/api/admin/productos/${producto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !producto.activo }),
      });
      if (!res.ok) throw new Error();
      setProductos((prev) => prev.map((p) => p.id === producto.id ? { ...p, activo: !p.activo } : p));
    } catch { setError("No se pudo cambiar el estado del producto."); }
    finally { setSaving(null); }
  };

  // ── Catalogo: toggle disponible de un item ya existente ──────────────────
  const toggleDisponible = async (item: ItemCatalogo) => {
    const key = `toggle-${item.id}`;
    setSaving(key); setError(null);
    try {
      const res = await fetch("/api/admin/catalogo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productoId: item.productoId,
          sucursalId: item.sucursalId,
          semana,
          precio: item.precio,
          stock: item.stock,
          disponible: !item.disponible,
        }),
      });
      if (!res.ok) throw new Error();
      const updated: { id: number } = await res.json();
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, disponible: !i.disponible, id: updated.id } : i));
    } catch { setError("No se pudo actualizar la disponibilidad."); }
    finally { setSaving(null); }
  };

  // ── Catalogo: iniciar activacion de producto sin item ────────────────────
  const iniciarActivacion = (productoId: number) => {
    setActivando((prev) => ({ ...prev, [productoId]: { precio: "", stock: "0" } }));
    setError(null);
  };

  const cancelarActivacion = (productoId: number) => {
    setActivando((prev) => { const n = { ...prev }; delete n[productoId]; return n; });
  };

  const confirmarActivacion = async (productoId: number, sucursalId: number) => {
    const vals = activando[productoId];
    if (!vals) return;
    const precio = parseFloat(vals.precio);
    const stock = parseInt(vals.stock, 10);
    if (isNaN(precio) || precio <= 0) { setError("Precio debe ser mayor a 0."); return; }
    if (isNaN(stock) || stock < 0) { setError("Stock debe ser >= 0."); return; }
    const key = `activar-${productoId}`;
    setSaving(key); setError(null);
    try {
      const res = await fetch("/api/admin/catalogo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productoId, sucursalId, semana, precio, stock, disponible: true }),
      });
      if (!res.ok) throw new Error();
      const newItem: ItemCatalogo & { precio: unknown; stock: unknown } = await res.json();
      setItems((prev) => [...prev, { ...newItem, precio: Number(newItem.precio), stock: Number(newItem.stock) } as ItemCatalogo]);
      cancelarActivacion(productoId);
    } catch { setError("No se pudo activar el producto."); }
    finally { setSaving(null); }
  };

  // ── Catalogo: edicion precio/stock inline ────────────────────────────────
  const iniciarEdicion = (item: ItemCatalogo) =>
    setEditando((prev) => ({ ...prev, [item.id]: { precio: String(item.precio), stock: String(item.stock) } }));

  const cancelarEdicion = (itemId: number) =>
    setEditando((prev) => { const n = { ...prev }; delete n[itemId]; return n; });

  const guardarEdicion = async (item: ItemCatalogo) => {
    const vals = editando[item.id];
    const precio = parseFloat(vals.precio);
    const stock = parseInt(vals.stock, 10);
    if (isNaN(precio) || precio <= 0 || isNaN(stock) || stock < 0) { setError("Precio > 0 y stock >= 0."); return; }
    const key = `edit-${item.id}`;
    setSaving(key); setError(null);
    try {
      const res = await fetch("/api/admin/catalogo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productoId: item.productoId, sucursalId: item.sucursalId, semana, precio, stock, disponible: item.disponible }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, precio, stock } : i));
      cancelarEdicion(item.id);
    } catch { setError("No se pudo guardar."); }
    finally { setSaving(null); }
  };

  // ── Datos derivados ───────────────────────────────────────────────────────
  const productosActivos = productos.filter((p) => p.activo);
  // Mapa productoId -> item de catalogo para la sucursal activa
  const itemPorProducto = new Map<number, ItemCatalogo>(
    items.filter((i) => i.sucursalId === tab).map((i) => [i.productoId, i])
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Tabs de seccion principal */}
      <div className="flex gap-1 rounded-2xl p-1" style={{ background: "#f3f4f6" }}>
        <button
          onClick={() => setSeccion("catalogo")}
          className="flex-1 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
          style={seccion === "catalogo"
            ? { background: "#ffffff", color: "#14532d", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", border: "1px solid #d1fae5" }
            : { background: "transparent", color: "#6b7280" }
          }
        >
          🗓️ Catálogo semanal
        </button>
        <button
          onClick={() => setSeccion("maestro")}
          className="flex-1 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
          style={seccion === "maestro"
            ? { background: "#ffffff", color: "#14532d", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", border: "1px solid #d1fae5" }
            : { background: "transparent", color: "#6b7280" }
          }
        >
          📋 Productos maestros
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
          <span>&#9888;</span> {error}
          <button onClick={() => setError(null)} className="ml-auto font-bold">x</button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECCION: Catalogo semanal                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {seccion === "catalogo" && (
        <div className="space-y-4">
          {/* Tabs de sucursal */}
          <div className="flex flex-wrap gap-2">
            {sucursales.map((s) => {
              const sel = tab === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setTab(s.id); setActivando({}); setEditando({}); setError(null); }}
                  className="relative rounded-xl px-5 py-2 text-sm font-bold transition-all"
                  style={sel
                    ? { background: "#15803d", color: "#ffffff", boxShadow: "0 0 0 3px #bbf7d0, 0 4px 12px rgba(21,128,61,0.4)" }
                    : { background: "#ffffff", color: "#6b7280", border: "1px solid #e5e7eb" }
                  }
                >
                  {sel && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "#4ade80" }} />
                      <span className="relative inline-flex h-3.5 w-3.5 rounded-full" style={{ background: "#16a34a" }} />
                    </span>
                  )}
                  {s.nombre}
                </button>
              );
            })}
          </div>

          {/* Tabla unificada: todos los productos activos con switch */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wide text-gray-500" style={{ background: "#f9fafb" }}>
                <tr>
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-center w-40">Disponibilidad</th>
                  <th className="px-4 py-3 text-right w-32">Precio</th>
                  <th className="px-4 py-3 text-right w-28">Stock</th>
                  <th className="px-4 py-3 text-right w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productosActivos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                      No hay productos activos. Crea uno en "Productos maestros".
                    </td>
                  </tr>
                )}
                {productosActivos.map((producto) => {
                  const item = itemPorProducto.get(producto.id);
                  const estaEnCatalogo = Boolean(item);
                  const estaDisponible = item?.disponible ?? false;
                  const switchOn = estaEnCatalogo && estaDisponible;
                  const enActivacion = Boolean(activando[producto.id]);
                  const isSavingToggle = saving === `toggle-${item?.id}`;
                  const isSavingActivar = saving === `activar-${producto.id}`;
                  const isEditing = item ? Boolean(editando[item.id]) : false;
                  const isSavingEdit = item ? saving === `edit-${item.id}` : false;

                  return (
                    <tr
                      key={producto.id}
                      className={`transition-colors ${switchOn ? "hover:bg-green-50/30" : "bg-gray-50/60"}`}
                    >
                      {/* Nombre */}
                      <td className={`px-4 py-3 font-semibold ${switchOn || enActivacion ? "text-gray-800" : "text-gray-400"}`}>
                        {producto.nombre}
                      </td>

                      {/* Disponibilidad: botón explícito */}
                      <td className="px-4 py-3 text-center">
                        {enActivacion ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
                            style={{ background: "#fef3c7", color: "#b45309" }}>
                            ⏳ Configurando...
                          </span>
                        ) : switchOn ? (
                          <button
                            disabled={isSavingToggle}
                            onClick={() => toggleDisponible(item!)}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition hover:opacity-80 disabled:opacity-40"
                            style={{ background: "#dcfce7", color: "#15803d", border: "1.5px solid #86efac" }}
                            title="Clic para desactivar"
                          >
                            {isSavingToggle ? "..." : "✓ Disponible"}
                          </button>
                        ) : item ? (
                          <button
                            disabled={isSavingToggle}
                            onClick={() => toggleDisponible(item)}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition hover:opacity-80 disabled:opacity-40"
                            style={{ background: "#fee2e2", color: "#b91c1c", border: "1.5px solid #fca5a5" }}
                            title="Clic para activar"
                          >
                            {isSavingToggle ? "..." : "✕ Desactivado"}
                          </button>
                        ) : (
                          <button
                            onClick={() => iniciarActivacion(producto.id)}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition hover:opacity-80"
                            style={{ background: "#f3f4f6", color: "#6b7280", border: "1.5px solid #d1d5db" }}
                          >
                            + Agregar
                          </button>
                        )}
                      </td>

                      {/* Precio */}
                      <td className="px-4 py-3 text-right">
                        {enActivacion ? (
                          <input
                            type="number" min="0.01" step="0.01" placeholder="$0.00"
                            autoFocus
                            value={activando[producto.id]?.precio ?? ""}
                            onChange={(e) => setActivando((prev) => ({ ...prev, [producto.id]: { ...prev[producto.id]!, precio: e.target.value } }))}
                            className="w-24 rounded-lg border border-green-400 px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : isEditing && item ? (
                          <input
                            type="number" min="0.01" step="0.01"
                            value={editando[item.id].precio}
                            onChange={(e) => setEditando((prev) => ({ ...prev, [item.id]: { ...prev[item.id], precio: e.target.value } }))}
                            className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : item ? (
                          <span className={item.disponible ? "text-gray-700 font-medium" : "text-gray-400"}>
                            ${item.precio.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3 text-right">
                        {enActivacion ? (
                          <input
                            type="number" min="0" step="1" placeholder="0"
                            value={activando[producto.id]?.stock ?? ""}
                            onChange={(e) => setActivando((prev) => ({ ...prev, [producto.id]: { ...prev[producto.id]!, stock: e.target.value } }))}
                            className="w-20 rounded-lg border border-green-400 px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : isEditing && item ? (
                          <input
                            type="number" min="0" step="1"
                            value={editando[item.id].stock}
                            onChange={(e) => setEditando((prev) => ({ ...prev, [item.id]: { ...prev[item.id], stock: e.target.value } }))}
                            className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : item ? (
                          <span className={item.disponible ? "text-gray-600" : "text-gray-400"}>
                            {item.stock === 0 ? "Ilimitado" : item.stock}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-right">
                        {enActivacion ? (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => confirmarActivacion(producto.id, tab)}
                              disabled={isSavingActivar}
                              className="rounded-lg px-3 py-1 text-xs font-bold transition disabled:opacity-50"
                              style={{ background: "#15803d", color: "#fff" }}
                            >
                              {isSavingActivar ? "..." : "Activar"}
                            </button>
                            <button
                              onClick={() => cancelarActivacion(producto.id)}
                              className="rounded-lg px-3 py-1 text-xs font-bold transition"
                              style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : isEditing && item ? (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => guardarEdicion(item)}
                              disabled={isSavingEdit}
                              className="rounded-lg px-3 py-1 text-xs font-bold transition disabled:opacity-50"
                              style={{ background: "#15803d", color: "#fff" }}
                            >
                              {isSavingEdit ? "..." : "Guardar"}
                            </button>
                            <button
                              onClick={() => cancelarEdicion(item.id)}
                              className="rounded-lg px-3 py-1 text-xs font-bold transition"
                              style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : item ? (
                          <button
                            onClick={() => iniciarEdicion(item)}
                            className="rounded-lg px-3 py-1 text-xs font-bold transition"
                            style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" }}
                          >
                            Editar
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400">
            Switch OFF = producto no disponible para colaboradores esta semana. Stock 0 = sin limite.
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECCION: Productos maestros                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {seccion === "maestro" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productos.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No hay productos registrados.</td></tr>
                )}
                {productos.map((p) => (
                  <tr key={p.id} className={`transition-colors ${p.activo ? "hover:bg-green-50/20" : "bg-gray-50/60"}`}>
                    {editandoMaestro === p.id ? (
                      /* ── Fila de edición inline ── */
                      <td colSpan={3} className="px-4 py-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">Nombre *</label>
                            <input type="text" value={formEditar.nombre}
                              onChange={(e) => setFormEditar((f) => ({ ...f, nombre: e.target.value }))}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600">Max. cantidad</label>
                            <input type="number" min="1" value={formEditar.maxCantidad}
                              onChange={(e) => setFormEditar((f) => ({ ...f, maxCantidad: e.target.value }))}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                          </div>
                          <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className="text-xs font-medium text-gray-600">Descripcion</label>
                            <input type="text" placeholder="Descripcion breve (opcional)" value={formEditar.descripcion}
                              onChange={(e) => setFormEditar((f) => ({ ...f, descripcion: e.target.value }))}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                          </div>
                          <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className="text-xs font-medium text-gray-600">Icono</label>
                            <EmojiPicker value={formEditar.imagenUrl}
                              onChange={(emoji) => setFormEditar((f) => ({ ...f, imagenUrl: emoji }))} />
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => guardarEdicionMaestro(p.id)}
                            disabled={saving === `editar-maestro-${p.id}`}
                            className="rounded-lg px-4 py-1.5 text-xs font-bold disabled:opacity-50"
                            style={{ background: "#15803d", color: "#fff" }}>
                            {saving === `editar-maestro-${p.id}` ? "Guardando..." : "Guardar"}
                          </button>
                          <button onClick={cancelarEdicionMaestro}
                            className="rounded-lg px-4 py-1.5 text-xs font-bold"
                            style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" }}>
                            Cancelar
                          </button>
                        </div>
                      </td>
                    ) : confirmandoBorrar === p.id ? (
                      /* ── Fila de confirmación de borrado ── */
                      <td colSpan={3} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-red-700 font-medium">¿Eliminar <strong>{p.nombre}</strong>? Esta acción no se puede deshacer.</span>
                          <button onClick={() => eliminarProducto(p.id)}
                            disabled={saving === `borrar-${p.id}`}
                            className="rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                            style={{ background: "#dc2626", color: "#fff" }}>
                            {saving === `borrar-${p.id}` ? "Eliminando..." : "Sí, eliminar"}
                          </button>
                          <button onClick={() => setConfirmandoBorrar(null)}
                            className="rounded-lg px-3 py-1.5 text-xs font-bold"
                            style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" }}>
                            Cancelar
                          </button>
                        </div>
                      </td>
                    ) : (
                      /* ── Fila normal ── */
                      <>
                        <td className={`px-4 py-3 font-semibold ${p.activo ? "text-gray-800" : "text-gray-400"}`}>
                          <span className="mr-2 text-xl">{p.imagenUrl || "🍎"}</span>
                          {p.nombre}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.activo ? (
                            <button disabled={saving === `activo-${p.id}`} onClick={() => toggleActivo(p)}
                              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition hover:opacity-80 disabled:opacity-40"
                              style={{ background: "#dcfce7", color: "#15803d", border: "1.5px solid #86efac" }}
                              title="Clic para desactivar">
                              {saving === `activo-${p.id}` ? "..." : "✓ Activo"}
                            </button>
                          ) : (
                            <button disabled={saving === `activo-${p.id}`} onClick={() => toggleActivo(p)}
                              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition hover:opacity-80 disabled:opacity-40"
                              style={{ background: "#fee2e2", color: "#b91c1c", border: "1.5px solid #fca5a5" }}
                              title="Clic para activar">
                              {saving === `activo-${p.id}` ? "..." : "✕ Inactivo"}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => iniciarEdicionMaestro(p)}
                              className="rounded-lg px-3 py-1.5 text-xs font-bold transition"
                              style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" }}>
                              ✏️ Editar
                            </button>
                            <button onClick={() => { setConfirmandoBorrar(p.id); setError(null); }}
                              className="rounded-lg px-3 py-1.5 text-xs font-bold transition"
                              style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                              🗑️ Eliminar
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!mostrarFormNuevo ? (
            <button
              onClick={() => setMostrarFormNuevo(true)}
              className="rounded-xl px-5 py-2.5 text-sm font-bold transition hover:opacity-90"
              style={{ background: "#15803d", color: "#ffffff", boxShadow: "0 2px 8px rgba(21,128,61,0.35)" }}
            >
              + Nuevo producto
            </button>
          ) : (
            <div className="rounded-2xl border border-dashed border-green-300 bg-green-50 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-green-800">Nuevo producto</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Nombre <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Ej. Mango Ataulfo" value={formNuevo.nombre}
                    onChange={(e) => setFormNuevo((f) => ({ ...f, nombre: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Max. cantidad (piezas/kg)</label>
                  <input type="number" min="1" step="1" value={formNuevo.maxCantidad}
                    onChange={(e) => setFormNuevo((f) => ({ ...f, maxCantidad: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium text-gray-600">Descripcion</label>
                  <input type="text" placeholder="Descripcion breve (opcional)" value={formNuevo.descripcion}
                    onChange={(e) => setFormNuevo((f) => ({ ...f, descripcion: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium text-gray-600">Icono del producto</label>
                  <EmojiPicker
                    value={formNuevo.imagenUrl}
                    onChange={(emoji) => setFormNuevo((f) => ({ ...f, imagenUrl: emoji }))} />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={crearProducto} disabled={saving === "crear-producto"}
                  className="rounded-xl px-5 py-2 text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#15803d", color: "#ffffff", boxShadow: "0 2px 8px rgba(21,128,61,0.3)" }}>
                  {saving === "crear-producto" ? "Guardando..." : "Guardar producto"}
                </button>
                <button onClick={() => { setMostrarFormNuevo(false); setFormNuevo({ nombre: "", descripcion: "", imagenUrl: "", maxCantidad: "5" }); setError(null); }}
                  className="rounded-xl px-5 py-2 text-sm font-bold transition hover:opacity-90"
                  style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
