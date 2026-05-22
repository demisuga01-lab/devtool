import { redirect } from "next/navigation";
import { ToolHeader, ToolShell } from "@/components/tool-ui";

export default function DatabaseRunnerPage() {
  redirect("/tools/data-runner");

  return (
    <ToolShell>
      <ToolHeader
        breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Code Runners" }, { label: "Database Runner" }]}
        title="Database Runner"
        description="Redirecting to Data Runner."
      />
    </ToolShell>
  );
}
