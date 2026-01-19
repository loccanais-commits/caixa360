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
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';
  
  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 hover:shadow-[0_7px_29px_rgba(6,182,212,0.5)] hover:tracking-wider active:transform active:translate-y-1',
    secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 hover:shadow-[0_7px_29px_rgba(16,185,129,0.5)] hover:tracking-wider active:transform active:translate-y-1',
    outline: 'bg-white border-0 text-neutral-700 shadow-[0_0_8px_rgba(0,0,0,0.05)] hover:bg-primary-500 hover:text-white hover:shadow-[0_7px_29px_rgba(6,182,212,0.5)] hover:tracking-wider active:transform active:translate-y-1',
    ghost: 'text-neutral-600 hover:bg-neutral-100 hover:tracking-wider',
    entrada: 'bg-entrada text-white hover:bg-entrada-dark hover:shadow-[0_7px_29px_rgba(16,185,129,0.5)] hover:tracking-wider active:transform active:translate-y-1',
    saida: 'bg-white text-saida shadow-[0_0_8px_rgba(0,0,0,0.05)] hover:bg-saida hover:text-white hover:shadow-[0_7px_29px_rgba(239,68,68,0.5)] hover:tracking-wider active:transform active:translate-y-1',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3 text-base',
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

export function Input({ label, error, icon, className, id, ...props }: InputProps) {
  // Gerar ID único se não fornecido (para acessibilidade)
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
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
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
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
      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-1 text-sm text-saida">
          {error}
        </p>
      )}
    </div>
  );
}

// ==================== SELECT ====================

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  // Gerar ID único se não fornecido (para acessibilidade)
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
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
      {error && (
        <p id={`${selectId}-error`} role="alert" className="mt-1 text-sm text-saida">
          {error}
        </p>
      )}
    </div>
  );
}

// ==================== CARD ====================

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'neu';
}

export function Card({ children, className, onClick, variant = 'default' }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-3xl p-6 transition-all duration-300',
        variant === 'neu' 
          ? 'bg-neutral-100 shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff] hover:shadow-[12px_12px_20px_#c8c8c8,-12px_-12px_20px_#ffffff]'
          : 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]',
        onClick && 'cursor-pointer hover:-translate-y-1',
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
  label?: string;
  title?: string; // alias para label
  value: string;
  icon?: ReactNode;
  variant?: 'default' | 'entrada' | 'saida' | 'alerta';
  color?: 'primary' | 'success' | 'danger' | 'warning'; // alias para variant
  trend?: 'up' | 'down' | { value: number; label: string };
}

export function StatCard({ label, title, value, icon, variant = 'default', color, trend }: StatCardProps) {
  // Mapear color para variant
  const variantMap: Record<string, 'default' | 'entrada' | 'saida' | 'alerta'> = {
    primary: 'default',
    success: 'entrada',
    danger: 'saida',
    warning: 'alerta'
  };
  const actualVariant = color ? variantMap[color] || variant : variant;
  const displayLabel = label || title || '';

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

  // Renderizar trend
  const renderTrend = () => {
    if (!trend) return null;
    
    // Se trend é string ('up' ou 'down'), não mostrar porcentagem
    if (typeof trend === 'string') {
      return null; // Não mostrar NaN%
    }
    
    // Se trend é objeto com value e label
    if (typeof trend === 'object' && 'value' in trend) {
      return (
        <p className={clsx(
          'text-xs mt-1',
          trend.value >= 0 ? 'text-entrada-dark' : 'text-saida-dark'
        )}>
          {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}% {trend.label}
        </p>
      );
    }
    
    return null;
  };

  return (
    <Card className={clsx(variants[actualVariant], 'overflow-hidden')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-neutral-500 truncate">{displayLabel}</p>
          <p className="text-base sm:text-xl lg:text-2xl font-bold text-neutral-900 mt-0.5 sm:mt-1">{value}</p>
          {renderTrend()}
        </div>
        {/* Ícone escondido no mobile para economizar espaço */}
        {icon && (
          <div className={clsx('hidden sm:flex p-2 sm:p-3 rounded-xl flex-shrink-0', iconVariants[actualVariant])}>
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

// ==================== CONFIRM MODAL ====================

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const iconColors = {
    danger: 'text-saida bg-saida-light',
    warning: 'text-alerta bg-alerta-light',
    info: 'text-primary-500 bg-primary-100',
  };

  const buttonVariants = {
    danger: 'bg-saida hover:bg-saida-dark text-white',
    warning: 'bg-alerta hover:bg-alerta-dark text-white',
    info: 'bg-primary-500 hover:bg-primary-600 text-white',
  };

  const icons = {
    danger: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up p-6">
        <div className="flex items-start gap-4">
          <div className={clsx('p-3 rounded-full flex-shrink-0', iconColors[variant])}>
            {icons[variant]}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
            <p className="mt-2 text-sm text-neutral-600">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2',
              buttonVariants[variant]
            )}
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
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

interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
}

export function Loading({ text, fullScreen = false }: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Spinner simples */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-neutral-200"></div>
        <div className="w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
      </div>
      {text && <p className="text-sm text-neutral-500 mt-4">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

// Loading simples inline
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };
  
  return (
    <div className={`${sizes[size]} border-primary-200 border-t-primary-500 rounded-full animate-spin`} />
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

// ==================== CURRENCY INPUT ====================

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}

export function CurrencyInput({ label, error, value, onChange, className, ...props }: CurrencyInputProps) {
  const formatCurrency = (val: string) => {
    // Remove tudo exceto números
    let numbers = val.replace(/\D/g, '');

    // Se vazio, retorna vazio
    if (!numbers) return '';

    // Converte para número e divide por 100 para ter centavos
    const numValue = parseInt(numbers, 10) / 100;

    // Formata como moeda brasileira
    return numValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    onChange(formatted);
  };

  // Converte o valor formatado de volta para número (para salvar no banco)
  const getNumericValue = () => {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">
          R$
        </span>
        <input
          type="text"
          inputMode="numeric"
          className={clsx(
            'w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl text-neutral-900',
            'placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'transition-all duration-200 text-right font-medium',
            error && 'border-saida focus:ring-saida',
            className
          )}
          value={value}
          onChange={handleChange}
          placeholder="0,00"
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-saida">{error}</p>}
    </div>
  );
}

// Helper para converter valor formatado para número
export function currencyToNumber(value: string): number {
  if (!value) return 0;
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
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
