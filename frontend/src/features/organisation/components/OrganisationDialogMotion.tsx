import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import "../organisation-dialog-motion.css";

const DIALOG_MOTION_DURATION_MS = 360;

interface MotionState {
  origin: { x: number; y: number } | null;
  closing: boolean;
  capture: (event: MouseEvent<HTMLButtonElement>) => void;
  reset: () => void;
  close: (onClosed: () => void) => void;
}

const OrganisationDialogMotionContext = createContext<MotionState | null>(null);

// edited by wali: Share trigger capture and 360 ms close timing across organisation forms.
export function OrganisationDialogMotionProvider({ children }: { children: ReactNode }) {
  const [origin, setOrigin] = useState<MotionState["origin"]>(null);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const capture = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setClosing(false);
    setOrigin({ x: event.clientX, y: event.clientY });
  }, []);

  const reset = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setClosing(false);
    setOrigin(null);
  }, []);

  const close = useCallback((onClosed: () => void) => {
    if (closing) return;
    if (!origin) {
      onClosed();
      return;
    }

    setClosing(true);
    closeTimer.current = setTimeout(() => {
      onClosed();
      setClosing(false);
      setOrigin(null);
      closeTimer.current = null;
    }, DIALOG_MOTION_DURATION_MS);
  }, [closing, origin]);

  return (
    <OrganisationDialogMotionContext.Provider value={{ origin, closing, capture, reset, close }}>
      {children}
    </OrganisationDialogMotionContext.Provider>
  );
}

export function useOrganisationDialogMotion(): MotionState | null {
  return useContext(OrganisationDialogMotionContext);
}

export function useRequiredOrganisationDialogMotion(): MotionState {
  const motion = useOrganisationDialogMotion();
  if (!motion) throw new Error("OrganisationDialogMotionProvider is missing.");
  return motion;
}

// edited by wali: Keep dialog measurement and animation classes in one reusable hook.
export function useOrganisationDialogAnimation<T extends HTMLElement = HTMLElement>(open: boolean) {
  const sharedMotion = useOrganisationDialogMotion();
  const activeOrigin = sharedMotion?.origin ?? null;
  const activeClosing = sharedMotion?.closing ?? false;
  const dialogRef = useRef<T>(null);
  const [entered, setEntered] = useState(false);

  useLayoutEffect(() => {
    if (!open) {
      setEntered(false);
      sharedMotion?.reset();
      return;
    }
    if (!activeOrigin) {
      setEntered(false);
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) return;

    const bounds = dialog.getBoundingClientRect();
    dialog.style.setProperty("--wf-dialog-origin-x", `${activeOrigin.x - bounds.left}px`);
    dialog.style.setProperty("--wf-dialog-origin-y", `${activeOrigin.y - bounds.top}px`);
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, [open, activeOrigin?.x, activeOrigin?.y, sharedMotion]);

  const enteredClass = entered ? " is-entered" : "";
  const closingClass = activeClosing ? " is-closing" : "";
  return {
    dialogRef,
    backdropMotionClassName: `${activeOrigin ? "wf-org-dialog-backdrop--origin-motion" : ""}${enteredClass}${closingClass}`,
    dialogMotionClassName: `${activeOrigin ? "wf-org-dialog--origin-motion" : ""}${enteredClass}${closingClass}`,
    backdropClassName: `wf-org-dialog-backdrop${activeOrigin ? " wf-org-dialog-backdrop--origin-motion" : ""}${enteredClass}${closingClass}`,
    dialogClassName: `wf-org-dialog${activeOrigin ? " wf-org-dialog--origin-motion" : ""}${enteredClass}${closingClass}`,
    closing: activeClosing,
  };
}
