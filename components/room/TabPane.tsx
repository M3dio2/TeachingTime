"use client";

import { isTrackReference, useRoomContext, useTracks, VideoTrack } from "@livekit/components-react";
import { Track } from "livekit-client";
import { NotebookPen } from "lucide-react";
import dynamic from "next/dynamic";
import TextPad from "@/components/board/TextPad";
import Chip from "@/components/ui/Chip";
import { useT } from "@/lib/i18n/client";
import { isFileTab, type TabId } from "@/lib/room/tabs";
import { clearBoard, clearText } from "@/lib/sync/clearLesson";
import { isTeacher } from "@/lib/sync/useTeacherSettings";
import DocPane from "./DocPane";
import { TextFilePane } from "./FileCardPane";
import LinkPane from "./LinkPane";
import QuizPane from "./QuizPane";
import VideoPane from "./VideoPane";
import { PdfPane, PicturePane } from "./FilePanes";
import { cap, type RoomModel } from "./roomModel";

const Whiteboard = dynamic(() => import("@/components/board/Whiteboard"), {
  ssr: false,
  loading: () => <WhiteboardLoading />,
});

function WhiteboardLoading() {
  const t = useT();
  return <p className="p-4 text-ink-muted">{t.stage.loadingWhiteboard}</p>;
}

// The content of one tab. Screen shows the shared screen; Text and Draw are the shared doc.
export default function TabPane({ id, model }: { id: TabId; model: RoomModel }) {
  if (id === "screen") return <ScreenPane model={model} />;
  if (isFileTab(id)) {
    if (id.startsWith("pdf:")) return <PdfPane id={id} model={model} />;
    if (id.startsWith("doc:")) return <DocPane id={id} model={model} />;
    if (id.startsWith("video:")) return <VideoPane id={id} model={model} />;
    if (id.startsWith("link:")) return <LinkPane id={id} model={model} />;
    if (id.startsWith("quiz:")) return <QuizPane id={id} model={model} />;
    if (id.startsWith("txt:")) return <TextFilePane id={id} model={model} />;
    return <PicturePane id={id} model={model} />;
  }
  const teacher = model.role === "teacher";
  const chip = <WhoWrites model={model} />;
  if (id === "text") {
    return <TextTab model={model} chip={chip} />;
  }
  return (
    <Whiteboard
      doc={model.doc}
      editable={model.canEdit}
      chip={chip}
      onClear={teacher ? () => clearBoard(model.doc) : undefined}
    />
  );
}

// "Only you can write" / "Anna can write here" (teacher), "View only" / "You can write here".
function WhoWrites({ model }: { model: RoomModel }) {
  const t = useT();
  const can = model.view.studentCanEdit;
  if (model.role === "teacher") {
    return can ? (
      <Chip tone="ok">{t.stage.canWriteHere(cap(model.otherName))}</Chip>
    ) : (
      <Chip>{t.stage.onlyYouCanWrite}</Chip>
    );
  }
  return can ? <Chip tone="ok">{t.stage.youCanWriteHere}</Chip> : <Chip>{t.stage.viewOnly}</Chip>;
}

function ScreenPane({ model }: { model: RoomModel }) {
  const t = useT();
  const room = useRoomContext();
  const screen = useTracks([Track.Source.ScreenShare])
    .filter((t) => t.participant.isLocal || isTeacher(t.participant))
    .at(-1);
  const mine = screen?.participant.isLocal;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-video p-3 text-surface-2">
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        {screen && isTrackReference(screen) ? (
          <VideoTrack
            trackRef={screen}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <p className="text-sm">{t.stage.waitingForScreen}</p>
        )}
      </div>
      {screen && (
        <div className="flex items-center gap-3 text-sm">
          <span>{mine ? t.stage.youAreSharing : t.stage.theirScreen(screen.participant.name || model.otherName)}</span>
          {mine && (
            <button
              type="button"
              onClick={() => room.localParticipant.setScreenShareEnabled(false).catch(console.error)}
              className="h-8 rounded-md border border-surface-2/45 px-3 text-white hover:bg-surface/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              {t.stage.stopSharing}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TextTab({ model, chip }: { model: RoomModel; chip: React.ReactNode }) {
  const t = useT();
  const teacher = model.role === "teacher";
  return (
    <TextPad
      doc={model.doc}
      editable={model.canEdit}
      chip={
        model.noteSavedAt ? (
          <span className="flex items-center gap-2">
            {chip}
            <span className="hidden items-center gap-1 text-xs text-ink-muted sm:inline-flex" data-testid="note-saved">
              <NotebookPen size={13} aria-hidden />
              {t.plan.savedToNotes}
            </span>
          </span>
        ) : (
          chip
        )
      }
      onClear={teacher ? () => clearText(model.doc) : undefined}
      placeholder={
        teacher
          ? t.stage.textPad.emptyTeacher(cap(model.otherName))
          : model.canEdit
            ? t.stage.textPad.emptyStudentCanWrite
            : t.stage.textPad.emptyStudent
      }
    />
  );
}
