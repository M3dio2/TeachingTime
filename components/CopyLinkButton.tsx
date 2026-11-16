"use client";

import { Link2 } from "lucide-react";
import { useState } from "react";
import Button from "@/components/ui/Button";
import { useT } from "@/lib/i18n/client";

// Copies the student link (/join/<slug>). `label` is the visible text; `name` (optional) makes
// the accessible name say whose link it is ("Copy Anna's student link").
export default function CopyLinkButton({
  slug,
  label,
  name,
  variant = "secondary",
  icon = false,
}: {
  slug: string;
  label?: string;
  name?: string;
  variant?: "secondary" | "ghost";
  icon?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const t = useT();

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/join/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={copy}
      aria-label={name ? t.dashboard.copyNamesLink(name) : undefined}
      className={variant === "ghost" ? "text-ink!" : ""}
    >
      {icon && <Link2 size={16} aria-hidden />}
      {copied ? t.dashboard.copied : (label ?? t.dashboard.copyStudentLink)}
    </Button>
  );
}
