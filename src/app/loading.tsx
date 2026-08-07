import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex min-h-dvh-fallback flex-col items-center justify-center gap-4">
      <Image src="/images/logo.jpg" alt="Schedly" width={56} height={56} className="h-14 w-14 rounded-2xl object-cover" />
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40" />
      </div>
    </div>
  );
}