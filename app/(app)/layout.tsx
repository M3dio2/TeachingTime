import { Suspense } from "react";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";

// Every page of the app itself (login, dashboard, lesson, join) in the teacher's or student's
// language (I1). The start page and the legal pages sit outside this group and stay English.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense>
      <WithLocale>{children}</WithLocale>
    </Suspense>
  );
}

async function WithLocale({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale={await getLocale()}>{children}</I18nProvider>;
}
