'use client';

import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

// ==================== BUTTON ====================

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'entrada' | 'saida';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  children,
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-lg shadow-primary-500/25',
    secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 focus:ring-secondary-500',
    outline: 'border-2 border-neutral-200 text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-500',
    ghost: 'text-neutral-600 hover:bg-neutral-100 focus:ring-neutral-500',
    entrada: 'bg-entrada text-white hover:bg-entrada-dark focus:ring-entrada',
    saida: 'bg-saida text-white hover:bg-saida-dark focus:ring-saida',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

// ==================== INPUT ====================

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {icon}
          </div>
        )}
        <input
          className={clsx(
            'w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-neutral-900',
            'placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'transition-all duration-200',
            icon && 'pl-10',
            error && 'border-saida focus:ring-saida',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-saida">{error}</p>}
    </div>
  );
}

// ==================== SELECT ====================

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        className={clsx(
          'w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-neutral-900',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'transition-all duration-200 bg-white',
          error && 'border-saida focus:ring-saida',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-saida">{error}</p>}
    </div>
  );
}

// ==================== CARD ====================

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-2xl p-6 shadow-sm border border-neutral-100',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={clsx('font-semibold text-neutral-900', className)}>
      {children}
    </h3>
  );
}

// ==================== STAT CARD ====================

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  variant?: 'default' | 'entrada' | 'saida' | 'alerta';
  trend?: { value: number; label: string };
}

export function StatCard({ label, value, icon, variant = 'default', trend }: StatCardProps) {
  const variants = {
    default: 'bg-white',
    entrada: 'bg-gradient-to-br from-entrada-light to-emerald-50',
    saida: 'bg-gradient-to-br from-saida-light to-red-50',
    alerta: 'bg-gradient-to-br from-alerta-light to-amber-50',
  };

  const iconVariants = {
    default: 'bg-neutral-100 text-neutral-600',
    entrada: 'bg-entrada/10 text-entrada-dark',
    saida: 'bg-saida/10 text-saida-dark',
    alerta: 'bg-alerta/10 text-alerta-dark',
  };

  return (
    <Card className={clsx(variants[variant], 'overflow-hidden')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-neutral-500 truncate">{label}</p>
          <p className="text-base sm:text-xl lg:text-2xl font-bold text-neutral-900 mt-0.5 sm:mt-1">{value}</p>
          {trend && (
            <p className={clsx(
              'text-xs mt-1',
              trend.value >= 0 ? 'text-entrada-dark' : 'text-saida-dark'
            )}>
              {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {/* Ícone escondido no mobile para economizar espaço */}
        {icon && (
          <div className={clsx('hidden sm:flex p-2 sm:p-3 rounded-xl flex-shrink-0', iconVariants[variant])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ==================== BADGE ====================

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'entrada' | 'saida' | 'alerta' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-neutral-100 text-neutral-700',
    entrada: 'bg-entrada-light text-entrada-dark',
    saida: 'bg-saida-light text-saida-dark',
    alerta: 'bg-alerta-light text-alerta-dark',
    info: 'bg-primary-100 text-primary-700',
  };

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}

// ==================== MODAL ====================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={clsx(
        'relative bg-white rounded-2xl w-full shadow-2xl animate-slide-up',
        sizes[size]
      )}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-neutral-100">
            <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// ==================== EMPTY STATE ====================

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-neutral-900">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-500 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ==================== LOADING ====================

export function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );
}

// ==================== AVATAR ====================

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div className={clsx(
      'rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 text-white font-medium flex items-center justify-center',
      sizes[size],
      className
    )}>
      {initials}
    </div>
  );
}

// ==================== PROGRESS BAR ====================

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'default' | 'entrada' | 'saida' | 'alerta';
  showLabel?: boolean;
}

export function ProgressBar({ value, max = 100, variant = 'default', showLabel = false }: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const variants = {
    default: 'bg-primary-500',
    entrada: 'bg-entrada',
    saida: 'bg-saida',
    alerta: 'bg-alerta',
  };

  return (
    <div className="w-full">
      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div 
          className={clsx('h-full rounded-full transition-all duration-500', variants[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-neutral-500 mt-1">{percentage.toFixed(0)}%</p>
      )}
    </div>
  );
}
