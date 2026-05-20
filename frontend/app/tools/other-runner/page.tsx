import { CodeRunnerPanel, CodeRunnerLanguage } from "@/components/CodeRunnerPanel";

const languages: CodeRunnerLanguage[] = [
  { label: "Swift", language: "swift", version: "5.3.3", defaultCode: "print(\"Hello, World!\")" },
  { label: "Dart", language: "dart", version: "3.0.1", defaultCode: "void main() {\n  print('Hello, World!');\n}" },
  { label: "Fortran", language: "fortran", version: "10.2.0", defaultCode: "program hello\n  print *, 'Hello, World!'\nend program hello" },
  { label: "D", language: "d", version: "10.2.0", defaultCode: "import std.stdio;\nvoid main() {\n    writeln(\"Hello, World!\");\n}" },
];

export default function OtherRunnerPage() {
  return (
    <CodeRunnerPanel
      title="Other Languages"
      description="Run Swift, Dart, Fortran, and D code."
      languages={languages}
    />
  );
}
