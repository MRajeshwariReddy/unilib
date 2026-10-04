import Link from "next/link";
import { LICENSES } from "@/lib/config/licenses";

interface LicenseBadgeProps {
  license: string;
}

export function LicenseBadge({ license }: LicenseBadgeProps) {
  const label = LICENSES.find((l) => l.value === license)?.label || license;

  return (
    <Link
      href="/copyright"
      className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
      title={`Licensed under ${label}. Click to view copyright policy.`}
    >
      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
      {label}
    </Link>
  );
}
