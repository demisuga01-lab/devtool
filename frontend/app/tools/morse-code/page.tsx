"use client";

import { useMemo, useState } from "react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { CopyButton, Label, ToolTextarea, TabBar } from "@/components/tool-ui";

const morse: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--", "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...", ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-", "\"": ".-..-.", "$": "...-..-", "@": ".--.-.",
};
const reverse = Object.fromEntries(Object.entries(morse).map(([k, v]) => [v, k]));

export default function MorseCodePage() {
  const [mode, setMode] = useState("encode");
  const [input, setInput] = useState("SOS from WellFriend");
  const output = useMemo(() => {
    if (mode === "encode") {
      return input.toUpperCase().split(/\s+/).map((word) => word.split("").map((char) => morse[char] || "").filter(Boolean).join(" ")).join(" / ");
    }
    return input.split(" / ").map((word) => word.trim().split(/\s+/).map((code) => reverse[code] || "").join("")).join(" ");
  }, [input, mode]);

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Reference & Utils" }, { label: "Morse Code" }]} title="Morse Code" description="Convert text to Morse code and back." />
      <div className="space-y-5">
        <TabBar active={mode} onChange={setMode} tabs={[{ label: "Text to Morse", value: "encode" }, { label: "Morse to Text", value: "decode" }]} />
        <div><Label>Input</Label><ToolTextarea value={input} onChange={(event) => setInput(event.target.value)} rows={8} /></div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>Output</Label><CopyButton value={output} /></div>
          <ToolTextarea value={output} readOnly rows={6} />
        </div>
        <Panel noPadding className="grid gap-2 p-4 sm:grid-cols-3 md:grid-cols-6">
          {Object.entries(morse).map(([char, code]) => (
            <div key={char} className="flex justify-between rounded-xl bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-950">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{char}</span>
              <span className="font-mono text-zinc-500">{code}</span>
            </div>
          ))}
        </Panel>
      </div>
    </ToolShell>
  );
}
