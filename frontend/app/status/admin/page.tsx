import { redirect } from "next/navigation";

export default function StatusAdminRedirect() {
  redirect("/dashboard");
}
