"use client";

import { useMemo, useState } from "react";
import { CopyButton, Input, Label } from "@/components/ui";
import { ToolShell } from "@/components/ToolShell";

const languages = [
  ["en", "English", "English"], ["es", "Spanish", "Español"], ["fr", "French", "Français"], ["de", "German", "Deutsch"],
  ["it", "Italian", "Italiano"], ["pt", "Portuguese", "Português"], ["zh", "Chinese", "中文"], ["ja", "Japanese", "日本語"],
  ["ko", "Korean", "한국어"], ["ar", "Arabic", "العربية"], ["hi", "Hindi", "हिन्दी"], ["bn", "Bengali", "বাংলা"],
  ["ru", "Russian", "Русский"], ["tr", "Turkish", "Türkçe"], ["vi", "Vietnamese", "Tiếng Việt"], ["th", "Thai", "ไทย"],
  ["id", "Indonesian", "Bahasa Indonesia"], ["ms", "Malay", "Bahasa Melayu"], ["nl", "Dutch", "Nederlands"], ["sv", "Swedish", "Svenska"],
  ["no", "Norwegian", "Norsk"], ["da", "Danish", "Dansk"], ["fi", "Finnish", "Suomi"], ["pl", "Polish", "Polski"],
  ["cs", "Czech", "Čeština"], ["sk", "Slovak", "Slovenčina"], ["hu", "Hungarian", "Magyar"], ["ro", "Romanian", "Română"],
  ["el", "Greek", "Ελληνικά"], ["he", "Hebrew", "עברית"], ["uk", "Ukrainian", "Українська"], ["fa", "Persian", "فارسی"],
  ["ur", "Urdu", "اردو"], ["ta", "Tamil", "தமிழ்"], ["te", "Telugu", "తెలుగు"], ["mr", "Marathi", "मराठी"],
  ["gu", "Gujarati", "ગુજરાતી"], ["kn", "Kannada", "ಕನ್ನಡ"], ["ml", "Malayalam", "മലയാളം"], ["pa", "Punjabi", "ਪੰਜਾਬੀ"],
  ["sw", "Swahili", "Kiswahili"], ["af", "Afrikaans", "Afrikaans"], ["am", "Amharic", "አማርኛ"], ["az", "Azerbaijani", "Azərbaycanca"],
  ["be", "Belarusian", "Беларуская"], ["bg", "Bulgarian", "Български"], ["ca", "Catalan", "Català"], ["et", "Estonian", "Eesti"],
  ["eu", "Basque", "Euskara"], ["gl", "Galician", "Galego"], ["hr", "Croatian", "Hrvatski"], ["is", "Icelandic", "Íslenska"],
  ["ka", "Georgian", "ქართული"], ["kk", "Kazakh", "Қазақ"], ["lt", "Lithuanian", "Lietuvių"], ["lv", "Latvian", "Latviešu"],
  ["mk", "Macedonian", "Македонски"], ["mn", "Mongolian", "Монгол"], ["ne", "Nepali", "नेपाली"], ["si", "Sinhala", "සිංහල"],
  ["sl", "Slovenian", "Slovenščina"], ["sr", "Serbian", "Српски"], ["uz", "Uzbek", "O‘zbek"], ["zu", "Zulu", "IsiZulu"],
];

const countries = [
  ["US", "United States", "Americas"], ["GB", "United Kingdom", "Europe"], ["CA", "Canada", "Americas"], ["AU", "Australia", "Oceania"],
  ["IN", "India", "Asia"], ["CN", "China", "Asia"], ["JP", "Japan", "Asia"], ["KR", "South Korea", "Asia"], ["BR", "Brazil", "Americas"],
  ["MX", "Mexico", "Americas"], ["DE", "Germany", "Europe"], ["FR", "France", "Europe"], ["IT", "Italy", "Europe"], ["ES", "Spain", "Europe"],
  ["NL", "Netherlands", "Europe"], ["SE", "Sweden", "Europe"], ["NO", "Norway", "Europe"], ["DK", "Denmark", "Europe"], ["FI", "Finland", "Europe"],
  ["PL", "Poland", "Europe"], ["TR", "Turkey", "Asia/Europe"], ["RU", "Russia", "Europe/Asia"], ["ZA", "South Africa", "Africa"], ["NG", "Nigeria", "Africa"],
  ["EG", "Egypt", "Africa"], ["KE", "Kenya", "Africa"], ["AR", "Argentina", "Americas"], ["CL", "Chile", "Americas"], ["CO", "Colombia", "Americas"],
  ["PE", "Peru", "Americas"], ["NZ", "New Zealand", "Oceania"], ["SG", "Singapore", "Asia"], ["MY", "Malaysia", "Asia"], ["TH", "Thailand", "Asia"],
  ["VN", "Vietnam", "Asia"], ["ID", "Indonesia", "Asia"], ["PH", "Philippines", "Asia"], ["AE", "United Arab Emirates", "Asia"], ["SA", "Saudi Arabia", "Asia"],
  ["IL", "Israel", "Asia"], ["CH", "Switzerland", "Europe"], ["AT", "Austria", "Europe"], ["BE", "Belgium", "Europe"], ["IE", "Ireland", "Europe"],
];

