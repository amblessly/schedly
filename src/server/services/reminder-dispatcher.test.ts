import { describe, it, expect } from "vitest";
import { nextOccurrence, lastOccurrence } from "@/server/services/reminder-dispatcher.service";

function wallDate(y: number, mo: number, d: number, h: number, m: number): Date {
  return new Date(Date.UTC(y, mo - 1, d, h, m));
}

describe("nextOccurrence", () => {
  it("finds the next matching weekday after now", () => {
    // Monday 2026-08-03 09:00 UTC, class on monday+tuesday at 09:30.
    const now = new Date("2026-08-03T01:00:00Z");
    const start = wallDate(2026, 8, 3, 9, 30);
    const occ = nextOccurrence(start, ["monday", "tuesday"], "UTC", now);
    expect(occ).toBe(new Date("2026-08-03T09:30:00Z").getTime());
  });

  it("skips today when the class already started", () => {
    const now = new Date("2026-08-03T11:00:00Z");
    const start = wallDate(2026, 8, 3, 9, 30);
    const occ = nextOccurrence(start, ["monday"], "UTC", now);
    expect(occ).toBe(new Date("2026-08-10T09:30:00Z").getTime());
  });

  it("interprets stored time as wall clock in a non-UTC timezone", () => {
    // Stored 09:30 = 09:30 local in Asia/Manila = 01:30 UTC.
    const now = new Date("2026-08-03T01:00:00Z");
    const start = wallDate(2026, 8, 3, 9, 30);
    const occ = nextOccurrence(start, ["monday"], "Asia/Manila", now);
    expect(occ).toBe(new Date("2026-08-03T01:30:00Z").getTime());
  });

  it("handles DST shifts correctly", () => {
    // Wall clock 09:30 in America/New_York on the DST-change day.
    const now = new Date("2026-03-08T13:00:00Z");
    const start = wallDate(2026, 3, 8, 9, 30);
    const occ = nextOccurrence(start, ["sunday"], "America/New_York", now);
    // EDT (UTC-4) → 13:30 UTC.
    expect(occ).toBe(new Date("2026-03-08T13:30:00Z").getTime());
  });
});

describe("lastOccurrence", () => {
  it("returns today's occurrence when the class already started", () => {
    // Monday 2026-08-03, class at 09:30 already past at 11:00 UTC.
    const now = new Date("2026-08-03T11:00:00Z");
    const start = wallDate(2026, 8, 3, 9, 30);
    const occ = lastOccurrence(start, ["monday"], "UTC", now);
    expect(occ).toBe(new Date("2026-08-03T09:30:00Z").getTime());
  });

  it("falls back to the previous week when today doesn't match", () => {
    // Wednesday 2026-08-05, class is monday-only at 09:30.
    const now = new Date("2026-08-05T12:00:00Z");
    const start = wallDate(2026, 8, 3, 9, 30);
    const occ = lastOccurrence(start, ["monday"], "UTC", now);
    expect(occ).toBe(new Date("2026-08-03T09:30:00Z").getTime());
  });

  it("interprets stored time as wall clock in a non-UTC timezone", () => {
    // Stored 09:30 in Asia/Manila = 01:30 UTC; now is 02:00 UTC.
    const now = new Date("2026-08-03T02:00:00Z");
    const start = wallDate(2026, 8, 3, 9, 30);
    const occ = lastOccurrence(start, ["monday"], "Asia/Manila", now);
    expect(occ).toBe(new Date("2026-08-03T01:30:00Z").getTime());
  });

  it("returns null when no occurrence ever matches", () => {
    const now = new Date("2026-08-03T12:00:00Z");
    const start = wallDate(2026, 8, 3, 9, 30);
    const occ = lastOccurrence(start, [], "UTC", now);
    expect(occ).toBeNull();
  });
});
