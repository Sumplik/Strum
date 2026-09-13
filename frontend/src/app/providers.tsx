import * as React from "react";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { HttpError } from "@/lib/http";
import { SESSION_EXPIRED_EVENT } from "@/app/session";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // Query data (bukan login) yang ditolak 401 berarti cookie sesi sudah tidak berlaku.
    onError: (error) => {
      if (error instanceof HttpError && error.status === 401) {
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof HttpError && [400, 401, 403, 404].includes(error.status)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 2_000,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={150}>
        {children}
        <Toaster richColors position="bottom-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
