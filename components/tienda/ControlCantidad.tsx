"use client";
/**
 * components/tienda/ControlCantidad.tsx
 * Botones +/- reutilizables con validación visual.
 */

interface Props {
  cantidad: number;
  max: number;
  puedeAgregar: boolean;
  onSumar: () => void;
  onRestar: () => void;
}

export default function ControlCantidad({
  cantidad,
  max,
  puedeAgregar,
  onSumar,
  onRestar,
}: Props) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
      <button
        onClick={onRestar}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lg font-bold shadow-sm
          transition hover:bg-red-50 hover:text-red-600 active:scale-90"
        aria-label="Restar uno"
      >
        −
      </button>

      <span className="min-w-[2rem] text-center text-sm font-bold text-gray-800">
        {cantidad}
      </span>

      <button
        onClick={onSumar}
        disabled={!puedeAgregar || cantidad >= max}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lg font-bold shadow-sm
          transition hover:bg-green-50 hover:text-green-600 active:scale-90
          disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Sumar uno"
      >
        +
      </button>
    </div>
  );
}
