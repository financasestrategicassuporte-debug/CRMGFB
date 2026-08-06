"use client";

import { CallProvider } from "./call-context";
import { CallWidget } from "./call-widget";

/** Junta o provider de estado da ligação com o widget flutuante. Só existe
 * dentro de `(app)/layout.tsx`, ou seja, só renderiza pra quem está
 * logado na plataforma — nunca aparece fora do CRM. */
export function CallMount({ children }: { children: React.ReactNode }) {
  return (
    <CallProvider>
      {children}
      <CallWidget />
    </CallProvider>
  );
}
