"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";

export default function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("secondary", "sm", "h-9 gap-1.5 px-3 print:hidden")}>
      <Printer size={15} aria-hidden />
      {label}
    </button>
  );
}
