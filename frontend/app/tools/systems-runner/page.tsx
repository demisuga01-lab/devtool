import { CodeRunnerPanel, CodeRunnerLanguage } from "@/components/CodeRunnerPanel";

const languages: CodeRunnerLanguage[] = [
  { label: "C", language: "c", version: "10.2.0", defaultCode: "#include <stdio.h>\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}" },
  { label: "C++", language: "c++", version: "10.2.0", defaultCode: "#include <iostream>\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}" },
  { label: "Rust", language: "rust", version: "1.68.2", defaultCode: "fn main() {\n    println!(\"Hello, World!\");\n}" },
  { label: "Go", language: "go", version: "1.16.2", defaultCode: "package main\nimport \"fmt\"\nfunc main() {\n    fmt.Println(\"Hello, World!\")\n}" },
];

export default function SystemsRunnerPage() {
  return (
    <CodeRunnerPanel
      title="Systems Runner"
      description="Compile and run C, C++, Rust, and Go code with full compiler output."
      languages={languages}
    />
  );
}
