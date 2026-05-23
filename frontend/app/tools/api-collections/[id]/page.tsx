"use client";

import { use, useEffect, useState } from "react";
import { ApiCollectionsClient } from "../api-collections-client";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ApiCollectionSharePage({ params }: Props) {
  const { id } = use(params);
  const [adminKey, setAdminKey] = useState("");

  useEffect(() => {
    try {
      setAdminKey(new URLSearchParams(window.location.search).get("key") || "");
    } catch {
      setAdminKey("");
    }
  }, []);

  return <ApiCollectionsClient initialCollectionId={id} initialAdminKey={adminKey} />;
}
