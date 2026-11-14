import type { ReactNode } from "react";

import { AppShell } from "@/components/layout";

export default function LearnGroupLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
