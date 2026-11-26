"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { DOCX_TYPE, IMAGE_TYPES, MAX_BYTES, TEXT_TYPES, VIDEO_TYPES } from "@/lib/files/uploadResource";
import { pickFromDropbox } from "@/lib/cloud/dropbox";
import { pickFromDrive } from "@/lib/cloud/google";
import { DROPBOX_CONFIGURED, GOOGLE_CONFIGURED } from "@/lib/cloud/store";
import { useLocale, useT } from "@/lib/i18n/client";
import { DropboxMark, GoogleDriveMark } from "./CloudSettings";

const OTHER = [...Object.values(VIDEO_TYPES), ...Object.values(TEXT_TYPES)] ;
const DRIVE_TYPES = [...new Set([...IMAGE_TYPES, "application/pdf", DOCX_TYPE, "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/ogg", "audio/aac", "audio/flac", "audio/webm", ...OTHER])];
const DROPBOX_EXTENSIONS = [
  ...[".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".docx", ".mp3", ".m4a", ".aac", ".wav", ".ogg", ".oga", ".opus", ".flac", ".weba"],
  ...[...Object.keys(VIDEO_TYPES), ...Object.keys(TEXT_TYPES)].map((e) => `.${e}`),
];

// C1: "From Google Drive" / "From Dropbox" next to "Upload files". The chosen files are fetched
// in the browser and go through the same checks and upload as files from the computer.
export default function CloudPick({
  upload,
  busy,
  setBusy,
  setError,
}: {
  upload: (files: File[]) => Promise<void>;
  busy: string;
  setBusy: (s: string) => void;
  setError: (s: string) => void;
}) {
  const t = useT().cloud;
  const locale = useLocale();
  const [working, setWorking] = useState(false);
  if (!GOOGLE_CONFIGURED && !DROPBOX_CONFIGURED) return null;

  const from = async (where: string, pick: () => Promise<File[]>) => {
    setError("");
    setWorking(true);
    try {
      const files = await pick();
      if (files.length) {
        setBusy(t.fetching);
        await upload(files);
      }
    } catch (e) {
      console.error(where, e);
      setBusy("");
      setError(t.fetchFailed(where));
    } finally {
      setWorking(false);
    }
  };

  const cls = buttonClass("secondary", "md", "h-11 flex-1 whitespace-nowrap px-2.5 font-semibold md:h-10 md:flex-none md:px-3.5");
  return (
    <>
      {GOOGLE_CONFIGURED && (
        <button
          type="button"
          className={cls}
          disabled={working || !!busy}
          onClick={() => from(t.google, () => pickFromDrive(DRIVE_TYPES, locale))}
        >
          <GoogleDriveMark size={17} />
          <span className="md:hidden">{t.google}</span>
          <span className="hidden md:inline">{t.fromGoogle}</span>
        </button>
      )}
      {DROPBOX_CONFIGURED && (
        <button
          type="button"
          className={cls}
          disabled={working || !!busy}
          onClick={() => from(t.dropbox, () => pickFromDropbox(DROPBOX_EXTENSIONS, MAX_BYTES))}
        >
          <DropboxMark size={17} />
          <span className="md:hidden">{t.dropbox}</span>
          <span className="hidden md:inline">{t.fromDropbox}</span>
        </button>
      )}
    </>
  );
}