const locales = ["en-US", "en-GB", "es-ES", "es-MX", "fr-FR", "fr-CA", "de-DE", "it-IT", "pt-BR", "pt-PT", "zh-CN", "zh-TW", "ja-JP", "ko-KR", "hi-IN", "ar-SA", "ru-RU", "nl-NL", "sv-SE", "pl-PL", "tr-TR", "vi-VN", "th-TH", "id-ID", "he-IL", "uk-UA", "cs-CZ", "da-DK", "fi-FI", "nb-NO"];
const timezones = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Toronto", "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Rome", "Europe/Amsterdam", "Asia/Kolkata", "Asia/Tokyo", "Asia/Shanghai", "Asia/Singapore", "Asia/Dubai", "Asia/Seoul", "Australia/Sydney", "Pacific/Auckland"];
const snippets = [
  ["JavaScript - Intl.DateTimeFormat", "new Intl.DateTimeFormat('en-US', {\n  dateStyle: 'full',\n  timeStyle: 'long'\n}).format(new Date())"],
  ["JavaScript - Intl.NumberFormat", "new Intl.NumberFormat('de-DE', {\n  style: 'currency',\n  currency: 'EUR'\n}).format(1234567.89)"],
  ["JavaScript - Intl.RelativeTimeFormat", "new Intl.RelativeTimeFormat('en', {\n  numeric: 'auto'\n}).format(-1, 'day')"],
  ["Python - locale", "import locale\nlocale.setlocale(locale.LC_ALL, 'en_US.UTF-8')\nlocale.currency(1234567.89)"],
];

function DataTable({ rows, headings }: { rows: string[][]; headings: string[] }) {
  return (
    <div className="max-h-80 overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950">
          <tr>{headings.map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}</tr>
        </thead>
        <tbody>{rows.map((row) => <tr key={row.join("-")} className="border-t border-zinc-100 dark:border-zinc-800">{row.map((cell) => <td key={cell} className="px-3 py-2">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function I18nStandardsPage() {
  const [query, setQuery] = useState("");
  const filteredLanguages = useMemo(() => languages.filter((row) => row.join(" ").toLowerCase().includes(query.toLowerCase())), [query]);
  const filteredCountries = useMemo(() => countries.filter((row) => row.join(" ").toLowerCase().includes(query.toLowerCase())), [query]);
  const filteredZones = useMemo(() => timezones.filter((zone) => zone.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <ToolShell slug="i18n-standards">
      <div className="space-y-8">
        <div><Label>Search references</Label><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search code, language, country, timezone..." /></div>
        <section className="space-y-2"><h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Language Codes (ISO 639-1)</h2><DataTable headings={["Code", "Language", "Native Name"]} rows={filteredLanguages} /></section>
        <section className="space-y-2"><h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Country Codes (ISO 3166-1 alpha-2)</h2><DataTable headings={["Code", "Country", "Region"]} rows={filteredCountries} /></section>
        <section className="space-y-2"><h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Locale Format Reference</h2><DataTable headings={["Locale", "Display Name"]} rows={locales.map((locale) => [locale, new Intl.DisplayNames(["en"], { type: "language" }).of(locale.split("-")[0]) ?? locale])} /></section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Common I18N Code Snippets</h2>
          {snippets.map(([title, code]) => <div key={title} className="space-y-2"><div className="flex items-center justify-between"><Label>{title}</Label><CopyButton value={code} /></div><pre className="overflow-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100"><code>{code}</code></pre></div>)}
        </section>
        <section className="space-y-2"><h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Timezone Reference</h2><div className="grid gap-2 sm:grid-cols-2">{filteredZones.map((zone) => <div key={zone} className="rounded-xl border border-zinc-200 bg-white p-3 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-900">{zone}</div>)}</div></section>
      </div>
    </ToolShell>
  );
}
