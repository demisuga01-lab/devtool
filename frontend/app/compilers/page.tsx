import type { Metadata } from "next";

import CompilersClient from "./CompilersClient";

export const metadata: Metadata = {
  title: "Compilers — DevTools by WellFriend",
  description:
    "Run code online in 44 languages. Python, Java, C, C++, Rust, Go and more. Free, no signup required.",
};

export default function CompilersPage() {
  return <CompilersClient />;
}
