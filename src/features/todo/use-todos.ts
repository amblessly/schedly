"use client";

import { useCallback, useSyncExternalStore } from "react";

export type TodoItem = {
  id: string;
  text: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  dueDate?: string;
  createdAt: number;
  completedAt?: number;
};

const STORAGE_KEY = "schedly-todos";

const listeners = new Set<() => void>();
let loaded = false;
let cached: TodoItem[] = [];
const EMPTY_TODOS: TodoItem[] = [];

function readStorage(): TodoItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): TodoItem[] {
  if (typeof window === "undefined") return EMPTY_TODOS;
  if (!loaded) {
    cached = readStorage();
    loaded = true;
  }
  return cached;
}

function getServerSnapshot(): TodoItem[] {
  return EMPTY_TODOS;
}

function persist(next: TodoItem[]) {
  cached = next;
  loaded = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage full or unavailable — keep state in memory
  }
  listeners.forEach((l) => l());
}

export function useTodos() {
  const todos = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addTodo = useCallback(
    (text: string, priority: TodoItem["priority"], dueDate?: string) => {
      const todo: TodoItem = {
        id: crypto.randomUUID(),
        text: text.trim(),
        completed: false,
        priority,
        dueDate: dueDate || undefined,
        createdAt: Date.now(),
      };
      persist([todo, ...cached]);
    },
    []
  );

  const toggleTodo = useCallback((id: string) => {
    persist(
      cached.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? Date.now() : undefined,
            }
          : t
      )
    );
  }, []);

  const deleteTodo = useCallback((id: string) => {
    persist(cached.filter((t) => t.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    persist(cached.filter((t) => !t.completed));
  }, []);

  return { todos, addTodo, toggleTodo, deleteTodo, clearCompleted };
}

export function isToday(ts: number): boolean {
  const d = new Date(ts);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
