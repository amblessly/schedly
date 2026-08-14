"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ListTodo, CircleDot, CalendarDays, CheckCircle2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTodos } from "@/features/todo/use-todos";
import { AppNavPanel } from "@/components/app-nav-panel";
import { HeaderAvatar } from "@/components/header-avatar";
import { NotificationBell } from "@/components/notification-bell";

type FilterType = "all" | "active" | "completed";
type Priority = "low" | "medium" | "high";

const PRIORITY_DOTS: Record<Priority, string> = {
  low: "bg-green-400",
  medium: "bg-yellow-400",
  high: "bg-red-400",
};

function dueDateAsLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function dueDateLabel(dateStr: string): string {
  return dueDateAsLocal(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(dateStr: string): boolean {
  const end = dueDateAsLocal(dateStr);
  end.setHours(23, 59, 59);
  return end.getTime() < Date.now();
}

export default function TodoPage() {
  const { todos, addTodo, toggleTodo, deleteTodo, clearCompleted, editTodo } = useTodos();
  const [filter, setFilter] = useState<FilterType>("all");
  const [newText, setNewText] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("medium");
  const [editDueDate, setEditDueDate] = useState("");

  function handleAdd() {
    if (!newText.trim()) return;
    addTodo(newText, newPriority, newDueDate || undefined);
    setNewText("");
    setNewDueDate("");
  }

  function startEdit(id: string, text: string, priority: Priority, dueDate?: string) {
    setEditingId(id);
    setEditText(text);
    setEditPriority(priority);
    setEditDueDate(dueDate || "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return;
    await editTodo(id, editText, editPriority, editDueDate || undefined);
    setEditingId(null);
  }

  const filtered = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;
  const todoCount = todos.length;

  return (
    <div className="mx-auto w-full max-w-6xl pt-8 md:pt-0">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-x-3 gap-y-2 sm:mb-8">
        <div className="flex items-start gap-3">
          <HeaderAvatar />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              To-Do List
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep track of your assignments and tasks.
            </p>
          </div>
        </div>
        {todoCount > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <CircleDot className="h-3 w-3" />
              {activeCount} active
            </span>
            <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              {completedCount} done
            </span>
            <NotificationBell variant="inline" className="hidden md:flex" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <AppNavPanel />

        <div className="min-w-0 flex-1 mx-auto w-full max-w-3xl space-y-6 md:mx-0">
      {/* Add Task */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">
            Add a task
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="flex gap-2">
            <FloatingLabelInput
              label="New task"
              className="flex-1"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button
              onClick={handleAdd}
              disabled={!newText.trim()}
              className="h-11 px-4 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Priority
              </Label>
              <div className="flex gap-1.5">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewPriority(p)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                      newPriority === p
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border/50 bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOTS[p])} />
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="h-8 w-36 text-xs"
                aria-label="Due date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["all", "active", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        {completedCount > 0 && (
          <button
            onClick={clearCompleted}
            className="flex items-center gap-1 text-xs font-medium text-destructive transition-colors hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear done
          </button>
        )}
      </div>

      {/* Todo List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
          <ListTodo className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">
            {filter === "all"
              ? "No tasks yet"
              : filter === "active"
                ? "Nothing to do right now"
                : "No completed tasks yet"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {filter === "all"
              ? "Add your first task above to get started."
              : filter === "active"
                ? "All tasks are done — take a break!"
                : "Tasks will show up here once you check them off."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((todo) => {
            const overdue = todo.dueDate ? isOverdue(todo.dueDate) : false;
            const due = todo.dueDate ? dueDateLabel(todo.dueDate) : null;
            const isEditing = editingId === todo.id;
            return (
              <div
                key={todo.id}
                className={cn(
                  "group rounded-xl border bg-card px-4 py-3 transition-colors",
                  todo.completed
                    ? "border-border/40 opacity-60"
                    : overdue
                      ? "border-destructive/30"
                      : "border-border/60"
                )}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <FloatingLabelInput
                      label="Edit task"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(todo.id)}
                      autoFocus
                    />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium text-muted-foreground">Priority</Label>
                        <div className="flex gap-1.5">
                          {(["low", "medium", "high"] as const).map((p) => (
                            <button
                              key={p}
                              onClick={() => setEditPriority(p)}
                              className={cn(
                                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                                editPriority === p
                                  ? "border-primary/40 bg-primary/10 text-foreground"
                                  : "border-border/50 bg-card text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOTS[p])} />
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="h-8 w-36 text-xs"
                          aria-label="Due date"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-8 text-xs">
                        <X className="mr-1 h-3.5 w-3.5" /> Cancel
                      </Button>
                      <Button size="sm" onClick={() => saveEdit(todo.id)} className="h-8 text-xs">
                        <Check className="mr-1 h-3.5 w-3.5" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => toggleTodo(todo.id)}
                      aria-label={`Mark ${todo.text} as ${todo.completed ? "active" : "completed"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          todo.completed
                            ? "text-muted-foreground line-through"
                            : "text-foreground"
                        )}
                      >
                        {todo.text}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                          <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOTS[todo.priority])} />
                          {todo.priority}
                        </span>
                        {due && (
                          <span
                            className={cn(
                              "flex items-center gap-1 text-[11px] font-medium",
                              overdue && !todo.completed
                                ? "text-destructive"
                                : "text-muted-foreground"
                            )}
                          >
                            <CalendarDays className="h-3 w-3" />
                            {overdue && !todo.completed ? "Overdue · " : ""}
                            {due}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground/50 md:opacity-0 md:group-hover:opacity-100 hover:text-foreground"
                      onClick={() => startEdit(todo.id, todo.text, todo.priority, todo.dueDate)}
                      aria-label={`Edit ${todo.text}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground/50 md:opacity-0 md:group-hover:opacity-100 hover:text-destructive"
                      onClick={() => deleteTodo(todo.id)}
                      aria-label={`Delete ${todo.text}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}