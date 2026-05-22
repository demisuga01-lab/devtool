"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, ResultCard, ToolInput, Label, ToolSelect } from "@/components/tool-ui";
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
  const qrInfo = useMemo(() => {
    if (!text.trim() || text.length > 2953) return null;
    try {
      const qr = QRCode.create(text, { errorCorrectionLevel: level });
      return { version: qr.version, modules: qr.modules.size, type: detectQrType(text) };
    } catch {
      return null;
    }
  }, [text, level]);

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

  const downloadSvg = async () => {
    if (error || !text.trim()) return;
    const svg = await QRCode.toString(text, { type: "svg", errorCorrectionLevel: level, margin, color: { dark, light } });
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "qr-code.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Reference & Utils" }, { label: "QR Code Generator" }]} title="QR Code Generator" description="Generate QR codes for any text or URL." />
      <div className="space-y-5">
        <div>
          <Label>Text or URL</Label>
          <ToolInput value={text} onChange={(e) => setText(e.target.value)} />
          {error && <InlineError error={error} />}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div><Label>Size</Label><ToolSelect value={size} onChange={(e) => setSize(Number(e.target.value))}><option>128</option><option>256</option><option>512</option></ToolSelect></div>
          <div><Label>Error correction</Label><ToolSelect value={level} onChange={(e) => setLevel(e.target.value as "L" | "M" | "Q" | "H")}><option>L</option><option>M</option><option>Q</option><option>H</option></ToolSelect></div>
          <div><Label>Margin</Label><ToolInput type="number" min={1} max={10} value={margin} onChange={(e) => setMargin(Number(e.target.value))} /></div>
          <div><Label>Dark color</Label><ToolInput type="color" value={dark} onChange={(e) => setDark(e.target.value)} /></div>
          <div><Label>Light color</Label><ToolInput type="color" value={light} onChange={(e) => setLight(e.target.value)} /></div>
        </div>
        {qrInfo && (
          <div className="grid gap-3 md:grid-cols-4">
            <ResultCard label="QR Version" value={String(qrInfo.version)} />
            <ResultCard label="Modules" value={`${qrInfo.modules} x ${qrInfo.modules}`} />
            <ResultCard label="Correction" value={level} />
            <ResultCard label="Detected Type" value={qrInfo.type} />
          </div>
        )}
        <Panel noPadding className="p-5 text-center">
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {qrInfo && <Badge variant="info">{qrInfo.type}</Badge>}
            {level === "H" && <Badge variant="success">high damage recovery</Badge>}
          </div>
          <canvas ref={canvasRef} className="mx-auto" />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={download} disabled={Boolean(error) || !text.trim()}>Download PNG</Button>
            <Button onClick={() => void downloadSvg()} disabled={Boolean(error) || !text.trim()}>Download SVG</Button>
          </div>
        </Panel>
      </div>
    </ToolShell>
  );
}

function detectQrType(value: string) {
  if (/^https?:\/\//i.test(value)) return "URL";
  if (/^WIFI:/i.test(value)) return "WiFi";
  if (/^BEGIN:VCARD/i.test(value)) return "vCard";
  if (/^mailto:/i.test(value)) return "Email";
  return "Plain text";
}
