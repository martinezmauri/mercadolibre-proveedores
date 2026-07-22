export type Categoria = {
  id: string;
  nombre: string;
};

export type Proveedor = {
  id: string;
  nombre: string;
  url: string;
  compraMinima: number | null;
  whatsapp: string | null;
  createdAt: string;
  categorias: Categoria[];
};

export type ProveedorInput = {
  nombre: string;
  url: string;
  compraMinima: number | null;
  whatsapp: string | null;
  categoriaIds: string[];
};
