import { Home, Package, Truck, Wallet, type LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/proveedores', label: 'Proveedores', icon: Truck },
  { href: '/productos', label: 'Productos', icon: Package },
  { href: '/gastos', label: 'Gastos', icon: Wallet },
];
