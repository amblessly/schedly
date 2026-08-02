"use client";

import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import type { ExtractedClass } from "@/features/upload/hooks/use-upload";
import { PALETTE } from "@/features/upload/lib/palette";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Download, Move, ImageIcon, ImagePlus, RotateCcw,
  Undo2, Redo2, Copy, BringToFront, SendToBack, Eraser, Type,
  Grid3x3, Palette, Plus, Trash2, Loader2, Sparkles,
  ChevronDown, ChevronUp,
} from "lucide-react";

const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

function formatTime(time: string): string {
  const parts = time.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

type DesignItem = {
  id: string;
  label: string;
  sub: string | null;
  color: string;
  x: number; // % from left
  y: number; // % from top
  scale: number;
  z: number;
};

type Tool = "text" | "classes" | "background" | "color";

type Props = {
  classes: ExtractedClass[];
  imageUrl?: string;
  onClose: () => void;
};

function RailButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-16 shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors md:w-full ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

export function ScheduleDesignEditor({ classes, imageUrl, onClose }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [bgDims, setBgDims] = useState<{ w: number; h: number } | null>(null);
  // Display size of the background canvas: scaled to fit the screen while
  // preserving the image's aspect ratio (the export uses the full size).
  const [bgSize, setBgSize] = useState<{ w: number; h: number } | null>(null);
  const [items, setItems] = useState<DesignItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  // Mobile: the tool panel can be collapsed/expanded with a floating button
  // without losing the active tool's state.
  const [panelHidden, setPanelHidden] = useState(false);
  const [undoStack, setUndoStack] = useState<DesignItem[][]>([]);
  const [redoStack, setRedoStack] = useState<DesignItem[][]>([]);
  const [textInput, setTextInput] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const dragState = useRef<{
    type: "move" | "resize";
    id: string;
    startX: number;
    startY: number;
    itemX: number;
    itemY: number;
    itemScale: number;
    startDist: number;
  } | null>(null);
  const zCounter = useRef(1);
  const dupCounter = useRef(1);
  const textCounter = useRef(1);

  const addedIds = new Set(items.map((i) => i.id));
  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  const commit = (updater: (prev: DesignItem[]) => DesignItem[]) => {
    setUndoStack((past) => [...past.slice(-49), items]);
    setRedoStack([]);
    setItems(updater);
  };

  const undo = () => {
    const past = undoStack;
    if (past.length === 0) return;
    const prev = past[past.length - 1]!;
    setUndoStack(past.slice(0, -1));
    setRedoStack((future) => [...future.slice(-49), items]);
    setItems(prev);
  };

  const redo = () => {
    const future = redoStack;
    if (future.length === 0) return;
    const next = future[future.length - 1]!;
    setRedoStack(future.slice(0, -1));
    setUndoStack((past) => [...past.slice(-49), items]);
    setItems(next);
  };

  const addItem = (classIndex: number) => {
    const cls = classes[classIndex]!;
    const stagger = (items.length % 6) * 9;
    const days = cls.days.length
      ? cls.days.map((d) => DAY_LABELS[d]).join(", ")
      : null;
    const time = cls.startTime
      ? `${formatTime(cls.startTime)} – ${formatTime(cls.endTime || cls.startTime)}`
      : null;
    commit((prev) => [
      ...prev,
      {
        id: String(classIndex),
        label: cls.shortName || cls.subject,
        sub: [days, time].filter(Boolean).join(" · ") || null,
        color: PALETTE[classIndex % PALETTE.length]!,
        x: 10 + stagger,
        y: 10 + stagger * 0.7,
        scale: 1,
        z: zCounter.current++,
      },
    ]);
    setSelectedId(String(classIndex));
    // Close the tool panel so the whole canvas is visible again and the
    // newly added item can be dragged anywhere (the panel would otherwise
    // cover the bottom of the canvas).
    setActiveTool(null);
  };

  const removeItem = (id: string) => {
    if (!items.some((i) => i.id === id)) return;
    commit((prev) => prev.filter((i) => i.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  };

  const duplicateItem = () => {
    const item = selectedItem;
    if (!item) return;
    const newId = `${item.id}-copy-${dupCounter.current++}`;
    commit((prev) => [
      ...prev,
      {
        ...item,
        id: newId,
        x: Math.min(92, item.x + 6),
        y: Math.min(92, item.y + 6),
        z: zCounter.current++,
      },
    ]);
    setSelectedId(newId);
  };

  const bringForward = () => {
    const item = selectedItem;
    if (!item) return;
    const sorted = [...items].sort((a, b) => a.z - b.z);
    const idx = sorted.findIndex((i) => i.id === item.id);
    const next = sorted[idx + 1];
    if (!next) return;
    commit((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, z: next.z }
          : i.id === next.id
            ? { ...i, z: item.z }
            : i
      )
    );
  };

  const sendBackward = () => {
    const item = selectedItem;
    if (!item) return;
    const sorted = [...items].sort((a, b) => a.z - b.z);
    const idx = sorted.findIndex((i) => i.id === item.id);
    const prev = sorted[idx - 1];
    if (!prev) return;
    commit((itemsPrev) =>
      itemsPrev.map((i) =>
        i.id === item.id
          ? { ...i, z: prev.z }
          : i.id === prev.id
            ? { ...i, z: item.z }
            : i
      )
    );
  };

  const clearAll = () => {
    if (items.length === 0) return;
    commit(() => []);
    setSelectedId(null);
  };

  const addTextItem = () => {
    const label = textInput.trim();
    if (!label) return;
    const id = `text-${textCounter.current++}`;
    commit((prev) => [
      ...prev,
      {
        id,
        label,
        sub: null,
        color: selectedItem?.color ?? PALETTE[0]!,
        x: 10,
        y: 10,
        scale: 1,
        z: zCounter.current++,
      },
    ]);
    setSelectedId(id);
    setTextInput("");
    setActiveTool(null);
  };

  const applyColor = (color: string) => {
    const item = selectedItem;
    if (!item || item.color === color) return;
    commit((prev) => prev.map((i) => (i.id === item.id ? { ...i, color } : i)));
  };

  // Fit the canvas on screen: at most ~768px wide and 70vh tall (leaving
  // room for the top bar and tool rail), keeping the image's ratio.
  const bgDimsRef = useRef<{ w: number; h: number } | null>(null);

  // The canvas is capped on both mobile and desktop so the uploaded image
  // never covers the whole page; very tall images still fit proportionally
  // and the canvas area remains scrollable as a fallback.
  const fitBg = () => {
    const dims = bgDimsRef.current;
    if (!dims) return;
    const isMd = window.matchMedia("(min-width: 768px)").matches;
    const maxW = isMd ? 768 : Math.max(200, window.innerWidth - 48);
    const maxH = Math.min(window.innerHeight * 0.7, Math.max(260, window.innerHeight - 160));
    const ratio = dims.w / dims.h;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    setBgSize({ w: Math.round(w), h: Math.round(h) });
  };

  useEffect(() => {
    window.addEventListener("resize", fitBg);
    return () => window.removeEventListener("resize", fitBg);
  }, []);

  const loadBgDims = (src: string) => {
    const img = new Image();
    img.onload = () => {
      const dims = { w: img.naturalWidth, h: img.naturalHeight };
      bgDimsRef.current = dims;
      setBgDims(dims);
      fitBg();
    };
    img.onerror = () => {
      bgDimsRef.current = null;
      setBgDims(null);
      setBgSize(null);
    };
    img.src = src;
  };

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setBackgroundUrl(url);
      loadBgDims(url);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePointerDown = (e: React.PointerEvent, id: string, type: "move" | "resize") => {
    e.preventDefault();
    e.stopPropagation();
    const item = items.find((i) => i.id === id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!item || !rect) return;
    setSelectedId(id);
    setUndoStack((past) => [...past.slice(-49), items]);
    setRedoStack([]);
    const centerX = rect.left + (rect.width * item.x) / 100;
    const centerY = rect.top + (rect.height * item.y) / 100;
    const dist = Math.max(1, Math.hypot(e.clientX - centerX, e.clientY - centerY));
    dragState.current = {
      type, id,
      startX: e.clientX,
      startY: e.clientY,
      itemX: item.x,
      itemY: item.y,
      itemScale: item.scale,
      startDist: dist,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragState.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (drag.type === "move") {
      const nx = Math.min(92, Math.max(0, drag.itemX + (dx / rect.width) * 100));
      const ny = Math.min(92, Math.max(0, drag.itemY + (dy / rect.height) * 100));
      setItems((prev) =>
        prev.map((i) => (i.id === drag.id ? { ...i, x: nx, y: ny } : i))
      );
    } else {
      const centerX = rect.left + (rect.width * drag.itemX) / 100;
      const centerY = rect.top + (rect.height * drag.itemY) / 100;
      const dist = Math.max(1, Math.hypot(e.clientX - centerX, e.clientY - centerY));
      const scale = Math.min(3, Math.max(0.4, (drag.itemScale * dist) / drag.startDist));
      setItems((prev) =>
        prev.map((i) => (i.id === drag.id ? { ...i, scale } : i))
      );
    }
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleExport = async () => {
    const el = canvasRef.current;
    if (!el) return;
    setExporting(true);
    setExportError(null);
    try {
      // Capture the canvas exactly as it is displayed so the download always
      // matches the edit, then scale the capture up to 4K (3840px on the
      // longest side) so the PNG is sharp enough to use as a wallpaper.
      // The items, text, and image scale together.
      const TARGET_LONG = 3840;
      const MAX_SCALE = 8;
      const longSide = Math.max(el.offsetWidth, el.offsetHeight);
      let scale: number;
      if (bgDims && bgSize) {
        // Start from the uploaded image's natural resolution, then bump the
        // scale up to 4K if the photo is smaller than 4K. Photos already
        // larger than 4K keep their full resolution (no downscaling).
        scale = bgDims.w / bgSize.w;
        const to4k = TARGET_LONG / Math.max(bgDims.w, bgDims.h);
        if (to4k > scale) scale = to4k;
      } else {
        scale = TARGET_LONG / longSide;
      }
      scale = Math.min(scale, MAX_SCALE);
      const canvas = await html2canvas(el, {
        scale,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `schedly-design-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Failed to export image");
    } finally {
      setExporting(false);
    }
  };

  const toggleTool = (tool: Tool) => {
    setActiveTool((prev) => (prev === tool ? null : tool));
    // A newly opened tool always shows its panel.
    setPanelHidden(false);
  };

  return (
    <div className="flex h-screen flex-col gap-3 p-3 md:grid md:h-auto md:grid-cols-[5rem_minmax(0,1fr)_15rem] md:grid-rows-[auto_1fr] md:gap-4 md:p-0">
      {/* Top bar — spans the full width on desktop */}
      <div className="flex shrink-0 items-center justify-between gap-2 md:col-span-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-foreground">Design Editor</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Create your own schedule design
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting || items.length === 0}
          className="shrink-0 px-2.5 sm:px-4"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
          ) : (
            <Download className="h-4 w-4 sm:mr-2" />
          )}
          <span className="hidden sm:inline">{exporting ? "Exporting…" : "Download PNG"}</span>
        </Button>
      </div>

      {/* Tool rail — pinned above the scrollable canvas on mobile, so the
          tools are always visible; left column on desktop */}
      <div className="flex shrink-0 gap-0.5 overflow-x-auto md:col-start-1 md:row-start-2 md:w-20 md:flex-col md:gap-1 md:overflow-visible">
        <RailButton icon={Undo2} label="Undo" onClick={undo} disabled={undoStack.length === 0} />
        <RailButton icon={Redo2} label="Redo" onClick={redo} disabled={redoStack.length === 0} />
        <div className="hidden h-px w-full bg-border md:block" />
        <RailButton icon={Grid3x3} label="Classes" onClick={() => toggleTool("classes")} active={activeTool === "classes"} />
        <RailButton icon={Type} label="Text" onClick={() => toggleTool("text")} active={activeTool === "text"} />
        <RailButton icon={ImageIcon} label="Background" onClick={() => toggleTool("background")} active={activeTool === "background"} />
        <RailButton icon={Palette} label="Color" onClick={() => toggleTool("color")} active={activeTool === "color"} />
        <div className="hidden h-px w-full bg-border md:block" />
        <RailButton icon={Copy} label="Duplicate" onClick={duplicateItem} disabled={!selectedItem} />
        <RailButton icon={BringToFront} label="Front" onClick={bringForward} disabled={!selectedItem} />
        <RailButton icon={SendToBack} label="Back" onClick={sendBackward} disabled={!selectedItem} />
        <RailButton icon={Eraser} label="Clear" onClick={clearAll} disabled={items.length === 0} />
      </div>

      {/* Scrollable canvas area — the canvas itself scrolls on mobile while
          the top bar and tool rail stay put */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden md:col-start-2 md:row-start-2 md:flex-none md:flex-row md:items-start md:justify-center md:overflow-visible">
        {/* Canvas — the background image is displayed scaled to fit the
            screen (ratio preserved) but is exported at full size */}
        <div
          ref={canvasRef}
          onPointerDown={() => setSelectedId(null)}
          className={`relative overflow-hidden rounded-xl border border-border bg-white ${
            bgDims && bgSize
              ? "mx-auto flex-none"
              : "min-h-0 flex-1 w-full md:mx-auto md:aspect-[4/3] md:max-h-[70vh] md:max-w-3xl"
          }`}
          style={bgDims && bgSize ? { width: `${bgSize.w}px`, height: `${bgSize.h}px` } : undefined}
        >
          {backgroundUrl && (
            <img
              src={backgroundUrl}
              alt="Schedule design background"
              className="absolute inset-0 h-full w-full object-contain"
              draggable={false}
            />
          )}

          {!backgroundUrl && items.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
              <Palette className="h-8 w-8 opacity-60" />
              <p className="text-sm">
                Your design is empty.
                <br />
                Add classes, text, or a photo background from the tools.
              </p>
            </div>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              onPointerDown={(e) => handlePointerDown(e, item.id, "move")}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`absolute cursor-move touch-none select-none rounded-lg px-3 py-1.5 ${
                item.color === "transparent"
                  ? "border border-black/10 text-slate-800"
                  : "text-white shadow-lg"
              }`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `scale(${item.scale})`,
                transformOrigin: "top left",
                backgroundColor: item.color,
                zIndex: item.z,
                outline: selectedId === item.id ? "2px dashed rgba(255,255,255,0.9)" : undefined,
                outlineOffset: 2,
              }}
            >
              <div className="text-sm font-semibold leading-tight">{item.label}</div>
              {item.sub && <div className="text-[10px] font-medium leading-tight opacity-90">{item.sub}</div>}
              {selectedId === item.id && (
                <>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => removeItem(item.id)}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
                    aria-label={`Remove ${item.label}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <div
                    onPointerDown={(e) => handlePointerDown(e, item.id, "resize")}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className="absolute -bottom-2 -right-2 flex h-5 w-5 cursor-nwse-resize touch-none items-center justify-center rounded-full bg-white text-slate-700 shadow"
                    aria-label="Resize"
                  >
                    <Move className="h-3 w-3" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Side panel — bottom sheet on mobile, right column on desktop */}
      {activeTool && !panelHidden && (
        <div className="fixed inset-x-0 bottom-0 z-20 max-h-[45dvh] w-full shrink-0 space-y-3 overflow-y-auto rounded-t-2xl border border-border border-b-0 bg-card p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:static md:inset-auto md:col-start-3 md:row-start-2 md:max-h-none md:w-60 md:self-start md:rounded-xl md:border-b md:shadow-none md:overflow-visible md:pb-3">
            {activeTool === "classes" && (
              <>
                <p className="text-xs font-medium text-muted-foreground">Your classes</p>
                <div className="flex flex-wrap gap-1.5">
                  {classes.map((cls, i) => {
                    const added = addedIds.has(String(i));
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={added}
                        onClick={() => addItem(i)}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          added
                            ? "cursor-default bg-muted text-muted-foreground/50 line-through"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                        }`}
                      >
                        <Plus className="h-3 w-3" />
                        {cls.shortName || cls.subject}
                      </button>
                    );
                  })}
                  {classes.length === 0 && (
                    <p className="text-xs text-muted-foreground">No classes to place yet.</p>
                  )}
                </div>
              </>
            )}

            {activeTool === "text" && (
              <>
                <p className="text-xs font-medium text-muted-foreground">Add text</p>
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTextItem();
                  }}
                  placeholder="Type your text"
                />
                <Button size="sm" className="w-full" onClick={addTextItem} disabled={!textInput.trim()}>
                  <Type className="mr-1 h-3 w-3" /> Add Text
                </Button>
              </>
            )}

            {activeTool === "background" && (
              <>
                <p className="text-xs font-medium text-muted-foreground">Background</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => bgInputRef.current?.click()}
                >
                  <ImagePlus className="mr-1 h-3 w-3" /> Upload photo
                </Button>
                {imageUrl && backgroundUrl !== imageUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setBackgroundUrl(imageUrl);
                      loadBgDims(imageUrl);
                    }}
                  >
                    <ImageIcon className="mr-1 h-3 w-3" /> Use schedule photo
                  </Button>
                )}
                {backgroundUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => {
                      setBackgroundUrl(null);
                      bgDimsRef.current = null;
                      setBgDims(null);
                      setBgSize(null);
                    }}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" /> Remove background
                  </Button>
                )}
              </>
            )}

            {activeTool === "color" && (
              <>
                <p className="text-xs font-medium text-muted-foreground">Item color</p>
                <div className="flex flex-wrap gap-2">
                  {PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => applyColor(color)}
                      aria-label={`Use color ${color}`}
                      className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                        selectedItem?.color === color
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                          : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => applyColor("transparent")}
                    aria-label="Use transparent color"
                    title="Transparent"
                    className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                      selectedItem?.color === "transparent"
                        ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                        : ""
                    }`}
                    style={{
                      background:
                        "conic-gradient(rgba(0,0,0,0.18) 25%, transparent 0 50%, rgba(0,0,0,0.18) 0 75%, transparent 0)",
                      backgroundSize: "12px 12px",
                      border: "1px solid var(--border)",
                    }}
                  />
                </div>
                {!selectedItem && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Select an item on the canvas to change its color.
                  </p>
                )}
              </>
            )}
          </div>
        )}

      <input
        ref={bgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBackgroundChange}
      />

      {/* Mobile: floating button to hide/show the tool panel */}
      {activeTool && (
        <button
          type="button"
          onClick={() => setPanelHidden((h) => !h)}
          className={`fixed right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all active:scale-95 md:hidden ${
            panelHidden ? "bottom-6" : "bottom-[calc(45dvh+0.75rem)]"
          }`}
          aria-label={panelHidden ? "Show panel" : "Hide panel"}
          style={{ marginBottom: "var(--sab, 0px)" }}
        >
          {panelHidden ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      )}

      {exportError && <p className="text-sm text-red-500">{exportError}</p>}
    </div>
  );
}
