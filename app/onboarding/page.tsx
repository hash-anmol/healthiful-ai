import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/server";

export default async function OnboardingPage() {
  const { session, profile } = await getServerAuthContext();
  if (!session) {
    redirect("/login");
  }
  if (profile) {
    redirect("/dashboard");
  }

  return <OnboardingFlow />;
}
