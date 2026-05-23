"use client";

import { useEffect } from "react";

interface Props {
  toolName: string;
  toolHref: string;
  iconName: string;
  intentGroup: string;
}

type RecentVisit = {
  name: string;
  href: string;
  iconName: string;
  intentGroup: string;
  visitedAt: number;
};

export function RecordVisit({ toolName, toolHref, iconName, intentGroup }: Props) {
  useEffect(() => {
    try {
      const key = "devtools:recently-used";
      const existing = JSON.parse(localStorage.getItem(key) || "[]") as RecentVisit[];
      const filtered = existing.filter((entry) => entry.href !== toolHref);
      const updated = [
        { name: toolName, href: toolHref, iconName, intentGroup, visitedAt: Date.now() },
        ...filtered,
      ].slice(0, 20);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // Recent tools are a convenience only.
    }
  }, [toolHref, toolName, iconName, intentGroup]);

  return null;
}
