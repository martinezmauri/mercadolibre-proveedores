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
import { SelectorCategorias } from '@/components/proveedores/selector-categorias';
import { proveedorSchema, type ProveedorFormValues } from '@/lib/validation/proveedorSchema';
import { crearProveedorAction, actualizarProveedorAction } from '@/app/proveedores/actions';
import { handleActionResult } from '@/lib/handleActionResult';
import type { Categoria, Proveedor } from '@/types/proveedor';

type FormularioProveedorProps = {
  categorias: Categoria[];
  proveedor?: Proveedor;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type ProveedorFormInput = z.input<typeof proveedorSchema>;

function buildDefaultValues(proveedor?: Proveedor): ProveedorFormInput {
  return {
    nombre: proveedor?.nombre ?? '',
    url: proveedor?.url ?? '',
    compraMinima: proveedor?.compraMinima ?? null,
    whatsapp: proveedor?.whatsapp ?? '',
    categoriaIds: proveedor?.categorias.map((c) => c.id) ?? [],
  };
}

export function FormularioProveedor({
  categorias,
  proveedor,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: FormularioProveedorProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;

  const form = useForm<ProveedorFormInput, unknown, ProveedorFormValues>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: buildDefaultValues(proveedor),
  });

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(proveedor));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: ProveedorFormValues) {
    const result = proveedor
      ? await actualizarProveedorAction(proveedor.id, values)
      : await crearProveedorAction(values);

    if (!handleActionResult(result, proveedor ? 'Proveedor actualizado' : 'Proveedor creado')) {
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
          <DialogTitle>{proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="compraMinima"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Compra mínima</FormLabel>
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
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoriaIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorías</FormLabel>
                  <FormControl>
                    <SelectorCategorias
                      categorias={categorias}
                      seleccionadas={field.value ?? []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{proveedor ? 'Guardar cambios' : 'Crear proveedor'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
