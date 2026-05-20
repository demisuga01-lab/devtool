"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";

type Language = {
  id: string;
  name: string;
  href: string;
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

const languages: Language[] = [
  {
    id: "python",
    name: "Python",
    href: "/tools/scripting-runner",
    categories: ["popular", "scripting"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><path d="M24 3.5c-5.8 0-10.5 1.2-10.5 4.5v3h10.5v1.5H10c-3 0-5.5 2.3-5.5 7s2.5 7 5.5 7h2v-3.5c0-3.3 2.8-5.5 6-5.5h10c2.8 0 5-2 5-5V8c0-2.8-2.5-4.5-9-4.5zm-3 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" fill="#3776AB"/><path d="M24 44.5c5.8 0 10.5-1.2 10.5-4.5v-3H24v-1.5H38c3 0 5.5-2.3 5.5-7s-2.5-7-5.5-7h-2v3.5c0 3.3-2.8 5.5-6 5.5H20c-2.8 0-5 2-5 5v7c0 2.8 2.5 4.5 9 4.5zm3-3a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="#FFD43B"/></svg>,
  },
  {
    id: "javascript",
    name: "JavaScript",
    href: "/tools/web-runner",
    categories: ["popular", "web"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#F7DF1E"/><path d="M13 36.5l3.2-1.9c.6 1.1 1.2 2 2.5 2 1.3 0 2-.5 2-2.5V22h4v12.2c0 4.1-2.4 6-5.9 6-3.2 0-5-1.7-5.8-3.7zM28 36l3.2-1.9c.8 1.4 1.9 2.4 3.8 2.4 1.6 0 2.6-.8 2.6-1.9 0-1.3-.9-1.8-3.1-2.6l-1.1-.5c-3.1-1.3-5.1-3-5.1-6.5 0-3.2 2.5-5.7 6.3-5.7 2.7 0 4.7 1 6.1 3.4l-3.1 2c-.7-1.3-1.5-1.8-2.9-1.8-1.4 0-2.2.9-2.2 2 0 1.4.9 1.9 2.9 2.7l1.1.5c3.6 1.5 5.6 3.1 5.6 6.7 0 3.8-3 6-7 6-3.9 0-6.4-1.9-7.1-4.8z" fill="#000"/></svg>,
  },
  {
    id: "java",
    name: "Java",
    href: "/tools/jvm-runner",
    categories: ["popular", "jvm"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><path d="M18.5 35.5s-1.5.9.9 1.2c2.7.3 4.1.3 7-.1 0 0 .8.5 1.9 1-6.7 2.9-15.2-.2-9.8-2.1zm-.9-4s-1.7 1.3 1 1.5c3.3.3 5.9.3 10.4-.4 0 0 .5.5 1.4.9-9.2 2.7-19.5.2-12.8-2z" fill="#5382A1"/><path d="M24.5 20c1.9 2.1-.5 4-.5 4s4.7-2.4 2.5-5.4c-2-2.8-3.5-4.2 4.7-9 0 0-12.9 3.2-6.7 10.4z" fill="#E76F00"/><path d="M32.5 38.5s1.1.9-1.2 1.6c-4.3 1.3-18 1.7-21.8.1-1.4-.6 1.2-1.5 2-1.6.8-.2 1.3-.2 1.3-.2-1.5-1-9.7 2.1-4.2 3 15.1 2.5 27.5-1.1 23.9-2.9zM19 27s-6.8 1.6-2.4 2.2c1.9.3 5.6.2 9.1-.1 2.8-.3 5.7-.9 5.7-.9s-1 .4-1.7.9c-7 1.9-20.5 1-16.6-.8 3.3-1.6 5.9-1.3 5.9-1.3zm12.4 6.9c7.1-3.7 3.8-7.2 1.5-6.7-.6.1-.8.3-.8.3s.2-.3.6-.5c4.6-1.6 8.1 4.8-1.5 7.3 0 0 .1-.1.2-.4z" fill="#5382A1"/><path d="M27 4s3.9 3.9-3.7 9.9c-6.1 4.8-1.4 7.6 0 10.7-3.6-3.2-6.2-6.1-4.4-8.7 2.5-3.8 9.6-5.6 8.1-11.9z" fill="#E76F00"/><path d="M19.8 42.5c6.8.4 17.2-.2 17.5-3.1 0 0-.5 1.2-5.6 2.2-5.8 1.1-12.9 1-17.1.3 0 0 .9.7 5.2.6z" fill="#5382A1"/></svg>,
  },
  {
    id: "c",
    name: "C",
    href: "/tools/systems-runner",
    categories: ["popular", "systems"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><circle cx="24" cy="24" r="20" fill="#5C6BC0"/><path d="M30 29.5c-1.3 1.3-3 2-5 2-4.1 0-7.5-3.4-7.5-7.5S20.9 16.5 25 16.5c2 0 3.7.8 5 2l-2 2c-.8-.8-1.8-1.3-3-1.3-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5c1.2 0 2.2-.5 3-1.3l2 1.6z" fill="white"/></svg>,
  },
  {
    id: "cpp",
    name: "C++",
    href: "/tools/systems-runner",
    categories: ["popular", "systems"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><circle cx="24" cy="24" r="20" fill="#00599C"/><path d="M22 29.5c-1.3 1.3-3 2-5 2-4.1 0-7.5-3.4-7.5-7.5S12.9 16.5 17 16.5c2 0 3.7.8 5 2l-2 2c-.8-.8-1.8-1.3-3-1.3-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5c1.2 0 2.2-.5 3-1.3l2 1.6zM31 22v-3h-2v3h-3v2h3v3h2v-3h3v-2h-3z" fill="white"/></svg>,
  },
  {
    id: "csharp",
    name: "C#",
    href: "/tools/jvm-runner",
    categories: ["popular", "jvm"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><circle cx="24" cy="24" r="20" fill="#9B4F96"/><path d="M20 29.5c-1.3 1.3-3 2-5 2-4.1 0-7.5-3.4-7.5-7.5S10.9 16.5 15 16.5c2 0 3.7.8 5 2l-2 2c-.8-.8-1.8-1.3-3-1.3-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5c1.2 0 2.2-.5 3-1.3l2 1.6zM29 19h-6v2h2v8h2v-8h2v-2zM33 19h-2v3h-2v2h2v3h2v-3h2v-2h-2v-3z" fill="white"/></svg>,
  },
  {
    id: "typescript",
    name: "TypeScript",
    href: "/tools/web-runner",
    categories: ["popular", "web"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#3178C6"/><path d="M22 22h-8v3h5v13h3V22zM26 31.5c.5 1 1.5 1.8 3 1.8 1.3 0 2-.6 2-1.5 0-.9-.6-1.4-2.2-2l-.8-.3c-2.3-.9-3.5-2.2-3.5-4.2 0-2.5 2-4.3 5-4.3 2.2 0 3.8.8 4.8 2.5l-2.3 1.5c-.5-.9-1.1-1.4-2.4-1.4-1.1 0-1.8.6-1.8 1.4 0 .9.6 1.3 2 1.9l.8.3c2.7 1.1 4 2.4 4 4.5 0 2.7-2.1 4.5-5.4 4.5-2.8 0-4.8-1.4-5.7-3.5l2.5-1.2z" fill="white"/></svg>,
  },
  {
    id: "go",
    name: "Go",
    href: "/tools/systems-runner",
    categories: ["popular", "systems"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#00ACD7"/><path d="M8 20.5c-.2 0-.2-.1-.1-.2l.7-.9c.1-.1.3-.2.5-.2h13.5c.2 0 .2.1.1.3l-.5.8c-.1.1-.3.2-.5.2H8zM5 23c-.2 0-.2-.1-.1-.2l.7-.9c.1-.1.3-.2.5-.2H22c.2 0 .3.1.2.3l-.3.7c-.1.2-.3.3-.5.3H5zM11 25.5c-.2 0-.2-.1-.1-.3l.5-.8c.1-.1.3-.2.5-.2h7c.2 0 .3.1.3.3l-.1.7c0 .2-.2.3-.4.3H11zM34.5 20c-2.2.6-3.7 1-5.8 1-2.3 0-4-.5-5.4-1.8-1.2-1.1-1.8-2.6-1.8-4.4 0-5.3 4-9.3 9.3-9.3 3.5 0 5.5 1 7 2.3l-2.3 3c-1.4-1.3-2.7-1.8-4.8-1.8-2.8 0-5 2.1-5 5s2 4.7 5 4.7c.8 0 1.5-.1 2-.3V16h3.8v4zM42.5 21.5h-4.5l-2.5-4.5-2.5 4.5h-4.5l4.7-7.5-4.5-7h4.5l2.3 4.3 2.3-4.3H42l-4.5 7 5 7.5z" fill="white"/></svg>,
  },
  {
    id: "rust",
    name: "Rust",
    href: "/tools/systems-runner",
    categories: ["popular", "systems"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><circle cx="24" cy="24" r="20" fill="#CE422B"/><path d="M24 8l1.5 2.5h-3L24 8zm0 32l-1.5-2.5h3L24 40zm16-16l-2.5 1.5v-3L40 24zM8 24l2.5-1.5v3L8 24z" fill="white"/><circle cx="24" cy="24" r="8" fill="none" stroke="white" strokeWidth="2"/><path d="M20 22h8M20 26h8" stroke="white" strokeWidth="2"/></svg>,
  },
  {
    id: "kotlin",
    name: "Kotlin",
    href: "/tools/jvm-runner",
    categories: ["popular", "jvm"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><defs><linearGradient id="kotlinGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#E44857"/><stop offset="50%" stopColor="#C711E1"/><stop offset="100%" stopColor="#7F52FF"/></linearGradient></defs><rect width="48" height="48" rx="4" fill="url(#kotlinGradient)"/><path d="M6 6h18L6 24V6zM6 42L24 24l18 18H6z" fill="white"/></svg>,
  },
  {
    id: "php",
    name: "PHP",
    href: "/tools/scripting-runner",
    categories: ["popular", "scripting", "web"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><ellipse cx="24" cy="24" rx="20" ry="12" fill="#8892BF"/><path d="M14 20h3l1 4h3l-1-4h3l-1 8h-3l.5-2H17l-.5 2h-3l1-8zm12 0h5c2 0 3 1 3 3 0 3-2 5-5 5h-2l-.5 2h-3l2-10zm3 2h-1.5l-.7 4h1.5c1.3 0 2-1 2-2.5 0-.9-.4-1.5-1.3-1.5z" fill="white"/></svg>,
  },
  {
    id: "ruby",
    name: "Ruby",
    href: "/tools/scripting-runner",
    categories: ["popular", "scripting"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><path d="M38 10l2 28-28 2-8-6 6-28 28 4z" fill="#CC342D"/><path d="M16 14l16 2-2 16-14-6 0-12z" fill="#FF6060"/><path d="M32 16l4 20-20 2 16-22z" fill="#CC342D"/><path d="M16 26l14-12-12 20-2-8z" fill="#FF6060"/></svg>,
  },
  {
    id: "swift",
    name: "Swift",
    href: "/tools/other-runner",
    categories: ["popular", "systems"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="10" fill="#F05138"/><path d="M38 29c0 5-4 9-9 9H19c-5 0-9-4-9-9V19c0-5 4-9 9-9h10c5 0 9 4 9 9" fill="#F05138"/><path d="M35 27c-2.5 4.5-7.5 7-12.5 6C16 32 11 27 11 21c0 4 2 8 6 10 3 1.5 6.5 1.5 9.5 0C30 29 33 26 35 23c0 0 2 2 0 4z" fill="white"/></svg>,
  },
  {
    id: "dart",
    name: "Dart",
    href: "/tools/other-runner",
    categories: ["popular", "web"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><path d="M12 6l-6 6v20l6 6 20-2 8-8V14L34 6H12z" fill="#00B4AB"/><path d="M14 14l14-2 8 8-2 14-14 2-8-8 2-14z" fill="#00D2FF"/><path d="M22 18v12l6-6-6-6z" fill="white"/></svg>,
  },
  {
    id: "html",
    name: "HTML",
    href: "/tools/web-runner",
    categories: ["web"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><path d="M8 6l3 34 13 4 13-4 3-34H8z" fill="#E44D26"/><path d="M24 41.5V9H38.5L36 38l-12 3.5z" fill="#F16529"/><path d="M24 21h-7l-.5-5H24v-5H12l1.5 15H24v-5zm0 8h-5.5l-.5-5H24v5h-0.5l-4-.5-.3-3H15l.5 7 8.5 2.5V29z" fill="#EBEBEB"/><path d="M24 21h6.5l-.5 5H24v5h5.5l-.5 5-5 1.5V37l4-.5.3-3H24v-5h7.5l.5-15H24v5z" fill="white"/></svg>,
  },
  {
    id: "css",
    name: "CSS",
    href: "/tools/web-runner",
    categories: ["web"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><path d="M8 6l3 34 13 4 13-4 3-34H8z" fill="#1572B6"/><path d="M24 41.5V9H38.5L36 38l-12 3.5z" fill="#33A9DC"/><path d="M24 22.5H17l.5 5H24v-5zm0-8H16.5l.5 5H24v-5zm0 16l-4.5-1.3-.3-3.5H15l.5 7.5 8.5 2.3V30.5zm0 0h5l-.5 4.5-4.5 1.3V30.5zm0-8h5.5l-.5-5H24v5zm1-8h5l-.5-5H24v5z" fill="white"/></svg>,
  },
  {
    id: "coffeescript",
    name: "CoffeeScript",
    href: "/tools/web-runner",
    categories: ["web", "scripting"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#2F2625"/><path d="M24 12c-7 0-12 5-12 12s5 12 12 12 12-5 12-12-5-12-12-12zm0 20c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" fill="#C0A882"/></svg>,
  },
  {
    id: "d",
    name: "D",
    href: "/tools/other-runner",
    categories: ["systems"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#B03931"/><path d="M12 12h10c8 0 14 5 14 12s-6 12-14 12H12V12zm5 5v14h5c5 0 9-3 9-7s-4-7-9-7h-5z" fill="white"/></svg>,
  },
  {
    id: "zig",
    name: "Zig",
    href: "/tools/systems-runner",
    categories: ["systems"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#F7A41D"/><path d="M10 14h20l-8 10 8 10H10l8-10-8-10zm18 0h10v6l-4 4 4 4v6H28l-6-10 6-10z" fill="black"/></svg>,
  },
  {
    id: "fortran",
    name: "Fortran",
    href: "/tools/other-runner",
    categories: ["systems", "data"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#734F96"/><path d="M12 12h24v5H17v5h15v5H17v9h-5V12z" fill="white"/></svg>,
  },
  {
    id: "nasm",
    name: "Assembly",
    href: "/tools/other-runner",
    categories: ["systems", "lowlevel"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#6E4C13"/><path d="M10 36l6-24h4l4 16 4-16h4l6 24h-4l-4-16-4 16h-4l-4-16-4 16h-4z" fill="#F8C518"/></svg>,
  },
  {
    id: "scala",
    name: "Scala",
    href: "/tools/jvm-runner",
    categories: ["jvm", "functional"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#DC322F"/><path d="M12 18h24c0 3-24 3-24 6s24 3 24 6H12c0-3 24-3 24-6s-24-3-24-6zm0-6h24c0 2-24 2-24 4s24 2 24 4H12c0-2 24-2 24-4s-24-2-24-4z" fill="white" opacity="0.9"/></svg>,
  },
  {
    id: "groovy",
    name: "Groovy",
    href: "/tools/jvm-runner",
    categories: ["jvm", "scripting"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#4298B8"/><path d="M24 10c-8 0-14 6-14 14s6 14 14 14 14-6 14-14S32 10 24 10zm0 22c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" fill="white"/><circle cx="24" cy="24" r="4" fill="white"/></svg>,
  },
  {
    id: "clojure",
    name: "Clojure",
    href: "/tools/jvm-runner",
    categories: ["jvm", "functional"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><circle cx="24" cy="24" r="20" fill="#63B132"/><circle cx="24" cy="24" r="12" fill="none" stroke="white" strokeWidth="3"/><circle cx="24" cy="24" r="4" fill="white"/><path d="M24 12v4M24 32v4M12 24h4M32 24h4" stroke="white" strokeWidth="2"/></svg>,
  },
  {
    id: "perl",
    name: "Perl",
    href: "/tools/scripting-runner",
    categories: ["scripting"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><circle cx="24" cy="24" r="20" fill="#39457E"/><path d="M14 20c0-5.5 4.5-10 10-10 4 0 7.5 2.3 9.2 5.7" stroke="#FFF" strokeWidth="3" fill="none"/><path d="M24 38c-7.7 0-14-6.3-14-14 0-2.3.6-4.5 1.6-6.4" stroke="#FFF" strokeWidth="3" fill="none"/><circle cx="24" cy="24" r="4" fill="white"/></svg>,
  },
  {
    id: "lua",
    name: "Lua",
    href: "/tools/scripting-runner",
    categories: ["scripting"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><circle cx="24" cy="24" r="20" fill="#000080"/><circle cx="24" cy="24" r="12" fill="white"/><circle cx="30" cy="18" r="5" fill="#000080"/></svg>,
  },
  {
    id: "bash",
    name: "Bash",
    href: "/tools/scripting-runner",
    categories: ["scripting"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#1D1D1D"/><path d="M14 20l6 4-6 4v-8zm8 7h12" stroke="#4EAA25" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>,
  },
  {
    id: "haskell",
    name: "Haskell",
    href: "/tools/other-runner",
    categories: ["functional"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#5D4F85"/><path d="M6 36l10-12L6 12h6l10 12-10 12H6zm12 0l10-12L18 12h6l10 12-10 12h-6zm14-5h10v-4H32l4-4h-4l-4 4 4 4z" fill="white"/></svg>,
  },
  {
    id: "elixir",
    name: "Elixir",
    href: "/tools/other-runner",
    categories: ["functional"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#6E4A7E"/><path d="M24 8c0 0-12 10-12 20 0 7 5 12 12 12s12-5 12-12C36 18 24 8 24 8zm0 26c-3.3 0-6-2.7-6-6 0-5 6-13 6-13s6 8 6 13c0 3.3-2.7 6-6 6z" fill="white"/></svg>,
  },
  {
    id: "erlang",
    name: "Erlang",
    href: "/tools/other-runner",
    categories: ["functional"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#A90533"/><path d="M10 24c0-7 5-13 12-14.5v3c-5 1.5-8 6-8 11.5h-4zm28 0c0 7-5 13-12 14.5v-3c5-1.5 8-6 8-11.5h4zm-16 4h12v3H22v-3zm0-5h8v3h-8v-3z" fill="white"/></svg>,
  },
  {
    id: "ocaml",
    name: "OCaml",
    href: "/tools/other-runner",
    categories: ["functional"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#EC6813"/><path d="M12 24c0-6.6 5.4-12 12-12 4 0 7.5 2 9.7 5H28c-1.5-1.9-3.8-3-6-3-4.4 0-8 3.6-8 8s3.6 8 8 8c2.2 0 4.5-1 6-3h5.7C31.5 30 28 32 24 32c-6.6 0-12-5.4-12-8z" fill="white"/></svg>,
  },
  {
    id: "racket",
    name: "Racket",
    href: "/tools/other-runner",
    categories: ["functional"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><circle cx="24" cy="24" r="20" fill="#9F1D20"/><path d="M24 4C13 4 4 13 4 24c0 5.5 2.2 10.5 5.8 14.1C14 27 19 18 24 14c5 4 10 13 14.2 24.1C42 34.5 44 29.5 44 24c0-11-9-20-20-20z" fill="white"/></svg>,
  },
  {
    id: "r",
    name: "R",
    href: "/tools/data-runner",
    categories: ["data"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#276DC3"/><path d="M14 12h12c4 0 8 2 8 7 0 3.5-2 6-5 7l6 10h-5l-5.5-9.5H19V36h-5V12zm5 5v9.5h6c2.5 0 4-1.5 4-4.5 0-3-1.5-5-4-5h-6z" fill="white"/></svg>,
  },
  {
    id: "julia",
    name: "Julia",
    href: "/tools/data-runner",
    categories: ["data", "systems"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><circle cx="16" cy="32" r="8" fill="#CB3C33"/><circle cx="32" cy="32" r="8" fill="#389826"/><circle cx="24" cy="18" r="8" fill="#9558B2"/></svg>,
  },
  {
    id: "sqlite",
    name: "SQLite",
    href: "/tools/data-runner",
    categories: ["data", "database"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><path d="M36 4c-6 0-12 8-12 20s6 20 12 20c2 0 4-1 4-3V7c0-2-2-3-4-3z" fill="#0F80CC"/><path d="M24 24c0-12-6-20-12-20C8 4 6 5 6 7v34c0 2 2 3 4 3 6 0 14-8 14-20z" fill="#003B57"/></svg>,
  },
  {
    id: "cobol",
    name: "COBOL",
    href: "/tools/other-runner",
    categories: ["data"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#005A9C"/><path d="M26 15c-6 0-10 4-10 9s4 9 10 9c3 0 5.5-1.2 7.2-3.2l-2.7-2.1C29.4 29 27.8 30 26 30c-3.3 0-6-2.7-6-6s2.7-6 6-6c1.8 0 3.4 1 4.5 2.3l2.7-2.1C31.5 16.2 29 15 26 15z" fill="white"/></svg>,
  },
  {
    id: "mysql",
    name: "MySQL",
    href: "/tools/database-runner",
    categories: ["database"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><path d="M40 28c-2 0-3.5.5-4.5 1.5L29 23c.1-.3.1-.6.1-1 0-3.3-2.7-6-6-6-1.3 0-2.5.4-3.5 1.1L14 11.5C14 11.3 14 11.1 14 11c0-2.2-1.8-4-4-4S6 8.8 6 11s1.8 4 4 4c.9 0 1.8-.3 2.4-.8l5.5 5.5C17.3 20.7 17 21.8 17 23c0 3.3 2.7 6 6 6 1.3 0 2.5-.4 3.4-1.1l6.5 6.6c-.1.3-.1.6-.1.9 0 2.2 1.8 4 4 4 2.2 0 4-1.8 4-4S42.2 28 40 28z" fill="#4479A1"/><path d="M8 16c-1 0-2 .5-2.5 1.3C4.6 18.3 4 20 4 22c0 7.7 6.3 14 14 14 2 0 3.7-.6 4.7-1.5.8-.5 1.3-1.5 1.3-2.5 0-2.2-1.8-4-4-4" fill="#00758F"/></svg>,
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    href: "/tools/database-runner",
    categories: ["database"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><path d="M36 8c-4.4 0-8 1.8-10.5 4.5C23 10.5 19.5 9 16 9 9.4 9 4 14.4 4 21c0 4.8 2.8 9 7 11v7h4v-5.5c1.3.3 2.6.5 4 .5h.5l-.5 5h4l.5-5.5c1-.2 2-.5 2.9-.9L31 34h4l-4-4.5c3-2.5 5-6.5 5-11.5V16h4V8h-4z" fill="#336791"/><path d="M36 16c0 7-4.9 12-12 12S12 23 12 16s4.9-12 12-12 12 5 12 12z" fill="#336791"/><path d="M24 12c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" fill="white"/></svg>,
  },
  {
    id: "mongodb",
    name: "MongoDB",
    href: "/tools/database-runner",
    categories: ["database"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><path d="M24 4C24 4 14 16 14 26c0 5.5 4.5 10 10 10s10-4.5 10-10C34 16 24 4 24 4z" fill="#13AA52"/><path d="M24 38v6" stroke="#B8C4BA" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  },
  {
    id: "nasm64",
    name: "NASM x64",
    href: "/tools/other-runner",
    categories: ["lowlevel"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#444"/><path d="M10 36l6-24h4l4 16 4-16h4l6 24h-4l-4-16-4 16h-4l-4-16-4 16h-4z" fill="#AAA"/></svg>,
  },
  {
    id: "crystal",
    name: "Crystal",
    href: "/tools/other-runner",
    categories: ["systems"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#000"/><path d="M24 6l14 8v16l-14 8L10 30V14L24 6zm0 4L13 16v16l11 6 11-6V16L24 10z" fill="white"/><path d="M24 14l7 4v8l-7 4-7-4v-8l7-4z" fill="#333"/></svg>,
  },
  {
    id: "nim",
    name: "Nim",
    href: "/tools/other-runner",
    categories: ["systems"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#FFE953"/><path d="M24 10l14 8-14 8-14-8 14-8zm0 10l14 8-14 8-14-8 14-8z" fill="#1C1C1C" opacity="0.8"/></svg>,
  },
  {
    id: "pascal",
    name: "Pascal",
    href: "/tools/other-runner",
    categories: ["systems"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#0070C5"/><path d="M12 12h14c4 0 8 2.5 8 7.5S30 27 26 27H17v9h-5V12zm5 5v10h7c2 0 4-1.5 4-5s-2-5-4-5h-7z" fill="white"/></svg>,
  },
  {
    id: "rscript",
    name: "R Script",
    href: "/tools/data-runner",
    categories: ["data"],
    icon: <svg viewBox="0 0 48 48" className="h-12 w-12"><rect width="48" height="48" rx="4" fill="#276DC3"/><path d="M14 12h12c4 0 8 2 8 7 0 3.5-2 6-5 7l6 10h-5l-5.5-9.5H19V36h-5V12zm5 5v9.5h6c2.5 0 4-1.5 4-4.5 0-3-1.5-5-4-5h-6z" fill="white"/><circle cx="36" cy="34" r="5" fill="#8CC4E5"/></svg>,
  },
];

export default function CompilersPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = languages.filter((lang) => {
    const matchesSearch = lang.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || lang.categories.includes(category);
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <section className="border-b border-zinc-200 bg-white px-4 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Code online with <span className="text-emerald-600 dark:text-emerald-400">DevTools Compilers</span>
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          42+ languages. Run code instantly in your browser. No setup required.
        </p>
        <div className="mx-auto mt-6 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by language..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
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
              href={lang.href}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-center transition hover:border-emerald-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-600"
            >
              <div className="flex h-12 w-12 items-center justify-center">
                {lang.icon}
              </div>
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {lang.name}
              </span>
            </Link>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-zinc-500">
            No languages found for "{search}"
          </div>
        )}
      </section>
    </main>
  );
}
