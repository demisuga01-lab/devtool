import { CodeRunnerPanel, CodeRunnerLanguage } from "@/components/CodeRunnerPanel";

const languages: CodeRunnerLanguage[] = [
  { label: "Python", language: "python", version: "3.12.0", defaultCode: "print(\"Hello, World!\")" },
  { label: "Ruby", language: "ruby", version: "3.0.1", defaultCode: "puts \"Hello, World!\"" },
  { label: "PHP", language: "php", version: "8.2.3", defaultCode: "<?php\necho \"Hello, World!\\n\";" },
  { label: "Perl", language: "perl", version: "5.36.0", defaultCode: "print \"Hello, World!\\n\";" },
  { label: "Bash", language: "bash", version: "5.2.0", defaultCode: "echo \"Hello, World!\"" },
  { label: "Lua", language: "lua", version: "5.4.4", defaultCode: "print(\"Hello, World!\")" },
];

export default function ScriptingRunnerPage() {
  return (
    <CodeRunnerPanel
      title="Scripting Runner"
      description="Run Python, Ruby, PHP, Perl, Bash, and Lua scripts instantly."
      languages={languages}
    />
  );
}
