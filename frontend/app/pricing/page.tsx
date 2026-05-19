import Link from "next/link";

const features = [
  "All 29 developer tools",
  "Unlimited paste creation",
  "No account required",
  "Open source - self-hostable",
  "No ads, no tracking",
];

export const metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Pricing</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Free. Always.
        </h1>
        <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
          WellFriend DevTools is open source and completely free to use. No plans, no limits, no credit card.
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-sm rounded-2xl border-2 border-emerald-600 bg-white p-8 shadow-sm dark:bg-zinc-900">
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          Free Forever
        </span>
        <div className="mt-5 text-4xl font-bold text-zinc-900 dark:text-zinc-100">$0 / month</div>
        <ul className="mt-6 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        <Link
          href="/tools"
          className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Start using DevTools
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-500">
        Want the source code?{" "}
        <a
          href="https://github.com/demisuga01-lab/devtool"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
        >
          View on GitHub
        </a>
      </p>
    </div>
  );
}
