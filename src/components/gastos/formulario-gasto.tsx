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
import { gastoSchema, type GastoFormValues } from '@/lib/validation/gastoSchema';
import { crearGastoAction, actualizarGastoAction } from '@/app/gastos/actions';
import { handleActionResult } from '@/lib/handleActionResult';
import type { CategoriaGasto, Gasto, Persona } from '@/types/gasto';

const SIN_CATEGORIA = 'sin-categoria';

type GastoFormInput = z.input<typeof gastoSchema>;

type FormularioGastoProps = {
  personas: Persona[];
  categorias: CategoriaGasto[];
  gasto?: Gasto;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function buildDefaultValues(gasto?: Gasto): GastoFormInput {
  if (gasto) {
    return {
      nombre: gasto.nombre,
      personaId: gasto.personaId,
      categoriaId: gasto.categoriaId,
      monto: gasto.monto,
    };
  }

  return {
    nombre: '',
    personaId: '',
    categoriaId: null,
    monto: 0,
  };
}

export function FormularioGasto({
  personas,
  categorias,
  gasto,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: FormularioGastoProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChangeProp ?? setOpenState;

  const form = useForm<GastoFormInput, unknown, GastoFormValues>({
    resolver: zodResolver(gastoSchema),
    defaultValues: buildDefaultValues(gasto),
  });

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(gasto));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: GastoFormValues) {
    const result = gasto ? await actualizarGastoAction(gasto.id, values) : await crearGastoAction(values);

    if (!handleActionResult(result, gasto ? 'Gasto actualizado' : 'Gasto creado')) {
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
          <DialogTitle>{gasto ? 'Editar gasto' : 'Nuevo gasto'}</DialogTitle>
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
              name="personaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quién gastó</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccioná quién gastó" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {personas.map((persona) => (
                        <SelectItem key={persona.id} value={persona.id}>
                          {persona.nombre}
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
            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto (ARS)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      value={typeof field.value === 'number' || typeof field.value === 'string' ? field.value : ''}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{gasto ? 'Guardar cambios' : 'Crear gasto'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
