"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full">
      <div className="relative z-10 flex min-h-screen">
        <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:items-end lg:justify-between lg:pl-12 lg:pr-6 text-neutral-900">
          <Link href="/" className="flex items-center gap-3 lg:w-full lg:max-w-md lg:mt-8">
            <Image src="/images/logo.jpg" alt="" aria-hidden width={40} height={40} className="h-10 w-10 rounded-xl object-cover" />
            <span className="text-2xl font-bold tracking-tight">Schedly</span>
          </Link>
        </div>
        <div className="flex min-h-screen w-full items-center justify-center bg-transparent p-4 lg:w-1/2 lg:justify-start lg:px-6 lg:py-8">
          <div className="w-full max-w-lg">
            <div className="mb-8 flex lg:hidden">
              <Link
                href="/"
                aria-label="Back to home"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background text-foreground shadow-sm transition-colors hover:bg-muted active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
