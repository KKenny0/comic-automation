import Link from "next/link";

export function MissionNav() {
  return (
    <nav className="flex gap-2">
      <Link
        href="/"
        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm hover:bg-slate-800"
      >
        Calendar
      </Link>
    </nav>
  );
}
