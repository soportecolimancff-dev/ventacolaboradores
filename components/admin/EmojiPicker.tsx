"use client";
/**
 * components/admin/EmojiPicker.tsx
 * Selector de emoji de frutas y verduras para asignar a productos.
 * El panel se renderiza con position:fixed para escapar de cualquier
 * contenedor con overflow:hidden (tablas, drawers, etc.)
 */
import { useState, useRef, useEffect } from "react";

// ── Catálogo completo de frutas y verduras ────────────────────────────────────
const FRUTAS: { emoji: string; nombre: string }[] = [
  // 🍎 Frutas (todas las disponibles con emoji)
  { emoji: "🍎", nombre: "Manzana roja" },
  { emoji: "🍏", nombre: "Manzana verde" },
  { emoji: "🍐", nombre: "Pera" },
  { emoji: "🍊", nombre: "Naranja / Mandarina" },
  { emoji: "🍋", nombre: "Limón" },
  { emoji: "🍋‍🟩", nombre: "Lima" },
  { emoji: "🍌", nombre: "Plátano" },
  { emoji: "🍉", nombre: "Sandía" },
  { emoji: "🍇", nombre: "Uvas" },
  { emoji: "🍓", nombre: "Fresa" },
  { emoji: "🫐", nombre: "Arándanos / Mora azul" },
  { emoji: "🍈", nombre: "Melón" },
  { emoji: "🍑", nombre: "Durazno / Chabacano" },
  { emoji: "🍒", nombre: "Cerezas" },
  { emoji: "🍍", nombre: "Piña" },
  { emoji: "🥭", nombre: "Mango" },
  { emoji: "🥥", nombre: "Coco" },
  { emoji: "🥝", nombre: "Kiwi" },
  { emoji: "🍅", nombre: "Tomate" }, // botánicamente fruta
  { emoji: "🫒", nombre: "Aceituna" },
  { emoji: "🥑", nombre: "Aguacate" },

  // 🍅 Frutos que se usan como verdura
  { emoji: "🍆", nombre: "Berenjena" },
  { emoji: "🫑", nombre: "Pimiento" },

  // 🌶️ Chiles
  { emoji: "🌶️", nombre: "Chile" },
  { emoji: "🫑", nombre: "Chile verde" },

  // 🥦 Verduras
  { emoji: "🥔", nombre: "Papa" },
  { emoji: "🍠", nombre: "Camote" },
  { emoji: "🥕", nombre: "Zanahoria" },
  { emoji: "🌽", nombre: "Maíz" },
  { emoji: "🥦", nombre: "Brócoli" },
  { emoji: "🥬", nombre: "Lechuga / Acelga / Col" },
  { emoji: "🥒", nombre: "Pepino" },
  { emoji: "🫛", nombre: "Ejote / Chícharo" },
  { emoji: "🧅", nombre: "Cebolla" },
  { emoji: "🧄", nombre: "Ajo" },
  { emoji: "🍄", nombre: "Champiñón / Hongo" },
  { emoji: "🫚", nombre: "Jengibre" },

  // 🌰 Legumbres y semillas
  { emoji: "🥜", nombre: "Cacahuate" },
  { emoji: "🫘", nombre: "Frijol" },
  { emoji: "🌰", nombre: "Castaña" },

  // 🌿 Hierbas y extras
  { emoji: "🌿", nombre: "Hierbas / Cilantro / Perejil" },
  { emoji: "🌱", nombre: "Brote / Germinado" },
  { emoji: "🪴", nombre: "Planta" },
];

interface Props {
  value: string;
  onChange: (emoji: string) => void;
}

export default function EmojiPicker({ value, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  // Calcular posición fija al abrir
  const abrir = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow > 340 ? rect.bottom + 4 : rect.top - 344;
      setPanelPos({ top, left: rect.left, width: rect.width });
    }
    setAbierto((v) => !v);
  };

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!abierto) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.closest("[data-emoji-picker]")?.contains(e.target as Node)) {
        setAbierto(false);
        setBusqueda("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [abierto]);

  const filtrados = busqueda.trim()
    ? FRUTAS.filter((f) =>
        f.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        f.emoji === busqueda.trim()
      )
    : FRUTAS;

  return (
    <div className="relative" data-emoji-picker="">
      {/* Botón activador */}
      <button
        ref={btnRef}
        type="button"
        onClick={abrir}
        className="flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:opacity-80 w-full"
        style={{ background: "#f9fafb", border: "1.5px solid #d1d5db", color: "#374151" }}
      >
        <span className="text-3xl leading-none">{value || "🍎"}</span>
        <span className="flex-1 text-left text-gray-600">
          {value
            ? FRUTAS.find((f) => f.emoji === value)?.nombre ?? "Emoji seleccionado"
            : "Seleccionar emoji"}
        </span>
        <span className="text-gray-400 text-xs">{abierto ? "▲" : "▼"}</span>
      </button>

      {/* Panel renderizado con position:fixed para escapar de overflow:hidden */}
      {abierto && (
        <div
          data-emoji-picker=""
          className="rounded-2xl bg-white p-4 shadow-2xl"
          style={{
            position: "fixed",
            top: panelPos.top,
            left: panelPos.left,
            width: Math.max(panelPos.width, 320),
            maxHeight: "340px",
            overflow: "hidden",
            border: "1.5px solid #e5e7eb",
            zIndex: 9999,
          }}
        >
          {/* Buscador */}
          <input
            type="text"
            placeholder="Buscar fruta o verdura..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
            autoFocus
          />

          {/* Grid de emojis */}
          <div
            className="grid grid-cols-6 gap-1 overflow-y-auto"
            style={{ maxHeight: "240px" }}
          >
            {filtrados.map((f) => (
              <button
                key={f.emoji + f.nombre}
                type="button"
                title={f.nombre}
                onClick={() => {
                  onChange(f.emoji);
                  setAbierto(false);
                  setBusqueda("");
                }}
                className="flex flex-col items-center rounded-xl p-2 text-2xl transition hover:opacity-80"
                style={
                  value === f.emoji
                    ? { background: "#dcfce7", outline: "2px solid #15803d" }
                    : { background: "#f9fafb" }
                }
              >
                <span>{f.emoji}</span>
                <span className="mt-0.5 text-[9px] text-gray-500 leading-none text-center w-full truncate">
                  {f.nombre.split("/")[0].trim()}
                </span>
              </button>
            ))}
            {filtrados.length === 0 && (
              <p className="col-span-6 py-4 text-center text-xs text-gray-400">
                Sin resultados
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
