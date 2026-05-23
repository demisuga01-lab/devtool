"use client";

import { useState } from "react";
import { AlignLeft, ArrowLeftRight, CheckCircle, FileText } from "lucide-react";
import { NewToolPage } from "../_components/new-tool-pages";
import { WorkspaceShell, type WorkspaceTab } from "../_components/workspace-ui";

type Tab = "format" | "validate" | "convert";

const tabs: WorkspaceTab<Tab>[] = [
  { id: "format", label: "Format", icon: AlignLeft },
  { id: "validate", label: "Validate", icon: CheckCircle },
  { id: "convert", label: "Convert", icon: ArrowLeftRight },
];

export default function TomlWorkspacePage() {
  const [active, setActive] = useState<Tab>("format");

  return (
    <WorkspaceShell
      title="TOML Tools"
      subtitle="Format, validate, and convert TOML configuration files"
      href="/tools/toml"
      icon={FileText}
      activeTab={active}
      tabs={tabs}
      onTabChange={setActive}
      visitIcon="toml"
      intentGroup="inspect"
    >
      {active === "format" && <NewToolPage slug="toml-formatter" embedded />}
      {active === "validate" && <NewToolPage slug="toml-validator" embedded />}
      {active === "convert" && <NewToolPage slug="toml-to-json" embedded />}
    </WorkspaceShell>
  );
}
