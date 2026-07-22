create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  url text not null,
  compra_minima numeric,
  whatsapp text,
  created_at timestamptz not null default now()
);

create table public.proveedor_categorias (
  proveedor_id uuid not null references public.proveedores(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  primary key (proveedor_id, categoria_id)
);

alter table public.categorias enable row level security;
alter table public.proveedores enable row level security;
alter table public.proveedor_categorias enable row level security;

insert into public.categorias (nombre) values
  ('hogar'), ('cocina'), ('limpieza'), ('electrónica'), ('tecnología'),
  ('belleza'), ('cuidado personal'), ('salud'), ('bienestar'), ('arte'),
  ('manualidades'), ('mascotas');
