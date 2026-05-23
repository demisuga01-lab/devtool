"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";

type Language = {
  id: number | string;
  name: string;
  version: string;
  categories: string[];
  icon: JSX.Element;
};

const categories = [
  { value: "all", label: "All" },
  { value: "popular", label: "Popular" },
  { value: "web", label: "Web" },
  { value: "systems", label: "Systems" },
  { value: "jvm", label: "JVM" },
  { value: "scripting", label: "Scripting" },
  { value: "functional", label: "Functional" },
  { value: "data", label: "Data" },
  { value: "database", label: "Database" },
  { value: "lowlevel", label: "Low-level" },
];

const icons = {
  python: <svg viewBox="0 0 48 48" className="h-10 w-10"><path d="M24 3.5c-5.8 0-10.5 1.2-10.5 4.5v3h10.5v1.5H10c-3 0-5.5 2.3-5.5 7s2.5 7 5.5 7h2v-3.5c0-3.3 2.8-5.5 6-5.5h10c2.8 0 5-2 5-5V8c0-2.8-2.5-4.5-9-4.5zm-3 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" fill="#3776AB"/><path d="M24 44.5c5.8 0 10.5-1.2 10.5-4.5v-3H24v-1.5H38c3 0 5.5-2.3 5.5-7s-2.5-7-5.5-7h-2v3.5c0 3.3-2.8 5.5-6 5.5H20c-2.8 0-5 2-5 5v7c0 2.8 2.5 4.5 9 4.5zm3-3a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="#FFD43B"/></svg>,
  ruby: <svg viewBox="0 0 48 48" className="h-10 w-10"><path d="M38 10l2 28-28 2-8-6 6-28 28 4z" fill="#CC342D"/><path d="M16 14l16 2-2 16-14-6 0-12z" fill="#FF6060"/><path d="M32 16l4 20-20 2 16-22z" fill="#CC342D"/><path d="M16 26l14-12-12 20-2-8z" fill="#FF6060"/></svg>,
  php: <svg viewBox="0 0 48 48" className="h-10 w-10"><ellipse cx="24" cy="24" rx="20" ry="12" fill="#8892BF"/><path d="M14 20h3l1 4h3l-1-4h3l-1 8h-3l.5-2H17l-.5 2h-3l1-8zm12 0h5c2 0 3 1 3 3 0 3-2 5-5 5h-2l-.5 2h-3l2-10zm3 2h-1.5l-.7 4h1.5c1.3 0 2-1 2-2.5 0-.9-.4-1.5-1.3-1.5z" fill="white"/></svg>,
  perl: <svg viewBox="0 0 48 48" className="h-10 w-10"><circle cx="24" cy="24" r="20" fill="#39457E"/><path d="M14 20c0-5.5 4.5-10 10-10 4 0 7.5 2.3 9.2 5.7" stroke="white" strokeWidth="3" fill="none"/><path d="M24 38c-7.7 0-14-6.3-14-14 0-2.3.6-4.5 1.6-6.4" stroke="white" strokeWidth="3" fill="none"/><circle cx="24" cy="24" r="4" fill="white"/></svg>,
  bash: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#1D1D1D"/><path d="M14 20l6 4-6 4v-8zm8 7h12" stroke="#4EAA25" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>,
  lua: <svg viewBox="0 0 48 48" className="h-10 w-10"><circle cx="24" cy="24" r="20" fill="#000080"/><circle cx="24" cy="24" r="12" fill="white"/><circle cx="30" cy="18" r="5" fill="#000080"/></svg>,
  c: <svg viewBox="0 0 48 48" className="h-10 w-10"><circle cx="24" cy="24" r="20" fill="#5C6BC0"/><path d="M30 29.5c-1.3 1.3-3 2-5 2-4.1 0-7.5-3.4-7.5-7.5S20.9 16.5 25 16.5c2 0 3.7.8 5 2l-2 2c-.8-.8-1.8-1.3-3-1.3-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5c1.2 0 2.2-.5 3-1.3l2 1.6z" fill="white"/></svg>,
  cpp: <svg viewBox="0 0 48 48" className="h-10 w-10"><circle cx="24" cy="24" r="20" fill="#00599C"/><path d="M22 29.5c-1.3 1.3-3 2-5 2-4.1 0-7.5-3.4-7.5-7.5S12.9 16.5 17 16.5c2 0 3.7.8 5 2l-2 2c-.8-.8-1.8-1.3-3-1.3-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5c1.2 0 2.2-.5 3-1.3l2 1.6zM31 22v-3h-2v3h-3v2h3v3h2v-3h3v-2h-3z" fill="white"/></svg>,
  rust: <svg viewBox="0 0 48 48" className="h-10 w-10"><circle cx="24" cy="24" r="20" fill="#CE422B"/><path d="M24 8l1.5 2.5h-3L24 8zm0 32l-1.5-2.5h3L24 40zm16-16l-2.5 1.5v-3L40 24zM8 24l2.5-1.5v3L8 24z" fill="white"/><circle cx="24" cy="24" r="8" fill="none" stroke="white" strokeWidth="2"/><path d="M20 22h8M20 26h8" stroke="white" strokeWidth="2"/></svg>,
  go: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#00ACD7"/><path d="M8 20.5c-.2 0-.2-.1-.1-.2l.7-.9c.1-.1.3-.2.5-.2h13.5c.2 0 .2.1.1.3l-.5.8c-.1.1-.3.2-.5.2H8zM5 23c-.2 0-.2-.1-.1-.2l.7-.9c.1-.1.3-.2.5-.2H22c.2 0 .3.1.2.3l-.3.7c-.1.2-.3.3-.5.3H5zM11 25.5c-.2 0-.2-.1-.1-.3l.5-.8c.1-.1.3-.2.5-.2h7c.2 0 .3.1.3.3l-.1.7c0 .2-.2.3-.4.3H11z" fill="white"/><path d="M36 16v2h-4v2h4v2h-6v-8h6v2zm-12 6c0 1.7-1.3 3-3 3h-3v-8h3c1.7 0 3 1.3 3 3zm-4 1h1c.6 0 1-.4 1-1v-2c0-.6-.4-1-1-1h-1v4z" fill="white"/></svg>,
  java: <svg viewBox="0 0 48 48" className="h-10 w-10"><path d="M18.5 35.5s-1.5.9.9 1.2c2.7.3 4.1.3 7-.1 0 0 .8.5 1.9 1-6.7 2.9-15.2-.2-9.8-2.1zm-.9-4s-1.7 1.3 1 1.5c3.3.3 5.9.3 10.4-.4 0 0 .5.5 1.4.9-9.2 2.7-19.5.2-12.8-2z" fill="#5382A1"/><path d="M24.5 20c1.9 2.1-.5 4-.5 4s4.7-2.4 2.5-5.4c-2-2.8-3.5-4.2 4.7-9 0 0-12.9 3.2-6.7 10.4z" fill="#E76F00"/><path d="M32.5 38.5s1.1.9-1.2 1.6c-4.3 1.3-18 1.7-21.8.1-1.4-.6 1.2-1.5 2-1.6.8-.2 1.3-.2 1.3-.2-1.5-1-9.7 2.1-4.2 3 15.1 2.5 27.5-1.1 23.9-2.9zm-13.5-11.5s-6.8 1.6-2.4 2.2c1.9.3 5.6.2 9.1-.1 2.8-.3 5.7-.9 5.7-.9s-1 .4-1.7.9c-7 1.9-20.5 1-16.6-.8 3.3-1.6 5.9-1.3 5.9-1.3zm12.4 6.9c7.1-3.7 3.8-7.2 1.5-6.7-.6.1-.8.3-.8.3s.2-.3.6-.5c4.6-1.6 8.1 4.8-1.5 7.3 0-.1.1-.2.2-.4z" fill="#5382A1"/><path d="M27 4s3.9 3.9-3.7 9.9c-6.1 4.8-1.4 7.6 0 10.7-3.6-3.2-6.2-6.1-4.4-8.7 2.5-3.8 9.6-5.6 8.1-11.9z" fill="#E76F00"/></svg>,
  kotlin: <svg viewBox="0 0 48 48" className="h-10 w-10"><defs><linearGradient id="kg-compilers" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#E44857"/><stop offset="50%" stopColor="#C711E1"/><stop offset="100%" stopColor="#7F52FF"/></linearGradient></defs><rect width="48" height="48" rx="4" fill="url(#kg-compilers)"/><path d="M6 6h18L6 24V6zM6 42L24 24l18 18H6z" fill="white"/></svg>,
  scala: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#DC322F"/><path d="M12 18h24c0 3-24 3-24 6s24 3 24 6H12c0-3 24-3 24-6s-24-3-24-6zm0-6h24c0 2-24 2-24 4s24 2 24 4H12c0-2 24-2 24-4s-24-2-24-4z" fill="white" opacity="0.9"/></svg>,
  csharp: <svg viewBox="0 0 48 48" className="h-10 w-10"><circle cx="24" cy="24" r="20" fill="#9B4F96"/><path d="M20 29.5c-1.3 1.3-3 2-5 2-4.1 0-7.5-3.4-7.5-7.5S10.9 16.5 15 16.5c2 0 3.7.8 5 2l-2 2c-.8-.8-1.8-1.3-3-1.3-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5c1.2 0 2.2-.5 3-1.3l2 1.6zM29 19h-6v2h2v8h2v-8h2v-2zM33 19h-2v3h-2v2h2v3h2v-3h2v-2h-2v-3z" fill="white"/></svg>,
  basic: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#512BD4"/><path d="M12 14h8c3 0 5 1.5 5 4 0 1.5-.8 2.8-2 3.5 1.5.7 2.5 2 2.5 3.8 0 2.8-2.2 4.7-5.5 4.7H12V14zm4 6.5h3c1 0 1.8-.7 1.8-1.8S20 17 19 17h-3v3.5zm0 7h3.5c1.2 0 2-.8 2-2s-.8-2-2-2H16V27.5zm16-13.5l-6 12h3l1-2.5h5l1 2.5h3l-6-12h-1zm.5 7l1.5-4 1.5 4H32.5z" fill="white"/></svg>,
  swift: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="10" fill="#F05138"/><path d="M35 27c-2.5 4.5-7.5 7-12.5 6C16 32 11 27 11 21c0 4 2 8 6 10 3 1.5 6.5 1.5 9.5 0C30 29 33 26 35 23c0 0 2 2 0 4z" fill="white"/><path d="M35 18c0-4-3-8-8-10 3 3 4 6 3 9-1 2-3 4-5 5 3-1 7-2 10-4z" fill="white" opacity="0.8"/></svg>,
  dart: <svg viewBox="0 0 48 48" className="h-10 w-10"><path d="M12 6l-6 6v20l6 6 20-2 8-8V14L34 6H12z" fill="#00B4AB"/><path d="M14 14l14-2 8 8-2 14-14 2-8-8 2-14z" fill="#00D2FF"/><path d="M22 18v12l6-6-6-6z" fill="white"/></svg>,
  fortran: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#734F96"/><path d="M12 12h24v5H17v5h15v5H17v9h-5V12z" fill="white"/></svg>,
  d: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#B03931"/><path d="M12 12h10c8 0 14 5 14 12s-6 12-14 12H12V12zm5 5v14h5c5 0 9-3 9-7s-4-7-9-7h-5z" fill="white"/></svg>,
  sqlite: <svg viewBox="0 0 48 48" className="h-10 w-10"><path d="M36 4c-6 0-12 8-12 20s6 20 12 20c2 0 4-1 4-3V7c0-2-2-3-4-3z" fill="#0F80CC"/><path d="M24 24c0-12-6-20-12-20C8 4 6 5 6 7v34c0 2 2 3 4 3 6 0 14-8 14-20z" fill="#003B57"/></svg>,
  julia: <svg viewBox="0 0 48 48" className="h-10 w-10"><circle cx="16" cy="32" r="8" fill="#CB3C33"/><circle cx="32" cy="32" r="8" fill="#389826"/><circle cx="24" cy="18" r="8" fill="#9558B2"/></svg>,
  assembly: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#6E4C13"/><path d="M10 36l6-24h4l4 16 4-16h4l6 24h-4l-4-16-4 16h-4l-4-16-4 16h-4z" fill="#F8C518"/></svg>,
  haskell: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#5D4F85"/><path d="M6 36l10-12L6 12h6l10 12-10 12H6zm12 0l10-12L18 12h6l10 12-10 12h-6zm14-5h10v-4H32l4-4h-4l-4 4 4 4z" fill="white"/></svg>,
  elixir: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#6E4A7E"/><path d="M24 8c0 0-12 10-12 20 0 7 5 12 12 12s12-5 12-12C36 18 24 8 24 8zm0 26c-3.3 0-6-2.7-6-6 0-5 6-13 6-13s6 8 6 13c0 3.3-2.7 6-6 6z" fill="white"/></svg>,
  erlang: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#A90533"/><path d="M10 24c0-7 5-13 12-14.5v3c-5 1.5-8 6-8 11.5h-4zm28 0c0 7-5 13-12 14.5v-3c5-1.5 8-6 8-11.5h4zm-16 4h12v3H22v-3zm0-5h8v3h-8v-3z" fill="white"/></svg>,
  ocaml: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#EC6813"/><path d="M12 24c0-6.6 5.4-12 12-12 4 0 7.5 2 9.7 5H28c-1.5-1.9-3.8-3-6-3-4.4 0-8 3.6-8 8s3.6 8 8 8c2.2 0 4.5-1 6-3h5.7C31.5 30 28 32 24 32c-6.6 0-12-5.4-12-8z" fill="white"/></svg>,
  clojure: <svg viewBox="0 0 48 48" className="h-10 w-10"><circle cx="24" cy="24" r="20" fill="#63B132"/><circle cx="24" cy="24" r="12" fill="none" stroke="white" strokeWidth="3"/><circle cx="24" cy="24" r="4" fill="white"/></svg>,
  groovy: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#4298B8"/><path d="M24 10c-8 0-14 6-14 14s6 14 14 14 14-6 14-14S32 10 24 10zm0 22c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" fill="white"/><circle cx="24" cy="24" r="4" fill="white"/></svg>,
  cobol: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#005A9C"/><path d="M26 15c-6 0-10 4-10 9s4 9 10 9c3 0 5.5-1.2 7.2-3.2l-2.7-2.1C29.4 29 27.8 30 26 30c-3.3 0-6-2.7-6-6s2.7-6 6-6c1.8 0 3.4 1 4.5 2.3l2.7-2.1C31.5 16.2 29 15 26 15z" fill="white"/></svg>,
  commonlisp: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#5D4F85"/><path d="M15 35c5-6 7-14 7-23h5c0 9 2 17 7 23h-5c-2.1-2.8-3.5-6-4.5-9.5C23.5 29 22.1 32.2 20 35h-5z" fill="white"/><path d="M12 16c0-3 2-5 5-5h3v4h-2c-1 0-1.5.5-1.5 1.5S17 18 18 18h2v4h-3c-3 0-5-2-5-5v-1zm24 0c0-3-2-5-5-5h-3v4h2c1 0 1.5.5 1.5 1.5S31 18 30 18h-2v4h3c3 0 5-2 5-5v-1z" fill="white" opacity="0.85"/></svg>,
  javascript: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#F7DF1E"/><path d="M13 36.5l3.2-1.9c.6 1.1 1.2 2 2.5 2 1.3 0 2-.5 2-2.5V22h4v12.2c0 4.1-2.4 6-5.9 6-3.2 0-5-1.7-5.8-3.7zM28 36l3.2-1.9c.8 1.4 1.9 2.4 3.8 2.4 1.6 0 2.6-.8 2.6-1.9 0-1.3-.9-1.8-3.1-2.6l-1.1-.5c-3.1-1.3-5.1-3-5.1-6.5 0-3.2 2.5-5.7 6.3-5.7 2.7 0 4.7 1 6.1 3.4l-3.1 2c-.7-1.3-1.5-1.8-2.9-1.8-1.4 0-2.2.9-2.2 2 0 1.4.9 1.9 2.9 2.7l1.1.5c3.6 1.5 5.6 3.1 5.6 6.7 0 3.8-3 6-7 6-3.9 0-6.4-1.9-7.1-4.8z" fill="#000"/></svg>,
  typescript: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#3178C6"/><path d="M22 22h-8v3h5v13h3V22zM26 31.5c.5 1 1.5 1.8 3 1.8 1.3 0 2-.6 2-1.5 0-.9-.6-1.4-2.2-2l-.8-.3c-2.3-.9-3.5-2.2-3.5-4.2 0-2.5 2-4.3 5-4.3 2.2 0 3.8.8 4.8 2.5l-2.3 1.5c-.5-.9-1.1-1.4-2.4-1.4-1.1 0-1.8.6-1.8 1.4 0 .9.6 1.3 2 1.9l.8.3c2.7 1.1 4 2.4 4 4.5 0 2.7-2.1 4.5-5.4 4.5-2.8 0-4.8-1.4-5.7-3.5l2.5-1.2z" fill="white"/></svg>,
  html: <svg viewBox="0 0 48 48" className="h-10 w-10"><path d="M8 6l3 34 13 4 13-4 3-34H8z" fill="#E44D26"/><path d="M24 41.5V9H38.5L36 38l-12 3.5z" fill="#F16529"/><path d="M24 21h-7l-.5-5H24v-5H12l1.5 15H24v-5zm0 8h-5.5l-.5-5H24v5h-0.5l-4-.5-.3-3H15l.5 7 8.5 2.5V29z" fill="#EBEBEB"/><path d="M24 21h6.5l-.5 5H24v5h5.5l-.5 5-5 1.5V37l4-.5.3-3H24v-5h7.5l.5-15H24v5z" fill="white"/></svg>,
  css: <svg viewBox="0 0 48 48" className="h-10 w-10"><path d="M8 6l3 34 13 4 13-4 3-34H8z" fill="#1572B6"/><path d="M24 41.5V9H38.5L36 38l-12 3.5z" fill="#33A9DC"/><path d="M24 22.5H17l.5 5H24v-5zm0-8H16.5l.5 5H24v-5zm0 16l-4.5-1.3-.3-3.5H15l.5 7.5 8.5 2.3V30.5zm0 0h5l-.5 4.5-4.5 1.3V30.5zm0-8h5.5l-.5-5H24v5zm1-8h5l-.5-5H24v5z" fill="white"/></svg>,
  r: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#276DC3"/><path d="M14 12h12c4 0 8 2 8 7 0 3.5-2 6-5 7l6 10h-5l-5.5-9.5H19V36h-5V12zm5 5v9.5h6c2.5 0 4-1.5 4-4.5 0-3-1.5-5-4-5h-6z" fill="white"/></svg>,
  pascal: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#0070C5"/><path d="M12 12h14c4 0 8 2.5 8 7.5S30 27 26 27H17v9h-5V12zm5 5v10h7c2 0 4-1.5 4-5s-2-5-4-5h-7z" fill="white"/></svg>,
  prolog: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#E61B23"/><path d="M14 12h8c4 0 8 2 8 7 0 3-1.5 5.5-4 6.5L32 36h-5l-5-10h-3v10h-5V12zm5 4v8h3c2 0 3.5-1.5 3.5-4S24 16 22 16h-3z" fill="white"/></svg>,
  mysql: <svg viewBox="0 0 48 48" className="h-10 w-10"><path d="M40 30c-2 0-3.5.5-4.5 1.5L29 25c.1-.3.1-.6.1-1 0-3.3-2.7-6-6-6-1.3 0-2.5.4-3.5 1.1L14 13.5c0-.2 0-.4 0-.5 0-2.2-1.8-4-4-4S6 10.8 6 13s1.8 4 4 4c.9 0 1.8-.3 2.4-.8l5.5 5.5C17.3 22.7 17 23.8 17 25c0 3.3 2.7 6 6 6 1.3 0 2.5-.4 3.4-1.1l6.5 6.6c-.1.3-.1.6-.1.9 0 2.2 1.8 4 4 4 2.2 0 4-1.8 4-4S42.2 30 40 30z" fill="#4479A1"/></svg>,
  postgresql: <svg viewBox="0 0 48 48" className="h-10 w-10"><path d="M36 8c-4.4 0-8 1.8-10.5 4.5C23 10.5 19.5 9 16 9 9.4 9 4 14.4 4 21c0 4.8 2.8 9 7 11v7h4v-5.5c1.3.3 2.6.5 4 .5h.5l-.5 5h4l.5-5.5c1-.2 2-.5 2.9-.9L31 34h4l-4-4.5c3-2.5 5-6.5 5-11.5V16h4V8h-4z" fill="#336791"/><circle cx="24" cy="16" r="4" fill="white"/><circle cx="24" cy="16" r="2" fill="#336791"/></svg>,
  mongodb: <svg viewBox="0 0 48 48" className="h-10 w-10"><path d="M24 4C24 4 14 16 14 26c0 5.5 4.5 10 10 10s10-4.5 10-10C34 16 24 4 24 4z" fill="#13AA52"/><path d="M24 38v6" stroke="#B8C4BA" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  octave: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#0790C0"/><path d="M24 10c-7.7 0-14 6.3-14 14s6.3 14 14 14 14-6.3 14-14S31.7 10 24 10zm0 22c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" fill="white"/></svg>,
  fsharp: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#378BBA"/><path d="M12 24l12-12 12 12-12 12-12-12zm12-6l-6 6 6 6 6-6-6-6z" fill="white"/></svg>,
  objc: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#438EFF"/><path d="M24 12c-6.6 0-12 5.4-12 12s5.4 12 12 12c3.5 0 6.6-1.5 8.8-3.8l-3-2.6C28.4 31.1 26.3 32 24 32c-4.4 0-8-3.6-8-8s3.6-8 8-8c2.3 0 4.4.9 5.8 2.4l3-2.6C30.6 13.5 27.5 12 24 12z" fill="white"/><path d="M32 19h4v10h-4z" fill="white"/><path d="M30 23h8v4h-8z" fill="white"/></svg>,
  rscript: <svg viewBox="0 0 48 48" className="h-10 w-10"><rect width="48" height="48" rx="4" fill="#276DC3"/><path d="M14 12h12c4 0 8 2 8 7 0 3.5-2 6-5 7l6 10h-5l-5.5-9.5H19V36h-5V12zm5 5v9.5h6c2.5 0 4-1.5 4-4.5 0-3-1.5-5-4-5h-6z" fill="white"/><circle cx="36" cy="34" r="5" fill="#8CC4E5"/></svg>,
} satisfies Record<string, JSX.Element>;

