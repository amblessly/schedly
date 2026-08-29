"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { FloatingLabelTextarea } from "@/components/ui/floating-label-textarea";
import { cn } from "@/lib/utils";

export type ReportErrorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Short label of what failed (e.g. "Schedule upload", "Profile photo upload"). */
  context: string;
  /** The error message shown to the user — pre-fills the report body. */
  errorMessage: string;
  /** Optional page path the user was on when the error happened. */
  page?: string;
  /** Optional extra detail (stack, request id, response code, etc.) — prepended to the body. */
  extraDetail?: string;
};

const REPORT_TYPES = [
  { value: "bug", label: "Bug" },
  { value: "feedback", label: "Feedback" },
] as const;

type ReportType = (typeof REPORT_TYPES)[number]["value"];

export function ReportErrorDialog({
  open,
  onOpenChange,
  context,
  errorMessage,
  page,
  extraDetail,
}: ReportErrorProps) {
  const [type, setType] = useState<ReportType>("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function buildDefaultBody() {
    const parts: string[] = [];
    parts.push(`Where it happened: ${context}`);
    if (page) parts.push(`Page: ${page}`);
    if (typeof window !== "undefined") {
      parts.push(`Browser: ${navigator.userAgent}`);
    }
    parts.push("");
    parts.push("What I saw:");
    parts.push(errorMessage);
    if (extraDetail) {
      parts.push("");
      parts.push("Details:");
      parts.push(extraDetail);
    }
    parts.push("");
    parts.push("Steps to reproduce (optional):");
    parts.push("1. ");
    return parts.join("\n");
  }

  // When opening, seed the message with the structured bug report.
  // We only auto-fill if the user hasn't already typed something.
  function handleOpenChange(next: boolean) {
    if (next && !message) {
      setMessage(buildDefaultBody());
    }
    if (next) {
      setSent(false);
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSend() {
    if (sending) return;
    if (!message.trim()) {
      setError("Please describe what happened before sending.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          subject: subject.trim() || `Error report: ${context}`,
          message: message.trim(),
          page: page ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      setSent(true);
      toast.success("Report sent — admin will review it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the report.");
    } finally {
      setSending(false);
    }
  }

  function handleClose() {
    if (sending) return;
    setSubject("");
    setMessage("");
    setType("bug");
    setSent(false);
    setError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Flag className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle>Send report to admin</DialogTitle>
              <DialogDescription>
                We&apos;ll send the details of what went wrong so we can fix it.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M5 12.5l4 4 10-10" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">Report sent!</p>
            <p className="text-xs text-muted-foreground">
              You can find it in the Admin Dashboard under Feedback.
            </p>
            <Button onClick={handleClose} className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="text-xs font-medium text-foreground">Type</span>
              <div className="mt-1 flex gap-1">
                {REPORT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={cn(
                      "h-9 flex-1 rounded-lg border text-xs font-medium transition-colors",
                      type === t.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <TextField
              label="Subject (optional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary"
              maxLength={200}
              disabled={sending}
            />
            <FloatingLabelTextarea
              label="What happened?"
              inputClassName="min-h-[160px] resize-y"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={5000}
              disabled={sending}
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Your user ID, browser info, and the error details above are included automatically.
              The admin team will see this report in the Admin Dashboard → Feedback tab.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSend}
                disabled={sending || !message.trim()}
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Flag className="mr-1.5 h-4 w-4" />
                    Send report
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Small inline button that pairs an error message with a one-click "Report" action.
 *  Drop this next to any red-line error to give users a single tap to file a bug. */
export function ReportErrorButton({
  context,
  errorMessage,
  page,
  extraDetail,
  className,
}: Omit<ReportErrorProps, "open" | "onOpenChange"> & { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium text-destructive underline-offset-2 hover:underline",
          className,
        )}
      >
        <Flag className="h-3 w-3" />
        Send report
      </button>
      <ReportErrorDialog
        open={open}
        onOpenChange={setOpen}
        context={context}
        errorMessage={errorMessage}
        page={page}
        extraDetail={extraDetail}
      />
    </>
  );
}
