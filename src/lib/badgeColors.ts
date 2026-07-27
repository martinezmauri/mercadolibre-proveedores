export type ColorToken =
  | 'blue'
  | 'cyan'
  | 'amber'
  | 'violet'
  | 'orange'
  | 'emerald'
  | 'slate'
  | 'indigo'
  | 'fuchsia';

const BADGE_COLOR_CLASSES: Record<ColorToken, string> = {
  blue: 'border-transparent bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  cyan: 'border-transparent bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  amber: 'border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  violet: 'border-transparent bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  orange: 'border-transparent bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  emerald: 'border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  slate: 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  indigo: 'border-transparent bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  fuchsia: 'border-transparent bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
};

export function badgeColorClasses(token: ColorToken): string {
  return BADGE_COLOR_CLASSES[token];
}
