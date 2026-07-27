'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- next-themes' standard mount guard: this boolean must be a literal on both server and the client's first (hydration) render, only flipping after commit, to avoid a real hydration mismatch (resolvedTheme itself can resolve synchronously as soon as `window` exists, so checking it directly is not a safe substitute — confirmed via testing).
    setMounted(true);
  }, []);

  if (!mounted) {
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
