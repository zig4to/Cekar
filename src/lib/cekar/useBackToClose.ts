"use client";

import { useCallback, useEffect, useRef } from "react";

// Celozaslonski pogled (npr. računi): sistemski "nazaj" (Android, gesta) naj
// zapre pogled, ne zapusti strani. Ob odprtju dodamo korak v zgodovino (isti
// URL, Next.js stanje ohranjeno), popstate pogled zapre. Vrne close(), ki ga
// kličejo X / Esc: gre prek history.back(), da korak ne ostane v zgodovini.
export function useBackToClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    // brez podvajanja (StrictMode efekt požene dvakrat)
    if (!window.history.state?.cekarOverlay) {
      window.history.pushState({ ...window.history.state, cekarOverlay: true }, "");
    }
    const onPop = () => closeRef.current();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open]);

  return useCallback(() => {
    if (window.history.state?.cekarOverlay) window.history.back();
    else closeRef.current();
  }, []);
}
