import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6 space-y-4">
      <h1 className="text-6xl font-headline font-bold text-white tracking-tighter">404</h1>
      <h2 className="text-lg font-headline text-white font-semibold">Page Not Found</h2>
      <p className="text-xs text-on-surface-variant font-mono max-w-sm">
        This chronicle does not exist in the digital noir.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-primary text-black rounded-full text-xs font-headline font-bold hover:bg-white/90 transition-all mt-4"
      >
        Return Home
      </Link>
    </div>
  );
}
