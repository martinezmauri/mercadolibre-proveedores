create table public.personas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table public.categorias_gasto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  color text not null
);

create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  persona_id uuid not null references public.personas(id),
  categoria_id uuid references public.categorias_gasto(id) on delete set null,
  monto numeric not null check (monto > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.personas enable row level security;
alter table public.categorias_gasto enable row level security;
alter table public.gastos enable row level security;

insert into public.personas (nombre) values
  ('Mauricio Martinez'), ('Jeremias Aruta');

insert into public.categorias_gasto (nombre, color) values
  ('Insumos/stock', 'blue'),
  ('Envíos', 'cyan'),
  ('Comisiones ML', 'amber'),
  ('Publicidad', 'violet'),
  ('Embalaje', 'orange'),
  ('Herramientas/software', 'emerald'),
  ('Otros', 'slate');
