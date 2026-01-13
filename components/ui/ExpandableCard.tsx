'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOutsideClick } from '@/lib/hooks/useOutsideClick';
import { X } from 'lucide-react';

export interface ExpandableItem {
  id: string;
  title: string;
  subtitle?: string;
  value?: string;
  valueColor?: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  content?: () => React.ReactNode;
  ctaText?: string;
  ctaAction?: () => void;
  cta2Text?: string;
  cta2Action?: () => void;
}

interface ExpandableCardListProps {
  items: ExpandableItem[];
  emptyMessage?: string;
  className?: string;
}

export function ExpandableCardList({ items, emptyMessage = 'Nenhum item', className = '' }: ExpandableCardListProps) {
  const [active, setActive] = useState<ExpandableItem | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActive(null);
      }
    }

    if (active) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);

  useOutsideClick(ref, () => setActive(null));

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-400 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm h-full w-full z-40"
          />
        )}
      </AnimatePresence>

      {/* Expanded Card Modal */}
      <AnimatePresence>
        {active && (
          <div className="fixed inset-0 grid place-items-center z-50 p-4">
            <motion.button
              key={`button-close-${active.id}-${id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 right-4 flex items-center justify-center bg-white rounded-full h-8 w-8 shadow-lg z-50"
              onClick={() => setActive(null)}
            >
              <X className="w-4 h-4 text-neutral-600" />
            </motion.button>

            <motion.div
              layoutId={`card-${active.id}-${id}`}
              ref={ref}
              className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="p-5 bg-gradient-to-br from-primary-50 to-secondary-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {active.icon && (
                      <motion.div 
                        layoutId={`icon-${active.id}-${id}`}
                        className="p-3 bg-white rounded-xl shadow-sm"
                      >
                        {active.icon}
                      </motion.div>
                    )}
                    <div>
                      <motion.h3
                        layoutId={`title-${active.id}-${id}`}
                        className="font-semibold text-neutral-900 text-lg"
                      >
                        {active.title}
                      </motion.h3>
                      {active.subtitle && (
                        <motion.p
                          layoutId={`subtitle-${active.id}-${id}`}
                          className="text-neutral-500 text-sm"
                        >
                          {active.subtitle}
                        </motion.p>
                      )}
                    </div>
                  </div>
                  {active.value && (
                    <motion.span
                      layoutId={`value-${active.id}-${id}`}
                      className={`font-bold text-xl ${active.valueColor || 'text-neutral-900'}`}
                    >
                      {active.value}
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Content */}
              {active.content && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-5"
                >
                  {active.content()}
                </motion.div>
              )}

              {/* CTAs - 1 ou 2 botões */}
              {(active.ctaText || active.cta2Text) && (
                <div className="px-5 pb-5 flex gap-2">
                  {active.ctaText && active.ctaAction && (
                    <button
                      onClick={() => {
                        active.ctaAction?.();
                        setActive(null);
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-sm"
                    >
                      {active.ctaText}
                    </button>
                  )}
                  {active.cta2Text && active.cta2Action && (
                    <button
                      onClick={() => {
                        active.cta2Action?.();
                        setActive(null);
                      }}
                      className="flex-1 py-3 border border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition-colors text-sm"
                    >
                      {active.cta2Text}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* List of items */}
      <ul className={`space-y-2 ${className}`}>
        {items.map((item) => (
          <motion.li
            layoutId={`card-${item.id}-${id}`}
            key={item.id}
            onClick={() => item.content && setActive(item)}
            className={`p-3 flex items-center justify-between rounded-xl transition-colors ${
              item.content ? 'cursor-pointer hover:bg-neutral-100' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {item.icon && (
                <motion.div 
                  layoutId={`icon-${item.id}-${id}`}
                  className="p-2 bg-neutral-100 rounded-lg flex-shrink-0"
                >
                  {item.icon}
                </motion.div>
              )}
              <div className="min-w-0 flex-1">
                <motion.h3
                  layoutId={`title-${item.id}-${id}`}
                  className="font-medium text-neutral-900 text-sm truncate"
                >
                  {item.title}
                </motion.h3>
                {item.subtitle && (
                  <motion.p
                    layoutId={`subtitle-${item.id}-${id}`}
                    className="text-neutral-500 text-xs truncate"
                  >
                    {item.subtitle}
                  </motion.p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.badge && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-neutral-100 text-neutral-600'}`}>
                  {item.badge}
                </span>
              )}
              {item.value && (
                <motion.span
                  layoutId={`value-${item.id}-${id}`}
                  className={`font-semibold text-sm ${item.valueColor || 'text-neutral-900'}`}
                >
                  {item.value}
                </motion.span>
              )}
            </div>
          </motion.li>
        ))}
      </ul>
    </>
  );
}
