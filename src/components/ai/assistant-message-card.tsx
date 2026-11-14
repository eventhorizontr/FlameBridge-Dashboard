"use client";

import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Sparkles, Square, Undo2, Wrench } from "lucide-react";
import { Fragment } from "react";

import { Badge, Button, cn, EvidenceChip } from "@/components/ui";
import type { AssistantMessage } from "@/lib/ai/client/assistant-store";
import type { AiProviderId, AiProviderInfo, Evidence } from "@/types/ai";

import { parseMessageSegments } from "./citation-parser";

function InlineFormattedLine({
  text,
  evidence,
}: {
  text: string;
  evidence: readonly Evidence[];
}) {
  // Split inline code, bold & italic spans before parsing [B1] evidence citations.
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|(?<![*\w])\*[^*\s][^*]*\*(?![*\w]))/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
          return (
            <code
              key={i}
              className="num rounded bg-[var(--surface-3)] px-1 py-0.5 text-[0.8em] text-[var(--flame-core)]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
          return (
            <strong key={i} className="font-semibold text-[var(--text-1)]">
              {parseMessageSegments(part.slice(2, -2), evidence).map((seg, j) =>
                seg.kind === "evidence" ? (
                  <EvidenceChip
                    key={j}
                    id={seg.evidence.id}
                    label={seg.evidence.label}
                    kind={seg.evidence.kind}
                    href={seg.evidence.href}
                    className="mx-0.5"
                  />
                ) : (
                  <Fragment key={j}>{seg.text}</Fragment>
                ),
              )}
            </strong>
          );
        }
        if (part.length >= 3 && part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
          return (
            <em key={i} className="text-[var(--text-2)]">
              {parseMessageSegments(part.slice(1, -1), evidence).map((seg, j) =>
                seg.kind === "evidence" ? (
                  <EvidenceChip key={j} id={seg.evidence.id} label={seg.evidence.label} kind={seg.evidence.kind} href={seg.evidence.href} className="mx-0.5" />
                ) : (
                  <Fragment key={j}>{seg.text}</Fragment>
                ),
              )}
            </em>
          );
        }
        return (
          <Fragment key={i}>
            {parseMessageSegments(part, evidence).map((seg, j) =>
              seg.kind === "evidence" ? (
                <EvidenceChip
                  key={j}
                  id={seg.evidence.id}
                  label={seg.evidence.label}
                  kind={seg.evidence.kind}
                  href={seg.evidence.href}
                  className="mx-0.5"
                />
              ) : (
                <Fragment key={j}>{seg.text}</Fragment>
              ),
            )}
          </Fragment>
        );
      })}
    </>
  );
}

const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_RULE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

/** Split a block into runs of table rows vs. other lines (models often glue a table to a sentence). */
export function splitTables(block: string): { kind: "table" | "text"; lines: string[] }[] {
  const out: { kind: "table" | "text"; lines: string[] }[] = [];
  for (const line of block.split("\n")) {
    const kind = TABLE_ROW.test(line) ? "table" : "text";
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.lines.push(line);
    else out.push({ kind, lines: [line] });
  }
  return out.map((seg) => (seg.kind === "table" && seg.lines.length < 2 ? { kind: "text", lines: seg.lines } : seg));
}

