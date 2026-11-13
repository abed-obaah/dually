// Renders children into the device-level modal layer (above pushed screens AND
// the floating tab bar). Falls back to inline rendering outside the Shell.
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function ModalPortal({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(() => document.getElementById('modal-root'));
  useEffect(() => { if (!el) setEl(document.getElementById('modal-root')); }, [el]);
  const content = <div className="pointer-events-auto absolute inset-0">{children}</div>;
  return el ? createPortal(content, el) : content;
}
