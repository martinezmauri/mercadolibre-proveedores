'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { productoSchema, type ProductoFormValues } from '@/lib/validation/productoSchema';
import { crearProductoAction, actualizarProductoAction } from '@/app/productos/actions';
import { handleActionResult } from '@/lib/handleActionResult';
import type { Categoria, Proveedor } from '@/types/proveedor';
import type { Producto } from '@/types/producto';

const SIN_CATEGORIA = 'sin-categoria';

type FormularioProductoProps = {
  proveedores: Proveedor[];
  categorias: Categoria[];
  producto?: Producto;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type ProductoFormInput = z.input<typeof productoSchema>;

function buildDefaultValues(producto?: Producto): ProductoFormInput {
  return {
    proveedorId: producto?.proveedorId ?? '',
    categoriaId: producto?.categoriaId ?? null,
    nombre: producto?.nombre ?? '',
    url: producto?.url ?? '',
    imagenUrl: producto?.imagenUrl ?? null,
    precioMenor: producto?.precioMenor ?? null,
    precioMayor: producto?.precioMayor ?? null,
  };
}

export function FormularioProducto({
  proveedores,
  categorias,
  producto,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: FormularioProductoProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;

  const form = useForm<ProductoFormInput, unknown, ProductoFormValues>({
    resolver: zodResolver(productoSchema),
    defaultValues: buildDefaultValues(producto),
  });

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(producto));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: ProductoFormValues) {
    const result = producto
      ? await actualizarProductoAction(producto.id, values)
      : await crearProductoAction(values);

    if (!handleActionResult(result, producto ? 'Producto actualizado' : 'Producto creado')) {
      return;
    }

    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{producto ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="proveedorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccioná un proveedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {proveedores.map((proveedor) => (
                        <SelectItem key={proveedor.id} value={proveedor.id}>
                          {proveedor.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del producto</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imagenUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagen (URL)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="precioMenor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio por menor</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={typeof field.value === 'number' || typeof field.value === 'string' ? field.value : ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="precioMayor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio por mayor</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={typeof field.value === 'number' || typeof field.value === 'string' ? field.value : ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoriaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select
                    value={field.value ?? SIN_CATEGORIA}
                    onValueChange={(value) => field.onChange(value === SIN_CATEGORIA ? null : value)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sin categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SIN_CATEGORIA}>Sin categoría</SelectItem>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id}>
                          {categoria.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{producto ? 'Guardar cambios' : 'Crear producto'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
