import { createAdminClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const URL_SECONDS = 5 * 60;

// A classroom file for a lesson (L2a tabs, A1 audio): { slug, id } → { name, kind, url }.
// Students have no login, so the invite slug is the key, as for the token route. The file must
// belong to the lesson behind that slug (student lessons only; quick calls have no files).
// The signed URL is short-lived: the browser downloads the file once and keeps it in memory.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { slug, id } = body as { slug?: unknown; id?: unknown };
  if (typeof slug !== "string" || !/^[a-z0-9]{6,40}$/i.test(slug) || typeof id !== "string" || !UUID.test(id)) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: lesson } = await admin
    .from("lessons")
    .select("id")
    .eq("invite_slug", slug)
    .eq("kind", "student")
    .maybeSingle();
  const { data: file } = lesson
    ? await admin
        .from("resources")
        .select("name, kind, path")
        .eq("id", id)
        .eq("lesson_id", lesson.id)
        .maybeSingle()
    : { data: null };
  if (!file) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  const { data: signed } = await admin.storage.from("resources").createSignedUrl(file.path, URL_SECONDS);
  if (!signed) {
    return Response.json({ error: "Could not open the file" }, { status: 500 });
  }
  return Response.json(
    { name: file.name, kind: file.kind, url: signed.signedUrl },
    { headers: { "Cache-Control": "no-store" } },
  );
}
