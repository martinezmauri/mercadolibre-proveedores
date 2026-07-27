export type ColorToken =
  | 'blue'
  | 'cyan'
  | 'amber'
  | 'violet'
  | 'orange'
  | 'emerald'
  | 'slate'
  | 'indigo'
  | 'fuchsia';

export type Persona = {
  id: string;
  nombre: string;
};

export type CategoriaGasto = {
  id: string;
  nombre: string;
  color: ColorToken;
};

export type Gasto = {
  id: string;
  nombre: string;
  personaId: string;
  categoriaId: string | null;
  monto: number;
  createdAt: string;
  updatedAt: string;
};

export type GastoInput = {
  nombre: string;
  personaId: string;
  categoriaId: string | null;
  monto: number;
};

export type CampoFechaGasto = 'created_at' | 'updated_at';

export type FiltrosGasto = {
  personaId: string | null;
  categoriaId: string | null;
  campoFecha: CampoFechaGasto;
  desde: string | null;
  hasta: string | null;
};
