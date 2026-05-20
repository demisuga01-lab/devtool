"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { ToolShell } from "@/components/ToolShell";
import { Button, Input, Label, Select } from "@/components/ui";
import { ERROR_MESSAGES, InlineError } from "@/lib/toolErrors";
import type { ToolError } from "@/lib/toolErrors";

export default function QrGeneratorPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [text, setText] = useState("https://devtools.wellfriend.online");
  const [size, setSize] = useState(256);
  const [level, setLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [margin, setMargin] = useState(4);
  const [dark, setDark] = useState("#000000");
  const [light, setLight] = useState("#ffffff");
  const [error, setError] = useState<ToolError | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!text.trim()) {
      setError(ERROR_MESSAGES.empty_input);
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    if (text.length > 2953) {
      setError({
        ...ERROR_MESSAGES.qr_too_long,
        detail: `Your input is ${text.length} characters. QR codes support up to 2,953 characters in binary mode.`,
        suggestion: "Shorten the text, or use a URL shortener for long URLs.",
      });
      return;
    }
    QRCode.toCanvas(canvas, text, { width: size, errorCorrectionLevel: level, margin, color: { dark, light } })
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError({
            title: "QR generation failed",
            detail: err instanceof Error ? err.message : "Could not generate the QR code.",
            suggestion: "Try removing special characters or shortening the input.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [text, size, level, margin, dark, light]);

  const download = () => {
    if (error || !text.trim()) return;
    const url = canvasRef.current?.toDataURL("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "qr-code.png";
    a.click();
  };

  return (
    <ToolShell slug="qr-generator">
      <div className="space-y-5">
        <div>
          <Label>Text or URL</Label>
          <Input value={text} onChange={(e) => setText(e.target.value)} />
          {error && <InlineError error={error} />}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div><Label>Size</Label><Select value={size} onChange={(e) => setSize(Number(e.target.value))}><option>128</option><option>256</option><option>512</option></Select></div>
          <div><Label>Error correction</Label><Select value={level} onChange={(e) => setLevel(e.target.value as "L" | "M" | "Q" | "H")}><option>L</option><option>M</option><option>Q</option><option>H</option></Select></div>
          <div><Label>Margin</Label><Input type="number" min={1} max={10} value={margin} onChange={(e) => setMargin(Number(e.target.value))} /></div>
          <div><Label>Dark color</Label><Input type="color" value={dark} onChange={(e) => setDark(e.target.value)} /></div>
          <div><Label>Light color</Label><Input type="color" value={light} onChange={(e) => setLight(e.target.value)} /></div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><canvas ref={canvasRef} className="mx-auto" /><Button className="mt-4" onClick={download} disabled={Boolean(error) || !text.trim()}>Download PNG</Button></div>
      </div>
    </ToolShell>
  );
}
