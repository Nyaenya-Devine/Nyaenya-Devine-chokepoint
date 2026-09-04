import { redirect } from "next/navigation";
import { getSessionUid } from "@/lib/session";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  // Already signed in? Go straight to the dashboard.
  if (await getSessionUid()) redirect("/dashboard");
  return <LoginForm />;
}
