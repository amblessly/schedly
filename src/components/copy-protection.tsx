"use client";

import { useEffect } from "react";

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    !!target.closest("input, textarea, [contenteditable='true']")
  );
}

/** Blocks copying site-wide: context menu, copy shortcut/event, and image drag. */
export function CopyProtection() {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    };
    const onCopy = (e: ClipboardEvent) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    };
    const onDragStart = (e: DragEvent) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("dragstart", onDragStart);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("dragstart", onDragStart);
    };
  }, []);

  return null;
}
