import { type Browser, expect, type Page } from "@playwright/test";

// The only classroom tests may use (AGENTS.md: Playwright only joins the lesson "Test").
export const TEST_CLASSROOM = "Test";

export async function logIn(page: Page) {
  const email = process.env.E2E_TEACHER_EMAIL;
  const password = process.env.E2E_TEACHER_PASSWORD;
  if (!email || !password) {
    throw new Error("Set E2E_TEACHER_EMAIL and E2E_TEACHER_PASSWORD in .env.local (the test teacher account).");
  }
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/dashboard");
  // A fresh test project's account has no name yet: answer the first-visit question once.
  const welcome = page.getByRole("heading", { name: /What should your students call you/ });
  const chip = page.getByRole("button", { name: /^Your name in lessons: / });
  await expect(welcome.or(chip)).toBeVisible({ timeout: 30_000 });
  if (await welcome.isVisible()) {
    await page.getByRole("textbox", { name: "Your name in lessons" }).fill("E2E Teacher");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(chip).toBeVisible({ timeout: 15_000 });
  }
}

// Opens the test teacher's "Test" classroom, adding it first if it doesn't exist yet.
export async function openTestClassroom(page: Page) {
  const card = page.getByRole("link", { name: `Open ${TEST_CLASSROOM}'s classroom` });
  // After leaving a lesson the loading screen can stay a few seconds.
  await expect(page.getByRole("heading", { name: "Your classrooms", exact: true })).toBeVisible({ timeout: 30_000 });
  if (!(await card.count())) {
    await page.getByLabel("Student's name").fill(TEST_CLASSROOM);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(card).toBeVisible();
  }
  // The corner: on a phone-sized window the card's buttons cover its middle.
  await card.click({ position: { x: 8, y: 8 } });
  await page.waitForURL(/\/dashboard\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Files", exact: true })).toBeVisible({ timeout: 30_000 });
}

// Teacher: opens the "Test" classroom, reads its student link and starts the lesson.
// Returns the student's join path (/join/<slug>).
export async function startTestLesson(page: Page, prepare?: (page: Page) => Promise<void>) {
  await logIn(page);
  await openTestClassroom(page);
  await prepare?.(page);
  // The student link sits in a read-only field on the classroom page.
  const link = await page.getByRole("textbox", { name: /'s link$/ }).inputValue();
  await page.getByRole("link", { name: "Start lesson" }).click();
  await page.waitForURL(/\/lesson\/[0-9a-f-]+$/);
  await expect(page.getByRole("region", { name: "Lesson" })).toBeVisible({ timeout: 30_000 });
  return new URL(`http://${link}`).pathname;
}

// Student: a fresh browser context (no login) that joins with the link.
export async function joinAsStudent(
  browser: Browser,
  joinPath: string,
  viewport = { width: 1440, height: 900 },
) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(joinPath);
  await page.getByLabel("Your name").fill("E2E Student");
  await page.getByRole("button", { name: "Join lesson" }).click();
  await expect(page.getByText(/^Following /).first()).toBeVisible({ timeout: 30_000 });
  return page;
}

// A real PDF with `pages` tall pages, each saying "Page n" (pdf.js rebuilds the missing xref).
export function testPdf(pages: number) {
  const objs: string[] = [];
  const kids = Array.from({ length: pages }, (_, i) => `${4 + i * 2} 0 R`).join(" ");
  objs.push("<< /Type /Catalog /Pages 2 0 R >>");
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages} >>`);
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  for (let i = 0; i < pages; i++) {
    const text = `BT /F1 64 Tf 72 900 Td (Page ${i + 1}) Tj ET`;
    objs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 1008] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`,
    );
    objs.push(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
  }
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

// A small PNG (16 × 12, brown).
export const TEST_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAAAFUlEQVR4nGPojrMhCTGMahjVgB0BAKrQ28HOz2M8AAAAAElFTkSuQmCC",
  "base64",
);

// Classroom: upload a file and wait for its row.
export async function uploadToClassroom(page: Page, name: string, mimeType: string, buffer: Buffer) {
  await page.locator('input[type="file"]').setInputFiles({ name, mimeType, buffer });
  await expect(page.getByRole("listitem").filter({ hasText: name }).first()).toBeVisible({ timeout: 30_000 });
}

// Classroom: delete every file whose name starts with "e2e-" (leftovers of earlier runs).
export async function deleteTestFiles(page: Page) {
  page.on("dialog", (d) => d.accept().catch(() => {}));
  const leftovers = page.getByRole("listitem").filter({ hasText: /e2e-/ });
  while (await leftovers.count()) {
    const before = await leftovers.count();
    await leftovers.first().getByRole("button", { name: "Delete" }).click();
    await expect.poll(() => leftovers.count(), { timeout: 30_000 }).toBeLessThan(before);
  }
}

// A WAV file: `seconds` of a quiet 440 Hz tone (8 kHz, mono, 16 bit).
export function testWav(seconds: number) {
  const rate = 8000;
  const samples = rate * seconds;
  const data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 3000), i * 2);
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); // PCM
  head.writeUInt16LE(1, 22); // mono
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

// A real Word file (.docx): one paragraph per entry, `pages` page breaks apart.
export async function testDocx(paragraphs: string[], pages = 1) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const per = Math.ceil(paragraphs.length / pages);
  const body = paragraphs
    .map((p, i) => {
      const brk = i > 0 && i % per === 0 ? '<w:r><w:br w:type="page"/></w:r>' : "";
      return `<w:p>${brk}<w:r><w:t xml:space="preserve">${esc(p)}</w:t></w:r></w:p>`;
    })
    .join("");
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}
