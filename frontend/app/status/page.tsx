import { ComingSoon } from "@/components/ComingSoon";

export const metadata = {
  title: "Status",
};

export default function StatusPage() {
  return (
    <ComingSoon
      eyebrow="Status"
      title="Service status board"
      description="Monitor the health of your services and APIs. Coming soon."
    />
  );
}
