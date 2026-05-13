// types/tienda.ts
// Tipos compartidos entre la tienda y los componentes de UI.

export interface Sucursal {
  id: number;
  nombre: string;
  slug: string;
}

export interface ProductoCatalogo {
  productoSucursalId: number;
  productoId: number;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  precio: number;
  maxCantidad: number;
  stock: number;
}

export interface ItemCarrito {
  productoSucursalId: number;
  productoId: number;
  nombre: string;
  precio: number;
  maxCantidad: number;
  cantidad: number;
}

export interface CatalogoResponse {
  sucursal: Sucursal;
  productos: ProductoCatalogo[];
  limiteCompra: number | null;
}
