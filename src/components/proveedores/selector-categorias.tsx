'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Categoria } from '@/types/proveedor';

type SelectorCategoriasProps = {
  categorias: Categoria[];
  seleccionadas: string[];
  onChange: (categoriaIds: string[]) => void;
};

export function SelectorCategorias({ categorias, seleccionadas, onChange }: SelectorCategoriasProps) {
  function toggle(categoriaId: string, checked: boolean) {
    if (checked) {
      onChange([...seleccionadas, categoriaId]);
    } else {
      onChange(seleccionadas.filter((id) => id !== categoriaId));
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {categorias.map((categoria) => (
        <div key={categoria.id} className="flex items-center gap-2">
          <Checkbox
            id={`categoria-${categoria.id}`}
            checked={seleccionadas.includes(categoria.id)}
            onCheckedChange={(checked) => toggle(categoria.id, checked === true)}
          />
          <Label htmlFor={`categoria-${categoria.id}`}>{categoria.nombre}</Label>
        </div>
      ))}
    </div>
  );
}
