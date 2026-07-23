insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;
