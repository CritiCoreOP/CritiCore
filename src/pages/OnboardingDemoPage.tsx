import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

/**
 * Demo page that renders the OnboardingWizard in "new user" mode
 * regardless of the current auth state.
 */
export default function OnboardingDemoPage() {
  return <OnboardingWizard demoMode="new" />;
}
