import { CodeRunnerPanel, CodeRunnerLanguage } from "@/components/CodeRunnerPanel";

const languages: CodeRunnerLanguage[] = [
  { label: "SQLite", language: "sqlite3", version: "3.36.0", defaultCode: "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER);\nINSERT INTO users VALUES (1, 'Alice', 30);\nINSERT INTO users VALUES (2, 'Bob', 25);\nSELECT * FROM users;" },
  { label: "Julia", language: "julia", version: "1.8.5", defaultCode: "println(\"Hello, World!\")\n\n# Julia is great for data analysis\nx = [1, 2, 3, 4, 5]\nprintln(\"Sum: \", sum(x))\nprintln(\"Mean: \", sum(x)/length(x))" },
];

export default function DataRunnerPage() {
  return (
    <CodeRunnerPanel
      title="Data Runner"
      description="Run SQLite queries and Julia scripts for data analysis."
      languages={languages}
    />
  );
}
