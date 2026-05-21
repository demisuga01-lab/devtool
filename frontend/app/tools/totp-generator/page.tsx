"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { ToolShell } from "@/components/ToolShell";
import { Button, CopyButton, Input, Label, Select } from "@/components/ui";

type Algo = "SHA-1" | "SHA-256" | "SHA-512";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let out = "";
  bytes.forEach((byte) => { out += alphabet[byte % alphabet.length]; });
  return out;
}
function base32Decode(secret: string) {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of clean) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error("Secret must be Base32.");
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(bytes);
}
function counterBytes(counter: number) {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(4, counter, false);
  return buf;
}
async function hotp(secret: string, counter: number, digits: number, algorithm: Algo) {
  const key = await crypto.subtle.importKey("raw", base32Decode(secret), { name: "HMAC", hash: algorithm }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes(counter)));
  const offset = mac[mac.length - 1] & 0xf;
  const code = ((mac[offset] & 0x7f) << 24) | ((mac[offset + 1] & 0xff) << 16) | ((mac[offset + 2] & 0xff) << 8) | (mac[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, "0");
}

export default function TotpGeneratorPage() {
  const [secret, setSecret] = useState("JBSWY3DPEHPK3PXP");
  const [period, setPeriod] = useState(30);
  const [digits, setDigits] = useState(6);
  const [algorithm, setAlgorithm] = useState<Algo>("SHA-1");
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [codes, setCodes] = useState({ previous: "", current: "", next: "" });
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const counter = Math.floor(now / period);
  const remaining = period - (now % period);
  const uri = useMemo(() => `otpauth://totp/WellFriend:devtools?secret=${secret}&issuer=WellFriend&period=${period}&digits=${digits}&algorithm=${algorithm.replace("SHA-", "SHA")}`, [algorithm, digits, period, secret]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = {
          previous: await hotp(secret, counter - 1, digits, algorithm),
          current: await hotp(secret, counter, digits, algorithm),
          next: await hotp(secret, counter + 1, digits, algorithm),
        };
        if (!cancelled) {
          setCodes(next);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setCodes({ previous: "", current: "", next: "" });
          setError(err instanceof Error ? err.message : "Unable to generate TOTP.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [algorithm, counter, digits, secret]);
  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, uri, { width: 220, margin: 2 }).catch(() => undefined);
  }, [uri]);

  return (
    <ToolShell slug="totp-generator">
      <div className="space-y-5">
        <section className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Secret key</Label><div className="flex gap-2"><Input value={secret} onChange={(event) => setSecret(event.target.value)} className="font-mono" /><Button onClick={() => setSecret(randomSecret())}>Random</Button></div></div>
          <div><Label>Period</Label><Select value={period} onChange={(event) => setPeriod(Number(event.target.value))}><option value={30}>30s</option><option value={60}>60s</option></Select></div>
          <div><Label>Digits</Label><Select value={digits} onChange={(event) => setDigits(Number(event.target.value))}><option value={6}>6</option><option value={8}>8</option></Select></div>
          <div><Label>Algorithm</Label><Select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as Algo)}><option>SHA-1</option><option>SHA-256</option><option>SHA-512</option></Select></div>
        </section>
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
        <section className="grid gap-5 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:grid-cols-[1fr_240px]">
          <div>
            <p className="font-mono text-4xl font-bold tracking-widest text-zinc-900 dark:text-zinc-100">{codes.current || "------"}</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-full bg-emerald-600" style={{ width: `${(remaining / period) * 100}%` }} /></div>
            <p className="mt-2 text-sm text-zinc-500">{remaining}s remaining</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950"><Label>Previous</Label><p className="font-mono">{codes.previous}</p></div>
              <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950"><Label>Next</Label><p className="font-mono">{codes.next}</p></div>
            </div>
            <div className="mt-4"><CopyButton value={codes.current} /></div>
          </div>
          <div className="flex flex-col items-center justify-center"><canvas ref={canvasRef} className="rounded-xl bg-white p-2" /><p className="mt-2 text-xs text-zinc-500">Scan with an authenticator app</p></div>
        </section>
      </div>
    </ToolShell>
  );
}
