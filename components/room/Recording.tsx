"use client";

import { useLocalParticipant, useRemoteParticipants, useRoomContext } from "@livekit/components-react";
import { type Participant, type RemoteParticipant, RoomEvent, Track } from "livekit-client";
import { Circle, Download, Square, Trash2, X } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";
import {
  canRecord,
  canRecordScreen,
  captureTab,
  cleanRecState,
  cleanReply,
  download,
  forgetRecording,
  leftoverRecordings,
  RECORD_ALL,
  type Recording,
  type RecordWhat,
  type RecReply,
  type RecState,
  REC_TOPIC,
  recordingName,
  recordsSomething,
  startRecording,
} from "@/lib/room/recorder";
import { isTeacher } from "@/lib/sync/useTeacherSettings";
import { DropboxMark, GoogleDriveMark } from "@/components/cloud/CloudSettings";
import { saveToDropbox } from "@/lib/cloud/dropbox";
import { cachedGoogleToken, googleToken, saveToDrive } from "@/lib/cloud/google";
import { DROPBOX_CONFIGURED, GOOGLE_CONFIGURED, readCloud, useCloud } from "@/lib/cloud/store";
import { buttonClass } from "@/components/ui/Button";
import type { Role } from "./roomModel";

// R1: recording the lesson in the teacher's browser, only after the student agreed.
// The teacher's attribute `rec` says "asking" or "on" (both sides show it); the student answers
// with a data message (yes / no). Only the teacher stops it; stopping downloads the file at once.

const SECONDARY = buttonClass("secondary", "md", "h-11 px-4");
const REC_PRIMARY = buttonClass("primary", "md", "h-11 px-4 font-semibold !bg-danger hover:!bg-danger/90");

const TOAST_BUTTON =
  "inline-flex h-9 items-center gap-1.5 rounded-md bg-white/15 px-3 font-semibold hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none";

type Phase =
  | { phase: "idle" }
  | { phase: "choosing" }
  | { phase: "asking"; id: string; what: RecordWhat; tab: MediaStream | null }
  | { phase: "on"; id: string; what: RecordWhat; since: number; recording: Recording }
  | { phase: "saving" };

type Ctx = { role: Role; available: boolean; open: () => void; phase: Phase["phase"]; since: number | null };
const RecordingContext = createContext<Ctx>({ role: "student", available: false, open: () => {}, phase: "idle", since: null });
export const useRecording = () => useContext(RecordingContext);

export function RecordingProvider({ role, children }: { role: Role; children: ReactNode }) {
  return role === "teacher" ? <TeacherRecording>{children}</TeacherRecording> : <StudentRecording>{children}</StudentRecording>;
}

const trackOf = (p: Participant | undefined, source: Track.Source) =>
  p?.getTrackPublication(source)?.track?.mediaStreamTrack;

// ---------------------------------------------------------------- teacher

