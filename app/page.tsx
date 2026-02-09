import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-[var(--background)] font-sans">
      <div className="max-w-sm w-full space-y-12">
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-[var(--foreground)] leading-[1.1]">
            Your AI <span className="text-[var(--primary)]">Coach</span>
          </h1>
          <p className="text-lg text-[var(--muted-foreground)] font-medium max-w-xs mx-auto">
            Personalized training, calibrated to your lifestyle.
          </p>
        </div>
        
        <div className="relative group">
          <div className="absolute -inset-1 bg-[var(--primary)] rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <Link href="/onboarding" className="relative block">
            <Button size="lg" className="w-full text-xl h-16 font-bold rounded-2xl bg-[var(--primary)] text-white shadow-xl hover:bg-[var(--primary-dark)] active:scale-[0.98] transition-all">
              Start Journey
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