const languages: Language[] = [
  { id: "html", name: "HTML", version: "Web preview", categories: ["popular", "web"], icon: icons.html },
  { id: "css", name: "CSS", version: "Web preview", categories: ["popular", "web"], icon: icons.css },
  { id: 45, name: "Assembly", version: "NASM 2.14.02", categories: ["popular", "lowlevel"], icon: icons.assembly },
  { id: 46, name: "Bash", version: "5.0.0", categories: ["popular", "scripting"], icon: icons.bash },
  { id: 47, name: "Basic", version: "FBC 1.07.1", categories: ["systems"], icon: icons.basic },
  { id: 50, name: "C", version: "GCC 9.2.0", categories: ["popular", "systems"], icon: icons.c },
  { id: 49, name: "C", version: "GCC 8.3.0", categories: ["systems"], icon: icons.c },
  { id: 48, name: "C", version: "GCC 7.4.0", categories: ["systems"], icon: icons.c },
  { id: 75, name: "C", version: "Clang 7.0.1", categories: ["systems"], icon: icons.c },
  { id: 54, name: "C++", version: "GCC 9.2.0", categories: ["popular", "systems"], icon: icons.cpp },
  { id: 53, name: "C++", version: "GCC 8.3.0", categories: ["systems"], icon: icons.cpp },
  { id: 52, name: "C++", version: "GCC 7.4.0", categories: ["systems"], icon: icons.cpp },
  { id: 76, name: "C++", version: "Clang 7.0.1", categories: ["systems"], icon: icons.cpp },
  { id: 51, name: "C#", version: "Mono 6.6.0", categories: ["popular", "jvm"], icon: icons.csharp },
  { id: 86, name: "Clojure", version: "1.10.1", categories: ["functional", "jvm"], icon: icons.clojure },
  { id: 77, name: "COBOL", version: "GnuCOBOL 2.2", categories: ["data"], icon: icons.cobol },
  { id: 55, name: "Common Lisp", version: "SBCL 2.0.0", categories: ["functional"], icon: icons.commonlisp },
  { id: 56, name: "D", version: "DMD 2.089.1", categories: ["systems"], icon: icons.d },
  { id: 57, name: "Elixir", version: "1.9.4", categories: ["functional"], icon: icons.elixir },
  { id: 58, name: "Erlang", version: "OTP 22.2", categories: ["functional"], icon: icons.erlang },
  { id: 87, name: "F#", version: ".NET Core SDK 3.1.202", categories: ["functional", "jvm"], icon: icons.fsharp },
  { id: 59, name: "Fortran", version: "GFortran 9.2.0", categories: ["systems", "data"], icon: icons.fortran },
  { id: 60, name: "Go", version: "1.13.5", categories: ["popular", "systems"], icon: icons.go },
  { id: 88, name: "Groovy", version: "3.0.3", categories: ["jvm"], icon: icons.groovy },
  { id: 61, name: "Haskell", version: "GHC 8.8.1", categories: ["functional"], icon: icons.haskell },
  { id: 62, name: "Java", version: "OpenJDK 13.0.1", categories: ["popular", "jvm"], icon: icons.java },
  { id: 63, name: "JavaScript", version: "Node.js 12.14.0", categories: ["popular", "web", "scripting"], icon: icons.javascript },
  { id: 78, name: "Kotlin", version: "1.3.70", categories: ["popular", "jvm"], icon: icons.kotlin },
  { id: 64, name: "Lua", version: "5.3.5", categories: ["scripting"], icon: icons.lua },
  { id: 79, name: "Objective-C", version: "Clang 7.0.1", categories: ["systems"], icon: icons.objc },
  { id: 65, name: "OCaml", version: "4.09.0", categories: ["functional"], icon: icons.ocaml },
  { id: 66, name: "Octave", version: "5.1.0", categories: ["data"], icon: icons.octave },
  { id: 67, name: "Pascal", version: "FPC 3.0.4", categories: ["systems"], icon: icons.pascal },
  { id: 85, name: "Perl", version: "5.28.1", categories: ["scripting"], icon: icons.perl },
  { id: 68, name: "PHP", version: "7.4.1", categories: ["popular", "scripting", "web"], icon: icons.php },
  { id: 69, name: "Prolog", version: "GNU Prolog 1.4.5", categories: ["functional"], icon: icons.prolog },
  { id: 71, name: "Python 3", version: "3.8.1", categories: ["popular", "scripting", "data"], icon: icons.python },
  { id: 70, name: "Python 2", version: "2.7.17", categories: ["scripting", "data"], icon: icons.python },
  { id: 80, name: "R", version: "4.0.0", categories: ["data"], icon: icons.r },
  { id: 72, name: "Ruby", version: "2.7.0", categories: ["popular", "scripting"], icon: icons.ruby },
  { id: 73, name: "Rust", version: "1.40.0", categories: ["popular", "systems"], icon: icons.rust },
  { id: 81, name: "Scala", version: "2.13.2", categories: ["jvm", "functional"], icon: icons.scala },
  { id: 82, name: "SQL", version: "SQLite 3.27.2", categories: ["popular", "database", "data"], icon: icons.sqlite },
  { id: 83, name: "Swift", version: "5.2.3", categories: ["popular", "systems"], icon: icons.swift },
  { id: 74, name: "TypeScript", version: "3.7.4", categories: ["popular", "web"], icon: icons.typescript },
  { id: 84, name: "Visual Basic", version: "vbnc 0.0.0.5943", categories: ["jvm"], icon: icons.basic },
];

