"use client";

import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import AudioBar from "./AudioBar";
import { BigCameras, SpotlightCameras } from "./CameraTiles";
import { cap, type RoomModel } from "./roomModel";

// Just talk: the teacher folded the tabs away for both; the two cameras fill the room.
// "Show the tabs" brings back the same tabs. Tablet-sized windows (`spotlight`): the other
// person big, your own camera small and draggable.
export default function JustTalk({
  model,
  phone = false,
  spotlight = false,
}: {
  model: RoomModel;
  phone?: boolean;
  spotlight?: boolean;
}) {
  const teacher = model.role === "teacher";
  const count = model.view.tabs.length;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex min-h-10 flex-wrap items-center justify-center gap-3">
        <Chip tone="marker" className="text-sm">
          {teacher
            ? "Just talking. The tabs are folded for both of you."
            : `${cap(model.otherName)} folded the tabs. Just talking for now.`}
        </Chip>
        {teacher && (
          <Button size="sm" onClick={() => model.actions?.setJustTalk(false)} className={phone ? "h-10" : ""}>
            {count === 1 ? "Show the tab" : "Show the 2 tabs"}
          </Button>
        )}
      </div>
      {model.view.audio && (
        <div className="overflow-hidden rounded-panel border border-line">
          <AudioBar model={model} phone={phone} />
        </div>
      )}
      {spotlight ? (
        <SpotlightCameras onMute={model.onMute} />
      ) : (
        <BigCameras stacked={phone} onMute={model.onMute} />
      )}
    </div>
  );
}
