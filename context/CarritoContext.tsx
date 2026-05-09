"use client";
/**
 * context/CarritoContext.tsx
 * Estado global del carrito de compras.
 */
import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import type { ItemCarrito } from "@/types/tienda";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface CarritoState {
  items: ItemCarrito[];
  limiteCompra: number | null;
  limiteCantidad: number | null;
}

type CarritoAction =
  | { type: "AGREGAR"; item: Omit<ItemCarrito, "cantidad"> }
  | { type: "QUITAR"; productoSucursalId: number }
  | { type: "SET_CANTIDAD"; productoSucursalId: number; cantidad: number }
  | { type: "SET_LIMITE"; limite: { monto: number | null; cantidad: number | null } }
  | { type: "VACIAR" };

interface CarritoContextValue extends CarritoState {
  agregar: (item: Omit<ItemCarrito, "cantidad">) => void;
  quitar: (productoSucursalId: number) => void;
  setCantidad: (productoSucursalId: number, cantidad: number) => void;
  setLimite: (limite: { monto: number | null; cantidad: number | null }) => void;
  vaciar: () => void;
  total: number;
  itemCount: number;
  montoDisponible: number | null;
}

// ── Reducer ───────────────────────────────────────────────────────────────────

function carritoReducer(state: CarritoState, action: CarritoAction): CarritoState {
  switch (action.type) {
    case "AGREGAR": {
      const existe = state.items.find(
        (i) => i.productoSucursalId === action.item.productoSucursalId
      );
      if (existe) {
        const nuevaCantidad = Math.min(existe.cantidad + 1, existe.maxCantidad);
        return {
          ...state,
          items: state.items.map((i) =>
            i.productoSucursalId === action.item.productoSucursalId
              ? { ...i, cantidad: nuevaCantidad }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.item, cantidad: 1 }],
      };
    }

    case "QUITAR":
      return {
        ...state,
        items: state.items.filter(
          (i) => i.productoSucursalId !== action.productoSucursalId
        ),
      };

    case "SET_CANTIDAD": {
      if (action.cantidad <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (i) => i.productoSucursalId !== action.productoSucursalId
          ),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.productoSucursalId === action.productoSucursalId
            ? { ...i, cantidad: Math.min(action.cantidad, i.maxCantidad) }
            : i
        ),
      };
    }

    case "SET_LIMITE":
      return {
        ...state,
        limiteCompra: action.limite.monto,
        limiteCantidad: action.limite.cantidad,
      };

    case "VACIAR":
      return { ...state, items: [] };

    default:
      return state;
  }
}

// ── Contexto ─────────────────────────────────────────────────────────────────

const CarritoContext = createContext<CarritoContextValue | null>(null);

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(carritoReducer, {
    items: [],
    limiteCompra: null,
    limiteCantidad: null,
  });

  const total = state.items.reduce(
    (acc, i) => acc + i.precio * i.cantidad,
    0
  );

  const agregar = useCallback(
    (item: Omit<ItemCarrito, "cantidad">) => dispatch({ type: "AGREGAR", item }),
    []
  );
  const quitar = useCallback(
    (id: number) => dispatch({ type: "QUITAR", productoSucursalId: id }),
    []
  );
  const setCantidad = useCallback(
    (id: number, cantidad: number) =>
      dispatch({ type: "SET_CANTIDAD", productoSucursalId: id, cantidad }),
    []
  );
  const setLimite = useCallback(
    (limite: { monto: number | null; cantidad: number | null }) =>
      dispatch({ type: "SET_LIMITE", limite }),
    []
  );
  const vaciar = useCallback(() => dispatch({ type: "VACIAR" }), []);

  return (
    <CarritoContext.Provider
      value={{
        ...state,
        total,
        itemCount: state.items.reduce((a, i) => a + i.cantidad, 0),
        montoDisponible:
          state.limiteCompra !== null ? state.limiteCompra - total : null,
        agregar,
        quitar,
        setCantidad,
        setLimite,
        vaciar,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito() {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <CarritoProvider>");
  return ctx;
}
