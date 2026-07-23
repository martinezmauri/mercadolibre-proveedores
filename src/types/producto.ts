export type Producto = {
  id: string;
  proveedorId: string;
  categoriaId: string | null;
  nombre: string;
  url: string;
  imagenUrl: string | null;
  precioMenor: number | null;
  precioMayor: number | null;
  createdAt: string;
};

export type ProductoInput = {
  proveedorId: string;
  categoriaId: string | null;
  nombre: string;
  url: string;
  imagenUrl: string | null;
  precioMenor: number | null;
  precioMayor: number | null;
};

export type DatosExtraidosProducto = {
  nombre: string | null;
  precioMayor: number | null;
  categoriaId: string | null;
};