function TeacherRecording({ children }: { children: ReactNode }) {
  const t = useT().room.rec;
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const student = useRemoteParticipants()[0] as RemoteParticipant | undefined;
  const studentName = student?.name || student?.identity || "";
  const [phase, setPhaseState] = useState<Phase>({ phase: "idle" });
  const [note, setNote] = useState<string | null>(null);
  const [finished, setFinished] = useState<{ file: File; why?: string } | null>(null);
  const [leftovers, setLeftovers] = useState<File[]>([]);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const available = canRecord();
  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const publish = useCallback(
    (state: RecState | null) => localParticipant.setAttributes({ rec: state ? JSON.stringify(state) : "" }).catch(console.error),
    [localParticipant],
  );

  // A recording left in the browser's storage (the tab closed while recording): offer it.
  useEffect(() => {
    if (available) leftoverRecordings().then(setLeftovers).catch(() => {});
  }, [available]);

  const stop = useCallback(async (why?: string) => {
    const p = phaseRef.current;
    if (p.phase !== "on") return;
    setPhase({ phase: "saving" });
    void publish(null);
    const file = await p.recording.stop();
    // C1: to the cloud chosen in Settings, else downloaded (AfterRecording).
    setFinished({ file, why });
    // Kept in the browser's storage a little longer, in case saving was cancelled.
    setTimeout(() => void forgetRecording(file.name), 10 * 60_000);
    setPhase({ phase: "idle" });
  }, [publish, setPhase]);

  const cancelAsking = useCallback(() => {
    const p = phaseRef.current;
    if (p.phase !== "asking") return;
    p.tab?.getTracks().forEach((tr) => tr.stop());
    void publish(null);
    setPhase({ phase: "idle" });
  }, [publish, setPhase]);

  // The student's answers.
  useEffect(() => {
    const onData = async (payload: Uint8Array, from?: RemoteParticipant, _k?: unknown, topic?: string) => {
      if (topic !== REC_TOPIC || !from || isTeacher(from)) return;
      const reply: RecReply | null = cleanReply(payload);
      const p = phaseRef.current;
      if (!reply) return;
      // Only the teacher stops a recording (the student's pill has no Stop button; an old or
      // tampered client's "stop" is ignored).
      if (reply.answer === "stop") return;
      if (p.phase !== "asking" || p.id !== reply.id) return;
      if (reply.answer === "no") {
        p.tab?.getTracks().forEach((tr) => tr.stop());
        void publish(null);
        setNote(t.studentSaidNo(from.name || from.identity));
        setPhase({ phase: "idle" });
        return;
      }
      if (reply.answer === "yes") {
        const started = new Date();
        try {
          const recording = await startRecording(
            p.what,
            {
              myMic: trackOf(localParticipant, Track.Source.Microphone),
              theirMic: trackOf(from, Track.Source.Microphone),
              myCamera: trackOf(localParticipant, Track.Source.Camera),
              theirCamera: trackOf(from, Track.Source.Camera),
              myName: localParticipant.name || "Teacher",
              theirName: from.name || from.identity,
              stage: () => document.querySelector("[data-record='stage']")?.getBoundingClientRect() ?? null,
            },
            p.tab,
            (ext) => recordingName(from.name || from.identity, started, ext),
          );
          recording.onEnded(() => void stop());
          const since = started.getTime();
          setPhase({ phase: "on", id: p.id, what: p.what, since, recording });
          void publish({ state: "on", id: p.id, what: p.what, since });
        } catch (e) {
          console.error("recording:", e);
          p.tab?.getTracks().forEach((tr) => tr.stop());
          void publish(null);
          setNote(t.failed);
          setPhase({ phase: "idle" });
        }
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, localParticipant, publish, setPhase, stop, t]);

  // Leaving the lesson while recording: save what there is. The student can't stop it herself,
  // but leaving the lesson stops it too.
  useEffect(() => {
    const onLeave = () => void stop();
    const onStudentLeft = (p: RemoteParticipant) => {
      if (!isTeacher(p) && phaseRef.current.phase === "on") void stop(t.studentLeftStopped(p.name || p.identity));
    };
    room.on(RoomEvent.Disconnected, onLeave);
    room.on(RoomEvent.ParticipantDisconnected, onStudentLeft);
    return () => {
      room.off(RoomEvent.Disconnected, onLeave);
      room.off(RoomEvent.ParticipantDisconnected, onStudentLeft);
    };
  }, [room, stop, t]);
  useEffect(() => {
    if (phase.phase !== "on" && phase.phase !== "asking") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase.phase]);

  const ask = async (what: RecordWhat) => {
    if (!student) return;
    let tab: MediaStream | null = null;
    if (what.screen) {
      try {
        tab = await captureTab(what.voices); // the browser asks which tab (in this click)
      } catch {
        setPhase({ phase: "choosing" });
        setNote(t.screenRefused);
        return;
      }
    }
    const id = crypto.randomUUID();
    setPhase({ phase: "asking", id, what, tab });
    void publish({ state: "asking", id, what });
  };

  const ctx: Ctx = {
    role: "teacher",
    available,
    open: () => {
      if (phaseRef.current.phase === "on") void stop();
      else if (phaseRef.current.phase === "idle") setPhase({ phase: "choosing" });
    },
    phase: phase.phase,
    since: phase.phase === "on" ? phase.since : null,
  };

  return (
    <RecordingContext.Provider value={ctx}>
      {children}
      {phase.phase === "choosing" && (
        <ChooseDialog
          studentName={studentName}
          canAsk={!!student}
          onAsk={ask}
          onClose={() => setPhase({ phase: "idle" })}
          note={note}
        />
      )}
      {phase.phase === "asking" && (
        <Modal label={t.askingTitle}>
          <p className="text-[15px]">{t.asking(studentName)}</p>
          <div className="flex justify-end">
            <button type="button" onClick={cancelAsking} className={SECONDARY}>
              {t.cancel}
            </button>
          </div>
        </Modal>
      )}
      {phase.phase === "on" && <RecPill since={phase.since} label={t.stop} onStop={() => void stop()} />}
      {note && phase.phase !== "choosing" && !finished && <Toast onClose={() => setNote(null)}>{note}</Toast>}
      {finished && (
        <AfterRecording key={finished.file.name} file={finished.file} why={finished.why} onClose={() => setFinished(null)} />
      )}
      {leftovers.length > 0 && phase.phase === "idle" && (
        <Leftovers
          files={leftovers}
          onDone={(name) => {
            void forgetRecording(name);
            setLeftovers((l) => l.filter((f) => f.name !== name));
          }}
        />
      )}
    </RecordingContext.Provider>
  );
}

function ChooseDialog({
  studentName,
  canAsk,
  onAsk,
  onClose,
  note,
}: {
  studentName: string;
  canAsk: boolean;
  onAsk: (what: RecordWhat) => void;
  onClose: () => void;
  note: string | null;
}) {
  const t = useT().room.rec;
  const screenOk = canRecordScreen();
  const [what, setWhat] = useState<RecordWhat>({ ...RECORD_ALL, screen: screenOk });
  const box = (key: keyof RecordWhat, label: string, hint: string, disabled = false) => (
    <label className={`flex items-start gap-3 rounded-md px-1 py-2 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={what[key]}
        disabled={disabled}
        onChange={(e) => setWhat({ ...what, [key]: e.target.checked })}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
      />
      <span className="flex flex-col">
        <span className="text-[15px] font-medium">{label}</span>
        <span className="text-[13px] text-ink-muted">{hint}</span>
      </span>
    </label>
  );
  return (
    <Modal label={t.title} onClose={onClose}>
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold tracking-[0.04em] text-ink-muted uppercase">{t.whatToRecord}</span>
        {box("voices", t.voices, t.voicesHint)}
        {box("cameras", t.cameras, t.camerasHint)}
        {box("screen", t.screen, screenOk ? t.screenHint : t.screenNotHere, !screenOk)}
      </div>
      <p className="rounded-md bg-surface-2 px-3 py-2.5 text-[13px] leading-snug text-ink-muted">{t.privacy(studentName || t.yourStudent)}</p>
      {note && (
        <p role="alert" className="text-[13px] text-danger">
          {note}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {!canAsk && <span className="mr-auto text-[13px] text-ink-muted">{t.needsStudent}</span>}
        <button type="button" onClick={onClose} className={SECONDARY}>
          {t.cancel}
        </button>
        <button
          type="button"
          disabled={!canAsk || !recordsSomething(what)}
          onClick={() => onAsk(what)}
          className={REC_PRIMARY}
        >
          <Circle size={14} aria-hidden className="fill-current" />
          {t.askAndRecord(studentName || t.yourStudent)}
        </button>
      </div>
    </Modal>
  );
}

function Leftovers({ files, onDone }: { files: File[]; onDone: (name: string) => void }) {
  const t = useT().room.rec;
  const f = files[0];
  return (
    <Toast>
      <span className="flex flex-col gap-2">
        <span>{t.leftover(f.name)}</span>
        <span className="flex gap-2">
          <button
            type="button"
            className={TOAST_BUTTON}
            onClick={() => {
              download(f);
              onDone(f.name);
            }}
          >
            <Download size={15} aria-hidden />
            {t.download}
          </button>
          <button type="button" className={TOAST_BUTTON} onClick={() => onDone(f.name)}>
            <Trash2 size={15} aria-hidden />
            {t.discard}
          </button>
        </span>
      </span>
    </Toast>
  );
}

// ---------------------------------------------------------------- student

function StudentRecording({ children }: { children: ReactNode }) {
  const t = useT().room.rec;
  const room = useRoomContext();
  const remotes = useRemoteParticipants();
  const teacher = remotes.find((p) => isTeacher(p));
  const [state, setRec] = useState<RecState | null>(null);
  const [answered, setAnswered] = useState<string | null>(null);

  useEffect(() => {
    if (!teacher) return;
    const read = () => setRec(cleanRecState(teacher.attributes.rec));
    queueMicrotask(read);
    const onChange = (_changed: Record<string, string>, p: Participant) => {
      if (p.identity === teacher.identity) read();
    };
    room.on(RoomEvent.ParticipantAttributesChanged, onChange);
    return () => {
      room.off(RoomEvent.ParticipantAttributesChanged, onChange);
    };
  }, [room, teacher]);

  const rec = teacher ? state : null; // the teacher left: nothing is recorded
  const reply = (id: string, answer: RecReply["answer"]) => {
    setAnswered(id);
    if (!teacher) return;
    void room.localParticipant
      .publishData(new TextEncoder().encode(JSON.stringify({ id, answer })), {
        reliable: true,
        topic: REC_TOPIC,
        destinationIdentities: [teacher.identity],
      })
      .catch(console.error);
  };

  const teacherName = teacher?.name || t.yourTeacher;
  const ctx: Ctx = { role: "student", available: false, open: () => {}, phase: rec?.state === "on" ? "on" : "idle", since: rec?.state === "on" ? rec.since : null };
  const parts = rec ? [rec.what.voices && t.voices, rec.what.cameras && t.cameras, rec.what.screen && t.screen].filter(Boolean).join(", ") : "";

  return (
    <RecordingContext.Provider value={ctx}>
      {children}
      {rec?.state === "asking" && answered !== rec.id && (
        <Modal label={t.consentTitle}>
          <p className="text-[15px] leading-snug">{t.consent(teacherName)}</p>
          <p className="rounded-md bg-surface-2 px-3 py-2.5 text-[14px]">
            <span className="font-semibold">{t.whatIsRecorded}</span> {parts}
          </p>
          <p className="text-[13px] leading-snug text-ink-muted">{t.consentHint(teacherName)}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={SECONDARY} onClick={() => reply(rec.id, "no")}>
              {t.dontAllow}
            </button>
            <button type="button" className={REC_PRIMARY} onClick={() => reply(rec.id, "yes")}>
              {t.allow}
            </button>
          </div>
        </Modal>
      )}
      {rec?.state === "on" && <RecPill since={rec.since} />}
    </RecordingContext.Provider>
  );
}

// ---------------------------------------------------------------- shared bits

// "● REC 12:03  Stop", above the control bar for both, so nobody forgets it's on.
// Only the teacher's pill has Stop.
function RecPill({ since, label, onStop }: { since: number; label?: string; onStop?: () => void }) {
  const t = useT().room.rec;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const time = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return (
    <div
      role="status"
      aria-label={t.recordingNow}
      data-testid="rec-pill"
      className="fixed bottom-[84px] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-video py-1 pr-1 pl-3 text-sm font-semibold text-white shadow-soft"
    >
      <span aria-hidden className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
      <span>{t.rec}</span>
      <span className={`tabular-nums ${onStop ? "" : "pr-2"}`}>{time}</span>
      {onStop && (
      <button
        type="button"
        onClick={onStop}
        className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-full bg-white/15 px-3 hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
      >
        <Square size={12} aria-hidden className="fill-current" />
        {label}
      </button>
      )}
    </div>
  );
}

function Modal({ label, onClose, children }: { label: string; onClose?: () => void; children: ReactNode }) {
  const t = useT();
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-video/45 p-3 sm:items-center">
      <div role="dialog" aria-modal="true" aria-label={label} className="flex w-full max-w-[460px] flex-col gap-3 rounded-panel bg-surface p-5 text-ink shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[18px] font-semibold">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-danger" />
            {label}
          </h2>
          {onClose && (
            <button type="button" aria-label={t.common.close} onClick={onClose} className="-m-1 rounded-md p-1 text-ink-muted hover:text-ink">
              <X size={18} aria-hidden />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ children, onClose, stay = false }: { children: ReactNode; onClose?: () => void; stay?: boolean }) {
  const t = useT();
  useEffect(() => {
    if (!onClose || stay) return;
    const id = setTimeout(onClose, 8000);
    return () => clearTimeout(id);
  }, [onClose, stay]);
  return (
    <div role="status" className="fixed bottom-[84px] left-1/2 z-40 flex max-w-[min(92vw,480px)] -translate-x-1/2 items-start gap-3 rounded-panel bg-video px-4 py-3 text-sm text-white shadow-soft">
      <div className="min-w-0 flex-1">{children}</div>
      {onClose && (
        <button type="button" aria-label={t.common.close} onClick={onClose} className="text-white/70 hover:text-white">
          <X size={16} aria-hidden />
        </button>
      )}
    </div>
  );
}

// C1: where a finished recording goes. Dropbox (and Google with a token from this tab) save
// by themselves; otherwise it's downloaded, with buttons to save it to a connected cloud too.
// A failed cloud upload falls back to the download.
type After =
  | { phase: "saving"; where: "google" | "dropbox"; percent: number }
  | { phase: "saved"; where: "google" | "dropbox"; path: string }
  | { phase: "downloaded"; failed?: "google" | "dropbox" }
  | { phase: "needsClick" }; // Google without a token: one click (Google's window needs it)

function AfterRecording({ file, why, onClose }: { file: File; why?: string; onClose: () => void }) {
  const t = useT();
  const tc = t.cloud;
  const cloud = useCloud();
  const [state, setState] = useState<After>(() => {
    const c = readCloud();
    if (c.saveTo === "dropbox" && c.dropbox) return { phase: "saving", where: "dropbox", percent: 0 };
    if (c.saveTo === "google" && c.google) return cachedGoogleToken() ? { phase: "saving", where: "google", percent: 0 } : { phase: "needsClick" };
    return { phase: "downloaded" };
  });
  const name = (w: "google" | "dropbox") => (w === "google" ? tc.google : tc.dropbox);

  const save = useCallback(
    async (where: "google" | "dropbox", token?: string) => {
      const onProgress = (share: number) => setState({ phase: "saving", where, percent: Math.round(share * 100) });
      try {
        const path = where === "dropbox" ? await saveToDropbox(file, onProgress) : await saveToDrive(file, token ?? (await googleToken()), onProgress);
        setState({ phase: "saved", where, path });
        void forgetRecording(file.name);
      } catch (e) {
        console.error("save recording:", where, e);
        download(file);
        setState({ phase: "downloaded", failed: where });
      }
    },
    [file],
  );

  // The first state decides: start saving, or download right away.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const where = state.phase === "saving" ? state.where : null;
    if (where) queueMicrotask(() => void save(where, where === "google" ? (cachedGoogleToken() ?? undefined) : undefined));
    else if (state.phase === "downloaded") download(file);
  }, [state, save, file]);

  const prefix = why ? `${why} ` : "";
  const extra = (
    <span className="mt-2 flex flex-wrap gap-2">
      {GOOGLE_CONFIGURED && cloud.google && (
        <button type="button" className={TOAST_BUTTON} onClick={() => void save("google")}>
          <GoogleDriveMark size={15} />
          {tc.saveGoogle}
        </button>
      )}
      {DROPBOX_CONFIGURED && cloud.dropbox && (
        <button type="button" className={TOAST_BUTTON} onClick={() => void save("dropbox")}>
          <DropboxMark size={15} />
          {tc.saveDropbox}
        </button>
      )}
    </span>
  );

  return (
    <Toast onClose={onClose} stay={state.phase !== "saved" && !(state.phase === "downloaded" && !cloud.google && !cloud.dropbox)}>
      {state.phase === "saving" && (
        <span data-testid="rec-saving">
          {prefix}
          {tc.savingTo(name(state.where), state.percent)}
        </span>
      )}
      {state.phase === "saved" && (
        <span>
          {prefix}
          {tc.savedTo(name(state.where), state.path)}
        </span>
      )}
      {state.phase === "downloaded" && (
        <span className="flex flex-col">
          <span>
            {prefix}
            {state.failed ? tc.saveFailed(name(state.failed)) : t.room.rec.saved(file.name)}
          </span>
          {extra}
        </span>
      )}
      {state.phase === "needsClick" && (
        <span className="flex flex-col">
          <span>
            {prefix}
            {file.name}
          </span>
          <span className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={TOAST_BUTTON} onClick={() => void save("google")}>
              <GoogleDriveMark size={15} />
              {tc.saveGoogle}
            </button>
            <button
              type="button"
              className={TOAST_BUTTON}
              onClick={() => {
                download(file);
                setState({ phase: "downloaded" });
              }}
            >
              <Download size={15} aria-hidden />
              {t.room.rec.download}
            </button>
          </span>
        </span>
      )}
    </Toast>
  );
}

// The Record button for the control bar (desktop) and the phone's lesson sheet.
export function RecordButton({ className = "lk-button", iconOnly = false, iconSize = 16 }: { className?: string; iconOnly?: boolean; iconSize?: number }) {
  const t = useT().room.rec;
  const { role, available, open, phase } = useRecording();
  if (role !== "teacher" || !available) return null;
  const on = phase === "on";
  const label = on ? t.stopRecording : t.record;
  return (
    <button
      type="button"
      onClick={open}
      disabled={phase === "asking" || phase === "saving"}
      aria-label={iconOnly ? label : undefined}
      title={label}
      aria-pressed={on}
      className={className}
    >
      {on ? <Square size={iconSize - 2} aria-hidden className="fill-current text-danger" /> : <Circle size={iconSize} aria-hidden className="text-danger" />}
      {!iconOnly && label}
    </button>
  );
}
