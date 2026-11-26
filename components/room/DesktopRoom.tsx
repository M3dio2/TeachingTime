"use client";

import { useRef, useState } from "react";
import Handle from "@/components/ui/Handle";
import { useT } from "@/lib/i18n/client";
import { useLandscapeShown } from "@/lib/room/presenting";
import { useStored, useWindowWidth } from "@/lib/useStored";
import { CameraColumn, CameraRow } from "./CameraTiles";
import { FilesPanel, FilesStrip, type RoomFile } from "./FilesPanel";
import JustTalk from "./JustTalk";
import type { RoomModel } from "./roomModel";
import Stage from "./Stage";

const clamp = (v: number, lo: number, hi: number) => Math.round(Math.max(lo, Math.min(hi, v)));
const CAMERAS = { min: 160, max: 360 };
const FILES = { min: 220, max: 400, normal: 272 };
const CAMERA_ROW_HEIGHT = 128;

// Desktop, 768 px and wider (docs/design/HANDOFF.md, "Sizes and resizing"):
// camera column | stage | the student's files (teacher, student lessons).
// - 1280+: column 240 px, files open 272 px
// - 1024–1279: column 200 px, files folded
// - 768–1023: no column; the cameras sit in a row above the stage, like on a phone (tester
//   feedback replaced the floating cameras of the design), files folded
// Widths and "folded" are personal and remembered in this browser; until the files panel is
// folded or unfolded by hand, the window width decides.
export default function DesktopRoom({ model }: { model: RoomModel }) {
  const t = useT();
  const w = useWindowWidth();
  const row = useRef<HTMLDivElement>(null);
  const [camerasW, setCamerasW] = useStored<number | null>("room-cameras-width", null);
  const [filesW, setFilesW] = useStored("room-files-width", FILES.normal);
  const [foldedByHand, setFolded] = useStored<boolean | null>("room-files-folded", null);
  const [dragging, setDragging] = useState<RoomFile | null>(null); // a file dragged from the panel
  const landscape = useLandscapeShown();
  const [unfoldedFor, setUnfoldedFor] = useState<"presenting" | null>(null);
  // The presentation closed: the next one folds the files again.
  if (!landscape && unfoldedFor) setUnfoldedFor(null);

  if (model.view.justTalk) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-2">
        <JustTalk model={model} spotlight={w < 1024} />
      </div>
    );
  }

  const showColumn = w >= 1024;
  const columnW = clamp(camerasW ?? (w >= 1280 ? 240 : 200), CAMERAS.min, CAMERAS.max);
  // A landscape PDF (slides) on screen folds the files away for the stage, until she unfolds
  // them by hand during that presentation (DesktopRoom only: phones have no files column).
  const presenting = landscape && unfoldedFor !== "presenting";
  const folded = presenting || (foldedByHand ?? w < 1280);
  const files = model.files;
  const edge = (side: "left" | "right") => row.current?.getBoundingClientRect()[side] ?? 0;

  const main = (
    <div ref={row} className={`flex min-h-0 flex-1 ${showColumn ? "p-2" : "px-2 pb-2"}`}>
      {showColumn && (
        <>
          <CameraColumn width={columnW} onMute={model.onMute} />
          <Handle
            label={t.room.resizeCameras}
            onDrag={(x) => setCamerasW(clamp(x - edge("left") - 8, CAMERAS.min, CAMERAS.max))}
            onStep={(d) => setCamerasW(clamp(columnW + d * 16, CAMERAS.min, CAMERAS.max))}
          />
        </>
      )}
      <Stage
        model={model}
        dragging={dragging}
        onDropped={() => setDragging(null)}
      />
      {files &&
        (folded ? (
          <div className="ml-2 flex">
            <FilesStrip
              title={model.filesTitle}
              onUnfold={() => (landscape ? setUnfoldedFor("presenting") : setFolded(false))}
            />
          </div>
        ) : (
          <>
            <Handle
              label={t.room.resizeFiles(model.filesTitle)}
              onDrag={(x) => setFilesW(clamp(edge("right") - 8 - x, FILES.min, FILES.max))}
              onStep={(d) => setFilesW(clamp(filesW - d * 16, FILES.min, FILES.max))}
            />
            <FilesPanel
              title={model.filesTitle}
              files={files}
              width={clamp(filesW, FILES.min, FILES.max)}
              onFold={() => (landscape ? setUnfoldedFor(null) : setFolded(true))}
              model={model}
              onDrag={setDragging}
            />
          </>
        ))}
    </div>
  );
  if (showColumn) return main;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 pt-2">
      <CameraRow height={CAMERA_ROW_HEIGHT} onMute={model.onMute} />
      {main}
    </div>
  );
}
