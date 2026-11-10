"use client";

import { isTrackReference, useRoomContext, useTracks, VideoTrack } from "@livekit/components-react";
import { Track } from "livekit-client";
import dynamic from "next/dynamic";
import TextPad from "@/components/board/TextPad";
import Chip from "@/components/ui/Chip";
import type { TabId } from "@/lib/room/tabs";
import { clearBoard, clearText } from "@/lib/sync/clearLesson";
import { cap, type RoomModel } from "./roomModel";

const Whiteboard = dynamic(() => import("@/components/board/Whiteboard"), {
  ssr: false,
  loading: () => <p className="p-4 text-ink-muted">Loading whiteboard…</p>,
});

// The content of one tab. Screen shows the shared screen; Text and Draw are the shared doc.
export default function TabPane({ id, model }: { id: TabId; model: RoomModel }) {
  if (id === "screen") return <ScreenPane model={model} />;
  const teacher = model.role === "teacher";
  const chip = <WhoWrites model={model} />;
  if (id === "text") {
    return (
      <TextPad
        doc={model.doc}
        editable={model.canEdit}
        chip={chip}
        onClear={teacher ? () => clearText(model.doc) : undefined}
      />
    );
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
  const can = model.view.studentCanEdit;
  if (model.role === "teacher") {
    return can ? <Chip tone="ok">{cap(model.otherName)} can write here</Chip> : <Chip>Only you can write</Chip>;
  }
  return can ? <Chip tone="ok">You can write here</Chip> : <Chip>View only</Chip>;
}

function ScreenPane({ model }: { model: RoomModel }) {
  const room = useRoomContext();
  const screen = useTracks([Track.Source.ScreenShare]).at(-1);
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
          <p className="text-sm">Waiting for the screen…</p>
        )}
      </div>
      {screen && (
        <div className="flex items-center gap-3 text-sm">
          <span>{mine ? "You're sharing your screen" : `${screen.participant.name || model.otherName}'s screen`}</span>
          {mine && (
            <button
              type="button"
              onClick={() => room.localParticipant.setScreenShareEnabled(false).catch(console.error)}
              className="h-8 rounded-md border border-surface-2/45 px-3 text-white hover:bg-surface/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              Stop sharing
            </button>
          )}
        </div>
      )}
    </div>
  );
}
