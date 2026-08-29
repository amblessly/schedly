"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { ExtractedClass } from "@/features/upload/hooks/use-upload";
import type { ValidationIssue } from "@/server/services/validation.service";
import { saveSchedule, type SaveScheduleResult } from "@/app/(dashboard)/classes/actions";
import { generateShortName } from "@/lib/abbreviations";
import { saveDesignState } from "@/features/upload/lib/design-state";
import { PALETTE } from "@/features/upload/lib/palette";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Trash2, Save, AlertCircle, ChevronDown, ChevronUp, AlertTriangle, XCircle, Paintbrush } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

type Props = {
  classes: ExtractedClass[];
  uploadId?: string;
  fileUrl?: string;
  designImageUrl?: string;
  confidence?: number;
  validationIssues?: ValidationIssue[];
  onUpdate: (index: number, updated: ExtractedClass) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  onSaved: (scheduleId: string) => void;
  onCancel: () => void;
};

export function ScheduleReview({
  classes, uploadId, designImageUrl, confidence, validationIssues = [], onUpdate, onRemove, onAdd, onSaved, onCancel,
}: Props) {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const isAdmin = Boolean((authUser as { isAdmin?: boolean } | null)?.isAdmin);
  const [title, setTitle] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleEditDesign = () => {
    if (!designImageUrl) return;
    const ok = saveDesignState({ classes, imageUrl: designImageUrl });
    if (!ok) {
      setSaveError("Could not open the design editor on this device.");
      return;
    }
    router.push("/design");
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setSaveError("Please enter a schedule title");
      return;
    }
    const validClasses = classes.filter((c) => c.subject.trim() && c.days.length > 0);
    if (validClasses.length === 0) {
      setSaveError("Please add at least one class with a subject and at least one day");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const result: SaveScheduleResult = await saveSchedule({
      title: title.trim(),
      semester: semester.trim() || null,
      academicYear: academicYear.trim() || null,
      classes: validClasses,
      uploadId,
    });

    setSaving(false);

    if (result.success) {
      onSaved(result.scheduleId);
    } else {
      setSaveError(result.error);
    }
  };

  const toggleDay = (classIndex: number, day: string) => {
    const cls = classes[classIndex]!;
    const newDays = cls.days.includes(day as ExtractedClass["days"][number])
      ? cls.days.filter((d) => d !== day)
      : [...cls.days, day as ExtractedClass["days"][number]];
    onUpdate(classIndex, { ...cls, days: newDays });
  };

  // Quick-entry: pressing Enter in any field commits the current class and
  // opens a fresh blank row so you can keep typing without hitting "Add Class".
  const handleClassSubmit = (e: React.FormEvent, index: number) => {
    e.preventDefault();
    const cls = classes[index];
    if (!cls || !cls.subject.trim()) return;
    onAdd();
    const nextIndex = classes.length;
    setExpandedIndex(nextIndex);
    setTimeout(() => document.getElementById(`subject-${nextIndex}`)?.focus(), 0);
  };

  const validCount = classes.filter((c) => c.subject.trim() && c.days.length > 0).length;

  // Group validation issues per class row so each card can flag its own conflicts.
  const issuesByIndex: Record<number, ValidationIssue[]> = {};
  for (const issue of validationIssues) {
    for (const idx of issue.classIndices) {
      (issuesByIndex[idx] ??= []).push(issue);
    }
  }
  const rowHasError = (i: number) => issuesByIndex[i]?.some((x) => x.severity === "error") ?? false;
  const rowHasWarning = (i: number) => (issuesByIndex[i]?.length ?? 0) > 0 && !rowHasError(i);

  return (
    <div className="space-y-4">
      {typeof confidence === "number" && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
          confidence >= 0.8 ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" :
          confidence >= 0.5 ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" :
          "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
        }`}>
          <span className="font-medium">Extraction Confidence: {Math.round(confidence * 100)}%</span>
          <span className="opacity-70">— Review and correct as needed</span>
        </div>
      )}

      {validationIssues.length > 0 && (
        <div className="space-y-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 dark:border-yellow-800 dark:bg-yellow-950">
          <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="h-4 w-4" />
            Validation {validationIssues.filter((i) => i.severity === "error").length > 0 ? "Issues" : "Warnings"}
            <span className="text-xs font-normal opacity-70">({validationIssues.length})</span>
          </div>
          <ul className="space-y-1">
            {validationIssues.map((issue, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-300">
                {issue.severity === "error" ? (
                  <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                )}
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <TextField
        id="schedule-title"
        label="Schedule Title *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <TextField
          id="semester"
          label="Semester"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
        />
        <TextField
          id="year"
          label="Academic Year"
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">
            Classes ({validCount}/{classes.length} valid)
          </h3>
          <div className="flex items-center gap-2">
            {isAdmin && designImageUrl && (
              <Button variant="outline" size="sm" onClick={handleEditDesign}>
                <Paintbrush className="mr-1 h-3 w-3" /> Edit Design
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onAdd}>
              <Plus className="mr-1 h-3 w-3" /> Add Class
            </Button>
          </div>
        </div>

        {classes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No classes extracted. Add one manually.
          </p>
        )}

        {classes.map((cls, i) => {
          const isExpanded = expandedIndex === i;
          const isValid = cls.subject.trim() && cls.days.length > 0;
          const accent = isValid ? PALETTE[i % PALETTE.length] : "#ef4444";
          const rowIssues = issuesByIndex[i] ?? [];
          const hasError = rowHasError(i);
          const hasWarning = rowHasWarning(i);
          return (
            <Card
              key={i}
              className={`overflow-hidden transition-colors ${
                !isValid ? "border-red-200 dark:border-red-800"
                : hasError ? "border-red-300 dark:border-red-700"
                : hasWarning ? "border-amber-300 dark:border-amber-700"
                : ""
              }`}
            >
              <CardHeader
                className="cursor-pointer px-4 py-3"
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-11 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: accent }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {!isValid && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />}
                      <p className="truncate text-sm font-semibold text-foreground">
                        {cls.subject || "Untitled Class"}
                      </p>
                      {rowIssues.length > 0 && (
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            hasError
                              ? "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                          }`}
                          title={rowIssues.map((x) => x.message).join("\n")}
                        >
                          {rowIssues.length} conflict{rowIssues.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {cls.code && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {cls.code}
                        </span>
                      )}
                      {cls.days.length > 0 && (
                        <div className="flex items-center gap-1">
                          {cls.days.map((d) => (
                            <span
                              key={d}
                              className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                            >
                              {DAY_LABELS[d]}
                            </span>
                          ))}
                        </div>
                      )}
                      {!cls.code && cls.days.length === 0 && (
                        <span className="text-[11px] text-muted-foreground">No code or days yet</span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="px-4 pb-4 pt-0">
                  <form className="space-y-3" onSubmit={(e) => handleClassSubmit(e, i)}>
                    {rowIssues.length > 0 && (
                      <div className="space-y-1 rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-2 dark:border-red-800 dark:bg-red-950/40">
                        {rowIssues.map((issue, k) => (
                          <p key={k} className="flex items-start gap-1.5 text-[11px] leading-snug text-red-700 dark:text-red-300">
                            {issue.severity === "error" ? (
                              <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                            ) : (
                              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                            )}
                            <span>{issue.message}</span>
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <TextField
                        id={`subject-${i}`}
                        label="Subject *"
                        value={cls.subject}
                        onChange={(e) => onUpdate(i, { ...cls, subject: e.target.value })}
                      />
                      <TextField
                        label="Course Code"
                        value={cls.code ?? ""}
                        onChange={(e) => onUpdate(i, { ...cls, code: e.target.value || null })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex gap-1.5">
                        <TextField
                          label="Short Name"
                          className="min-w-0 flex-1"
                          value={cls.shortName ?? ""}
                          onChange={(e) => onUpdate(i, { ...cls, shortName: e.target.value || null })}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="h-11 shrink-0"
                          title="Auto-generate"
                          onClick={() => onUpdate(i, { ...cls, shortName: generateShortName(cls.subject) || null })}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <TextField
                        label="Instructor"
                        value={cls.instructor ?? ""}
                        onChange={(e) => onUpdate(i, { ...cls, instructor: e.target.value || null })}
                      />
                      <TextField
                        label="Room"
                        value={cls.room ?? ""}
                        onChange={(e) => onUpdate(i, { ...cls, room: e.target.value || null })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <TextField
                        label="Section"
                        value={cls.section ?? ""}
                        onChange={(e) => onUpdate(i, { ...cls, section: e.target.value || null })}
                      />
                      <TextField
                        label="Block"
                        value={cls.block ?? ""}
                        onChange={(e) => onUpdate(i, { ...cls, block: e.target.value || null })}
                      />
                    </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      type="time"
                      label="Start Time *"
                      value={cls.startTime}
                      onChange={(e) => onUpdate(i, { ...cls, startTime: e.target.value })}
                    />
                    <TextField
                      type="time"
                      label="End Time *"
                      value={cls.endTime}
                      onChange={(e) => onUpdate(i, { ...cls, endTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Days *</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(i, day)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            cls.days.includes(day)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {DAY_LABELS[day]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className="text-destructive hover:text-destructive mt-1"
                    onClick={() => onRemove(i)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Remove
                  </Button>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <p className="text-[11px] text-muted-foreground">
                      Press Enter to add another class
                    </p>
                    <button type="submit" tabIndex={-1} aria-hidden="true" className="sr-only">Add</button>
                  </div>
                  </form>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {saveError && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" /> {saveError}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || classes.length === 0} className="flex-1">
          {saving ? (
            <><Spinner size={16} color="var(--primary-foreground)" /> Saving...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" /> Save Schedule</>
          )}
        </Button>
      </div>
    </div>
  );
}
