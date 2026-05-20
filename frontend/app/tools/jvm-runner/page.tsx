import { CodeRunnerPanel, CodeRunnerLanguage } from "@/components/CodeRunnerPanel";

const languages: CodeRunnerLanguage[] = [
  { label: "Java", language: "java", version: "15.0.2", defaultCode: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}" },
  { label: "Kotlin", language: "kotlin", version: "1.8.20", defaultCode: "fun main() {\n    println(\"Hello, World!\")\n}" },
  { label: "Scala", language: "scala", version: "3.2.2", defaultCode: "object Main extends App {\n  println(\"Hello, World!\")\n}" },
  { label: "C#", language: "csharp", version: "6.12.0", defaultCode: "using System;\nclass Program {\n    static void Main() {\n        Console.WriteLine(\"Hello, World!\");\n    }\n}" },
  { label: "Basic", language: "basic", version: "6.12.0", defaultCode: "MODULE Hello\n    SUB Main()\n        Console.WriteLine(\"Hello, World!\")\n    END SUB\nEND MODULE" },
];

export default function JvmRunnerPage() {
  return (
    <CodeRunnerPanel
      title="JVM Runner"
      description="Run Java, Kotlin, Scala, C#, and Basic on the JVM and Mono runtime."
      languages={languages}
    />
  );
}
