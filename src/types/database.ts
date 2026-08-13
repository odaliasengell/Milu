export type Cliente = {
  id: string;
  user_id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  created_at: string;
};

export type Producto = {
  id: string;
  user_id: string;
  nombre: string;
  categoria: string | null;
  costo: number;
  precio: number;
  cantidad_ingresada: number;
  cantidad_actual: number;
  visible_catalogo: boolean;
  imagen_url: string | null;
  created_at: string;
};

export type ProductoPublico = Pick<
  Producto,
  "id" | "nombre" | "categoria" | "precio" | "imagen_url" | "cantidad_actual"
>;

export type Venta = {
  id: string;
  user_id: string;
  cliente_id: string | null;
  fecha: string;
  total: number;
  created_at: string;
};

export type VentaItem = {
  id: string;
  user_id: string;
  venta_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  subtotal: number;
};

export type VentaConDetalle = Venta & {
  cliente: Pick<Cliente, "id" | "nombre"> | null;
  venta_items: (VentaItem & { producto: Pick<Producto, "id" | "nombre"> })[];
};
