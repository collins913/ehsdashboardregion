"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isTrustedGLifeMessage, parseGLifeContextMessage, type GLifeProfile } from "./glife-context";

const GLifeContext = createContext<GLifeProfile | null>(null);
const parentOrigin = process.env.NEXT_PUBLIC_GLIFE_PARENT_ORIGIN ?? "";

export function GLifeContextProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<GLifeProfile | null>(null);
  useEffect(() => {
    if (!parentOrigin || window.parent === window) return;
    const onMessage = (event: MessageEvent<unknown>) => {
      if (!isTrustedGLifeMessage(event, parentOrigin, window.parent)) return;
      const next = parseGLifeContextMessage(event.data);
      if (next) setProfile((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "GLIFE_READY" }, parentOrigin);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  const safeProfile = useMemo(() => profile, [profile]);
  return <GLifeContext.Provider value={safeProfile}>{children}</GLifeContext.Provider>;
}

/** Display-only profile. This value must never authorize server queries or mutations. */
export function useGLifeProfile() { return useContext(GLifeContext); }
