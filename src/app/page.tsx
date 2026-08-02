import { DesktopLanding } from "@/components/landing/desktop-landing";
import { MobileOnboarding } from "@/components/landing/mobile-onboarding";

export default function Home() {
  return (
    <>
      {/* Desktop landing (>=768px) — unchanged */}
      <div className="hidden md:block">
        <DesktopLanding />
      </div>
      {/* Mobile onboarding (<768px) — native app-style flow */}
      <div className="block md:hidden">
        <MobileOnboarding />
      </div>
    </>
  );
}
