'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  if (resolvedTheme === undefined) {
    return <Button variant="ghost" size="icon" disabled aria-label="Cambiar tema" />;
  }

  const esOscuro = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={() => setTheme(esOscuro ? 'light' : 'dark')}
    >
      {esOscuro ? <Sun /> : <Moon />}
    </Button>
  );
}
