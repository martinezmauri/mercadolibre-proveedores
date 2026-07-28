import type { ColorToken } from '@/lib/badgeColors';

export type Categoria = {
  id: string;
  nombre: string;
  color: ColorToken;
};

export type TipoContacto = 'telefono' | 'whatsapp' | 'email' | 'instagram' | 'facebook' | 'tiktok' | 'direccion';

export type Contacto = {
  id: string;
  tipo: TipoContacto;
  valor: string;
};

export type Proveedor = {
  id: string;
  nombre: string;
  url: string | null;
  compraMinima: number | null;
  notas: string | null;
  createdAt: string;
  categorias: Categoria[];
  contactos: Contacto[];
};

export type ProveedorInput = {
  nombre: string;
  url: string | null;
  compraMinima: number | null;
  notas: string | null;
  categoriaIds: string[];
  contactos: { tipo: TipoContacto; valor: string }[];
};
