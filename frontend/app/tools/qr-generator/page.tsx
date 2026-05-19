"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { ToolShell } from "@/components/ToolShell";
import { Button, Input, Label, Select } from "@/components/ui";

export default function QrGeneratorPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [text, setText] = useState("https://devtools.wellfriend.online");
  const [size, setSize] = useState(256); const [level, setLevel] = useState<"L" | "M" | "Q" | "H">("M"); const [margin, setMargin] = useState(4); const [dark, setDark] = useState("#000000"); const [light, setLight] = useState("#ffffff");
  useEffect(() => { if (canvasRef.current && text) QRCode.toCanvas(canvasRef.current, text, { width: size, errorCorrectionLevel: level, margin, color: { dark, light } }); }, [text, size, level, margin, dark, light]);
  const download = () => { const url = canvasRef.current?.toDataURL("image/png"); if (!url) return; const a = document.createElement("a"); a.href = url; a.download = "qr-code.png"; a.click(); };
  return <ToolShell slug="qr-generator"><div className="space-y-5"><div><Label>Text or URL</Label><Input value={text} onChange={(e) => setText(e.target.value)} /></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><div><Label>Size</Label><Select value={size} onChange={(e) => setSize(Number(e.target.value))}><option>128</option><option>256</option><option>512</option></Select></div><div><Label>Error correction</Label><Select value={level} onChange={(e) => setLevel(e.target.value as any)}><option>L</option><option>M</option><option>Q</option><option>H</option></Select></div><div><Label>Margin</Label><Input type="number" min={1} max={10} value={margin} onChange={(e) => setMargin(Number(e.target.value))} /></div><div><Label>Dark color</Label><Input type="color" value={dark} onChange={(e) => setDark(e.target.value)} /></div><div><Label>Light color</Label><Input type="color" value={light} onChange={(e) => setLight(e.target.value)} /></div></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><canvas ref={canvasRef} className="mx-auto" /><Button className="mt-4" onClick={download}>Download PNG</Button></div></div></ToolShell>;
}
