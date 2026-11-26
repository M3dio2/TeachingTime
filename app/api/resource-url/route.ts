import { clientIp, LIMITS, overMemoryLimit, sharedLimit, tooMany } from "@/lib/rateLimit";
import { createAdminClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const URL_SECONDS = 5 * 60;

// A classroom file for a lesson (L2a tabs, A1 audio): { slug, id } → { name, kind, url }.
// Students have no login, so the invite slug is the key, as for the token route. The file must
// belong to the lesson behind that slug (student lessons only; quick calls have no files).
// The signed URL is short-lived: the browser downloads the file once and keeps it in memory.
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (overMemoryLimit(LIMITS.resource, ip)) return tooMany();

  const body = await request.json().catch(() => ({}));
  const { slug, id } = body as { slug?: unknown; id?: unknown };
  if (typeof slug !== "string" || !/^[a-z0-9]{6,40}$/i.test(slug) || typeof id !== "string" || !UUID.test(id)) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const [withinShared, { data: lesson }] = await Promise.all([
    sharedLimit(LIMITS.resource, ip),
    admin.from("lessons").select("id, teacher_id").eq("invite_slug", slug).eq("kind", "student").maybeSingle(),
  ]);
  if (!withinShared) return tooMany();
  const { data: row } = lesson
    ? await admin
        .from("resources")
        .select("name, kind, path, url, lesson_id, teacher_id, in_library, all_classrooms")
        .eq("id", id)
        .maybeSingle()
    : { data: null };
  // The lesson's own file, or a Library file (0019) of the same teacher that is in all her
  // Classrooms or was added to this one.
  let file = row && lesson && row.lesson_id === lesson.id ? row : null;
  if (row && lesson && !file && row.in_library && row.teacher_id === lesson.teacher_id) {
    const inThis =
      row.all_classrooms ||
      Boolean(
        (await admin.from("resource_classrooms").select("lesson_id").eq("resource_id", id).eq("lesson_id", lesson.id).maybeSingle()).data,
      );
    if (inThis) file = row;
  }
  if (!file) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  // A link (G2): nothing stored, the address is the link itself.
  if (file.kind === "link") {
    return Response.json({ name: file.name, kind: file.kind, url: file.url }, { headers: { "Cache-Control": "no-store" } });
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
