'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogoFotoProducto } from '@/components/productos/dialogo-foto-producto';
import { FormularioProducto } from '@/components/productos/formulario-producto';
import type { Categoria, Proveedor } from '@/types/proveedor';
import type { DatosExtraidosProducto } from '@/types/producto';

type NuevoProductoDesdeFotoProps = {
  proveedores: Proveedor[];
  categorias: Categoria[];
};

type DatosFoto = DatosExtraidosProducto & { imagenUrl: string };

export function NuevoProductoDesdeFoto({ proveedores, categorias }: NuevoProductoDesdeFotoProps) {
  const [datosDesdeFoto, setDatosDesdeFoto] = useState<DatosFoto | null>(null);

  const valoresIniciales = datosDesdeFoto
    ? { ...datosDesdeFoto, nombre: datosDesdeFoto.nombre ?? undefined }
    : undefined;

  return (
    <>
      <DialogoFotoProducto
        trigger={<Button variant="outline">Nuevo producto desde foto</Button>}
        onDatosExtraidos={setDatosDesdeFoto}
      />
      <FormularioProducto
        proveedores={proveedores}
        categorias={categorias}
        valoresIniciales={valoresIniciales}
        open={datosDesdeFoto !== null}
        onOpenChange={(open) => {
          if (!open) setDatosDesdeFoto(null);
        }}
      />
    </>
  );
}
