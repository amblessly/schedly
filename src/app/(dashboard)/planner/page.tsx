"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getPlannerWeek,
  createPlannerEntry,
  updatePlannerEntry,
  togglePlannerEntry,
  deletePlannerEntry,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  BookOpenIcon,
  BriefcaseIcon,
  ListTodoIcon,
  HeartIcon,
} from "lucide-react";

type Entry = {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  type: string;
  color: string;
  completed: boolean;
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TYPE_OPTIONS = [
  { value: "task", label: "Task", icon: ListTodoIcon, color: "#3b82f6" },
  { value: "study", label: "Study", icon: BookOpenIcon, color: "#22c55e" },
  { value: "event", label: "Event", icon: BriefcaseIcon, color: "#f59e0b" },
  { value: "personal", label: "Personal", icon: HeartIcon, color: "#ec4899" },
];

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - ((day + 6) % 7);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PlannerPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [addDate, setAddDate] = useState("");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [type, setType] = useState("task");
  const [color, setColor] = useState("#3b82f6");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const load = useCallback(async () => {
    try {
      const data = await getPlannerWeek(weekStart);
      setEntries(data as Entry[]);
    } catch {
      toast.error("Failed to load planner");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  function prevWeek() {
    setWeekStart((d) => addDays(d, -7));
  }

  function nextWeek() {
    setWeekStart((d) => addDays(d, 7));
  }

  function openAdd(date: string) {
    setEditEntry(null);
    setAddDate(date);
    setTitle("");
    setStartTime("09:00");
    setEndTime("10:00");
    setType("task");
    setColor("#3b82f6");
    setShowAdd(true);
  }

  function openEdit(entry: Entry) {
    setEditEntry(entry);
    setAddDate(entry.date);
    setTitle(entry.title);
    setStartTime(entry.startTime || "");
    setEndTime(entry.endTime || "");
    setType(entry.type);
    setColor(entry.color);
    setShowAdd(true);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    if (editEntry) {
      const result = await updatePlannerEntry(editEntry.id, title, startTime, endTime, type, color);
      setSaving(false);
      if (result.success) {
        toast.success("Updated");
        setShowAdd(false);
        load();
      } else {
        toast.error(result.error);
      }
    } else {
      const result = await createPlannerEntry(title, addDate, startTime, endTime, type, color);
      setSaving(false);
      if (result.success) {
        toast.success("Added to planner");
        setShowAdd(false);
        load();
      } else {
        toast.error(result.error);
      }
    }
  }

  async function handleToggle(id: string) {
    await togglePlannerEntry(id);
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const result = await deletePlannerEntry(deleteId);
    if (result.success) {
      toast.success("Deleted");
      setDeleteId(null);
      load();
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 pt-8 pb-24 md:pt-0 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planner</h1>
          <p className="text-sm text-muted-foreground">
            {formatDisplayDate(weekStart)} — {formatDisplayDate(addDays(weekStart, 6))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={prevWeek}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(getMonday(new Date()))}
          >
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={nextWeek}>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {weekDates.map((date, i) => {
            const dayEntries = entries.filter((e) => e.date === date);
            const isToday = date === today;

            return (
              <Card
                key={date}
                className={isToday ? "border-primary/50 ring-1 ring-primary/20" : ""}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                        {DAY_NAMES[i]}
                      </p>
                      <p className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>
                        {new Date(date + "T00:00:00").getDate()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openAdd(date)}
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    {dayEntries.length === 0 ? (
                      <p className="text-xs text-muted-foreground/50 py-4 text-center">
                        No entries
                      </p>
                    ) : (
                      dayEntries.map((entry) => {
                        const typeInfo = TYPE_OPTIONS.find((t) => t.value === entry.type);
                        return (
                          <div
                            key={entry.id}
                            className={`group rounded-lg border p-2 text-xs transition-colors ${
                              entry.completed ? "opacity-50" : ""
                            }`}
                            style={{ borderLeftColor: entry.color, borderLeftWidth: 3 }}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium truncate ${entry.completed ? "line-through" : ""}`}>
                                  {entry.title}
                                </p>
                                {entry.startTime && (
                                  <p className="text-muted-foreground mt-0.5">
                                    {entry.startTime}
                                    {entry.endTime ? ` – ${entry.endTime}` : ""}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleToggle(entry.id)}
                                  className="rounded p-0.5 hover:bg-accent"
                                >
                                  <CheckIcon className={`h-3 w-3 ${entry.completed ? "text-green-500" : "text-muted-foreground"}`} />
                                </button>
                                <button
                                  onClick={() => openEdit(entry)}
                                  className="rounded p-0.5 hover:bg-accent"
                                >
                                  <EditIcon className="h-3 w-3 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={() => setDeleteId(entry.id)}
                                  className="rounded p-0.5 hover:bg-accent"
                                >
                                  <TrashIcon className="h-3 w-3 text-destructive" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editEntry ? "Edit Entry" : "Add to Planner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FloatingLabelInput
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <FloatingLabelInput
                label="Start time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <FloatingLabelInput
                label="End time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Type</p>
              <div className="flex gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setType(opt.value); setColor(opt.color); }}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      type === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    <opt.icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={!title.trim() || saving}>
              {saving ? <Spinner size={16} className="mr-2" /> : null}
              {editEntry ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This planner entry will be permanently deleted.
          </p>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
