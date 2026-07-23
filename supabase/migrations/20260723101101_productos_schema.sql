create table public.productos (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores(id) on delete cascade,
  categoria_id uuid references public.categorias(id) on delete set null,
  nombre text not null,
  url text not null,
  imagen_url text,
  precio_menor numeric,
  precio_mayor numeric,
  created_at timestamptz not null default now()
);

alter table public.productos enable row level security;
