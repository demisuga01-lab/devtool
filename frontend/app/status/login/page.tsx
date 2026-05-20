import { redirect } from "next/navigation";

export default function StatusLoginRedirect() {
  redirect("/dashboard/login");
}