function compilerHref(language: Language) {
  const value = language.name.toLowerCase();
  if (value === "html") {
    return "/compilers/web?mode=html";
  }
  if (value === "css") {
    return "/compilers/web?mode=css";
  }
  if (value === "javascript") {
    return "/compilers/web?mode=javascript";
  }
  if (value === "typescript") {
    return "/compilers/web?mode=typescript";
  }
  return `/compilers/run?lang=${language.id}`;
}

export default function CompilersPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => languages.filter((lang) => {
    const matchesSearch = lang.name.toLowerCase().includes(normalizedSearch);
    const matchesCategory = category === "all" || lang.categories.includes(category);
    return matchesSearch && matchesCategory;
  }), [category, normalizedSearch]);

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-gradient-to-b from-background to-muted/30 px-4 py-12 text-center">
        <nav className="mx-auto mb-8 flex max-w-6xl items-center gap-1.5 text-left text-xs text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span>Compilers</span>
        </nav>

        <h1
          className="mx-auto max-w-3xl leading-tight"
          style={{
            fontSize: "2.25rem",
            fontWeight: 700,
            background: "linear-gradient(135deg, rgb(var(--foreground)) 0%, #10b981 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Code Online with DevTools Compilers
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-muted-foreground" style={{ fontSize: "1rem" }}>
          44 languages. Run code instantly in your browser.
        </p>
        <div className="mx-auto mt-6 max-w-[480px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by language..."
              className="h-11 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.16)]"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 md:flex-row md:items-center md:justify-between">
          <div className="flex justify-center -space-x-3 md:justify-start">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950 [&>svg]:h-10 [&>svg]:w-10">{icons.html}</div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950 [&>svg]:h-10 [&>svg]:w-10">{icons.css}</div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950 [&>svg]:h-10 [&>svg]:w-10">{icons.javascript}</div>
          </div>
          <div className="text-center md:flex-1 md:text-left">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Web Compiler</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Write HTML, CSS and JavaScript with live preview</p>
          </div>
          <Link
            href="/compilers/web?mode=combine"
            className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 md:w-auto"
          >
            Open Web Compiler -&gt;
          </Link>
        </div>
      </section>

      <section className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto py-3">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                category === cat.value
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filtered.map((lang) => (
            <Link
              key={lang.id}
              href={compilerHref(lang)}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-5 text-center transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-zinc-100 p-2 dark:bg-zinc-800 [&>svg]:h-9 [&>svg]:w-9">
                {lang.icon}
              </div>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {lang.name}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {lang.version}
              </span>
            </Link>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-zinc-500">
            No languages found for &quot;{search}&quot;
          </div>
        )}
      </section>
    </main>
  );
}
