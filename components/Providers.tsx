'use client';

import { ReactNode } from 'react';
import { DataProvider } from '@/lib/contexts/DataContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <DataProvider>
      {children}
    </DataProvider>
  );
}