function MarkdownTable({ lines, evidence }: { lines: string[]; evidence: readonly Evidence[] }) {
  const hasHead = TABLE_RULE.test(lines[1] ?? "");
  const rows = lines.filter((l) => !TABLE_RULE.test(l)).map(cells);
  const head = hasHead ? rows[0] : null;
  const body = hasHead ? rows.slice(1) : rows;
  return (
    <div className="max-w-full overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--line)]">
      <table className="w-full border-collapse text-left text-[0.8125rem]">
        {head && (
          <thead className="bg-[var(--surface-2)] text-[var(--text-2)]">
            <tr>
              {head.map((c, i) => (
                <th key={i} scope="col" className="px-2.5 py-1.5 font-medium whitespace-nowrap">
                  <InlineFormattedLine text={c} evidence={evidence} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {body.map((r, ri) => (
            <tr key={ri} className="border-t border-[var(--line)]">
              {r.map((c, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "px-2.5 py-1.5 align-top",
                    ci === 0 ? "text-[var(--text-2)]" : "text-[var(--text-1)]",
                    /^[-+−–~≈<>≤≥]?\s*\d[\d\s.,%–\-/×]*(\s*(%|cm\/s|mm|ppm|s))?$/.test(c) && "num",
                  )}
                >
                  <InlineFormattedLine text={c} evidence={evidence} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarkdownMessage({ content, evidence }: { content: string; evidence: readonly Evidence[] }) {
  type Entry = { kind: "table"; lines: string[] } | { kind: "text"; text: string };
  const blocks: Entry[] = content.split(/\n{2,}/).flatMap((block) =>
    splitTables(block).map(
      (seg): Entry => (seg.kind === "table" ? { kind: "table", lines: seg.lines } : { kind: "text", text: seg.lines.join("\n") }),
    ),
  );
  return (
    <div className="space-y-2 text-[0.875rem] leading-relaxed text-[var(--text-1)]">
      {blocks.map((entry, bIdx) => {
        if (entry.kind === "table") return <MarkdownTable key={bIdx} lines={entry.lines} evidence={evidence} />;
        const block = entry.text;
        const heading = /^(#{1,4})\s+(.+)$/.exec(block.trim());
        if (heading && !block.trim().includes("\n")) {
          return (
            <h3 key={bIdx} className="pt-1 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-2)]">
              <InlineFormattedLine text={heading[2]} evidence={evidence} />
            </h3>
          );
        }
        const lines = block.split("\n");
        const isBulletList = lines.every((l) => /^\s*[-*•]\s+/.test(l));
        const isOrderedList = lines.every((l) => /^\s*\d+\.\s+/.test(l));

        if (isBulletList) {
          return (
            <ul key={bIdx} className="list-disc pl-5 space-y-1 text-[var(--text-2)]">
              {lines.map((line, lIdx) => (
                <li key={lIdx}>
                  <InlineFormattedLine text={line.replace(/^\s*[-*•]\s+/, "")} evidence={evidence} />
                </li>
              ))}
            </ul>
          );
        }

        if (isOrderedList) {
          return (
            <ol key={bIdx} className="list-decimal pl-5 space-y-1 text-[var(--text-2)]">
              {lines.map((line, lIdx) => (
                <li key={lIdx}>
                  <InlineFormattedLine text={line.replace(/^\s*\d+\.\s+/, "")} evidence={evidence} />
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={bIdx} className="text-[var(--text-1)] whitespace-pre-wrap break-words">
            {lines.map((line, lIdx) => (
              <Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                <InlineFormattedLine text={line} evidence={evidence} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function AssistantMessageCard({
  message,
  availableProviders,
  onUndoTurn,
  onUndoStep,
  onSwitchProvider,
}: {
  message: AssistantMessage;
  availableProviders: readonly AiProviderInfo[];
  onUndoTurn: (messageId: string) => void;
  onUndoStep: (logEntryId: string) => void;
  onSwitchProvider: (provider: AiProviderId) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-[var(--radius-md)] bg-[var(--accent-soft)] border border-[var(--accent)]/35 px-3.5 py-2.5 text-[0.875rem] text-[var(--text-1)] leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  const hasUndoableTurn = message.steps.some((st) => st.logEntryIds.length > 0);
  const otherAvailableProvider = availableProviders.find(
    (p) => p.available && p.id !== message.provider,
  );
  const canSuggestProviderSwitch =
    message.status === "error" &&
    (message.error?.code === "rate_limited" || message.error?.code === "upstream_error") &&
    Boolean(otherAvailableProvider);

  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-1)] p-3.5 space-y-3">
      {/* Header: model badge + turn undo / status */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
          <span className="num text-[0.6875rem] rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 text-[var(--text-2)]">
            {message.model ?? (message.provider ? message.provider : "Assistant")}
          </span>
          {message.status === "streaming" && (
            <span className="inline-flex items-center gap-1 text-[0.6875rem] text-[var(--accent)]">
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              <span>Reasoning</span>
            </span>
          )}
          {message.status === "stopped" && (
            <Badge variant="neutral" icon={<Square className="size-2.5" aria-hidden="true" />}>
              Stopped
            </Badge>
          )}
        </div>

        {hasUndoableTurn && (
          <Button size="sm" variant="ghost" onClick={() => onUndoTurn(message.id)}>
            <Undo2 className="size-3" aria-hidden="true" />
            <span>Undo turn</span>
          </Button>
        )}
      </div>

      {/* Tool & Dashboard Action Timeline */}
      {message.steps.length > 0 && (
        <ol className="space-y-1.5 border-l border-[var(--line-strong)] pl-3">
          {message.steps.map((step) => (
            <li key={step.callId} className="flex items-start justify-between gap-2 text-[0.75rem]">
              <div className="flex items-start gap-1.5 min-w-0">
                {step.status === "running" && (
                  <Loader2 className="size-3.5 text-[var(--accent)] animate-spin mt-0.5 shrink-0" aria-hidden="true" />
                )}
                {step.status === "ok" && (
                  <CheckCircle2 className="size-3.5 text-[var(--good)] mt-0.5 shrink-0" aria-hidden="true" />
                )}
                {step.status === "error" && (
                  <AlertCircle className="size-3.5 text-[var(--warning)] mt-0.5 shrink-0" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <span className="num text-[var(--text-2)] inline-flex items-center gap-1">
                    <Wrench className="size-2.5 text-[var(--text-3)]" aria-hidden="true" />
                    {step.tool}
                  </span>
                  {step.summary && (
                    <p className="text-[var(--text-1)] leading-snug break-words">{step.summary}</p>
                  )}
                </div>
              </div>

              {step.logEntryIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => onUndoStep(step.logEntryIds[0])}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[var(--line)]",
                    "bg-[var(--surface-2)] text-[0.6875rem] text-[var(--text-2)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 cursor-pointer",
                  )}
                >
                  <Undo2 className="size-2.5" aria-hidden="true" />
                  <span>Undo</span>
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      {/* Markdown response with verified inline [TestId] evidence chips */}
      {message.content ? (
        <MarkdownMessage content={message.content} evidence={message.evidence} />
      ) : message.status === "streaming" ? (
        <p className="text-[0.8125rem] text-[var(--text-3)]">Inspecting NASA PSI-25 records…</p>
      ) : null}

      {/* Error surface + provider fallback */}
      {message.status === "error" && message.error && (
        <div className="rounded-[var(--radius-sm)] border border-[var(--warning)]/45 bg-[var(--warning)]/10 p-3 space-y-2">
          <div className="flex items-start gap-2 text-[0.8125rem] text-[var(--text-1)]">
            <AlertCircle className="size-4 text-[var(--warning)] shrink-0 mt-0.5" aria-hidden="true" />
            <span>{message.error.message}</span>
          </div>
          {canSuggestProviderSwitch && otherAvailableProvider && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onSwitchProvider(otherAvailableProvider.id)}
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              <span>Switch to {otherAvailableProvider.label}</span>
            </Button>
          )}
        </div>
      )}

      {/* Evidence chip strip */}
      {message.evidence.length > 0 && (
        <div className="pt-2 border-t border-[var(--line)] flex flex-wrap items-center gap-1.5">
          <span className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)] mr-1">
            Sources
          </span>
          {message.evidence.map((ev) => (
            <EvidenceChip
              key={ev.id}
              id={ev.id}
              label={ev.label}
              kind={ev.kind}
              href={ev.href}
            />
          ))}
        </div>
      )}
    </article>
  );
}
