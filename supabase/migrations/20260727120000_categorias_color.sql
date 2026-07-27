alter table public.categorias add column color text not null default 'slate';

update public.categorias set color = 'amber' where nombre = 'hogar';
update public.categorias set color = 'orange' where nombre = 'cocina';
update public.categorias set color = 'cyan' where nombre = 'limpieza';
update public.categorias set color = 'blue' where nombre = 'electrónica';
update public.categorias set color = 'indigo' where nombre = 'tecnología';
update public.categorias set color = 'fuchsia' where nombre = 'belleza';
update public.categorias set color = 'violet' where nombre = 'cuidado personal';
update public.categorias set color = 'emerald' where nombre = 'salud';
update public.categorias set color = 'slate' where nombre = 'bienestar';
update public.categorias set color = 'fuchsia' where nombre = 'arte';
update public.categorias set color = 'violet' where nombre = 'manualidades';
update public.categorias set color = 'orange' where nombre = 'mascotas';
