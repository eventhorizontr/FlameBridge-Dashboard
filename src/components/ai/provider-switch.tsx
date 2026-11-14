"use client";

import { Sparkles } from "lucide-react";

import { SegmentedControl, Skeleton, type SegmentedOption } from "@/components/ui";
import { useAssistant } from "@/lib/ai/client/use-assistant";
import type { AiProviderId } from "@/types/ai";

export function ProviderSwitch() {
  const { providers, provider, setProvider, busy } = useAssistant();

  if (!providers) {
    return <Skeleton className="h-7 w-36" />;
  }

  const options: SegmentedOption<AiProviderId>[] = providers.providers.map((info) => ({
    value: info.id,
    label: info.label,
    icon: <Sparkles className="size-3" aria-hidden="true" />,
    disabled: !info.available || busy,
    disabledReason: !info.available
      ? info.reason ?? `${info.label} key is not configured on this server.`
      : busy
        ? "Wait for the current response to finish before switching providers."
        : undefined,
  }));

  return (
    <SegmentedControl<AiProviderId>
      ariaLabel="AI provider"
      size="sm"
      value={provider}
      options={options}
      onChange={(next) => setProvider(next)}
    />
  );
}
