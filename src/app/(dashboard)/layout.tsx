import type { ReactNode } from "react";

import { AppShell } from "@/components/layout";
import { runDirectory } from "@/components/layout/run-directory-server";

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return <AppShell runs={runDirectory()}>{children}</AppShell>;
}
