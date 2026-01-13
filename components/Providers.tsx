'use client';

import { ReactNode } from 'react';
import { SWRConfig } from 'swr';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 10000,
        errorRetryCount: 2,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
