'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  CalendarClock, 
  FileText,
  Settings,
  Menu,
  X,
  Upload
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const menuItems = [
  { href: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/lancamentos', label: 'Lançamentos', icon: ArrowLeftRight },
  { href: '/contas', label: 'Contas', icon: CalendarClock },
  { href: '/importar', label: 'Importar', icon: Upload },
  { href: '/relatorio', label: 'Relatório', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-neutral-200 min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-neutral-100">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-neutral-900">CaixaClaro</h1>
            <p className="text-xs text-neutral-500">Controle financeiro</p>
          </div>
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  )}
                >
                  <Icon className={clsx('w-5 h-5', isActive ? 'text-primary-600' : 'text-neutral-400')} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-100">
        <Link
          href="/configuracoes"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all duration-200"
        >
          <Settings className="w-5 h-5 text-neutral-400" />
          <span>Configurações</span>
        </Link>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav md:hidden">
      <ul className="flex justify-around items-center">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={clsx(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200',
                  isActive
                    ? 'text-primary-600'
                    : 'text-neutral-400'
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileHeader({ title }: { title: string }) {
  return (
    <header className="md:hidden sticky top-0 z-40 bg-white border-b border-neutral-200 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <h1 className="font-display font-bold text-lg text-neutral-900">{title}</h1>
        </div>
        <Link href="/configuracoes" className="p-2 text-neutral-500">
          <Settings className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}
