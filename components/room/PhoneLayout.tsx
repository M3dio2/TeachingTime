"use client";

import { DisconnectButton, TrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Ellipsis, Eye, FolderOpen, LogOut, Pencil, Plus, Users, X } from "lucide-react";
import { useState } from "react";
import Chip from "@/components/ui/Chip";
import Segmented from "@/components/ui/Segmented";
import Sheet from "@/components/ui/Sheet";
import Switch from "@/components/ui/Switch";
import { useT } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/messages";
import { fileTabKind, isFileTab, type TabId } from "@/lib/room/tabs";
import { CameraRow } from "./CameraTiles";
import { FileList, useFileOpener } from "./FilesPanel";
import AudioBar from "./AudioBar";
import JustTalk from "./JustTalk";
import { RecordButton } from "./Recording";
import { MuteStudentButton, useDeviceErrorHandler } from "./RoomControls";
import { cap, type RoomModel } from "./roomModel";
import { TabIcon } from "./Stage";
import TabPane from "./TabPane";

// A tab's name in the page's language (file tabs: the file's name).
const tabName = (t: Messages, id: TabId, names?: Record<string, string>) =>
  isFileTab(id) ? (names?.[id] ?? t.stage.tabs[fileTabKind(id)]) : t.stage.tabs[id];

// Phones, below 768 px (docs/design/HANDOFF.md, "Phones"; screens Phone-teacher, Phone-student):
// cameras in a row, the tabs as a segmented control, the active tab, then a bar of 48 px
// buttons. No side by side and no screen sharing here.
export default function PhoneLayout({
  model,
  onProblem,
}: {
  model: RoomModel;
  onProblem: (message: string) => void;
}) {
  const t = useT();
  const teacher = model.role === "teacher";
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
      {model.view.justTalk ? (
        <JustTalk model={model} phone />
      ) : (
        <>
          <CameraRow />
          <section
            aria-label={t.room.lesson}
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-surface"
          >
            <AudioBar model={model} phone />
            {teacher ? <TeacherTabs model={model} /> : <StudentTabs model={model} />}
          </section>
        </>
      )}
      {teacher ? (
        <TeacherBar model={model} onProblem={onProblem} />
      ) : (
        <PhoneBar onProblem={onProblem} />
      )}
    </div>
  );
}

function TeacherTabs({ model }: { model: RoomModel }) {
  const t = useT();
  const { tabs, active } = model.view;
  const { actions } = model;
  const two = tabs.length === 2;
  const next = tabs.includes("text") ? "draw" : "text";

  return (
    <>
      <nav aria-label={t.room.openTabs} className="flex shrink-0 items-center gap-1.5 border-b border-line px-2.5 py-2">
        <Segmented
          label={t.room.openTabs}
          value={tabs[active]}
          onChange={(id) => actions?.pick(tabs.indexOf(id as (typeof tabs)[number]))}
          segments={tabs.map((id, i) => ({
            id,
            label: (
              <>
                <TabIcon id={id} />
                <span className="truncate">{tabName(t, id, model.names)}</span>
              </>
            ),
            extra: two ? (
              <button
                type="button"
                aria-label={t.room.closeTab(tabName(t, id, model.names))}
                onClick={() => actions?.close(i)}
                className="inline-flex h-10 w-8 shrink-0 items-center justify-center text-ink-muted focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                <X size={14} aria-hidden />
              </button>
            ) : undefined,
          }))}
        />
        {!two && (
          <button
            type="button"
            aria-label={t.room.openSecondTab}
            title={t.room.openAsSecondTab(tabName(t, next))}
            onClick={() => actions?.open(next)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line bg-surface focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <Plus size={18} aria-hidden />
          </button>
        )}
      </nav>
      <ActivePane model={model} index={active} />
    </>
  );
}

// The student may tap between the teacher's two tabs; her choice lasts until the teacher
// switches tabs or opens or closes one.
function StudentTabs({ model }: { model: RoomModel }) {
  const t = useT();
  const { tabs, active } = model.view;
  const key = `${tabs.join(",")}|${active}`;
  const [pick, setPick] = useState({ key, index: active });
  if (pick.key !== key) setPick({ key, index: active });
  const shown = pick.key === key ? pick.index : active;
  const two = tabs.length === 2;

  return (
    <>
      <nav aria-label={t.room.lessonTabs} className="flex shrink-0 flex-col gap-2 border-b border-line px-3 pt-2 pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] text-ink-muted">
            {two
              ? t.room.showsTwoTabs(cap(model.otherName))
              : t.room.showsTab(cap(model.otherName), tabName(t, tabs[0], model.names))}
          </span>
          <Chip tone="marker" className="text-xs">
            <Eye size={14} aria-hidden />
            {t.room.following(model.otherName)}
          </Chip>
        </div>
        {two && (
          <Segmented
            label={t.room.lessonTabs}
            value={tabs[shown]}
            onChange={(id) => setPick({ key, index: tabs.indexOf(id as (typeof tabs)[number]) })}
            segments={tabs.map((id) => ({
              id,
              label: (
                <>
                  <TabIcon id={id} />
                  <span className="truncate">{tabName(t, id, model.names)}</span>
                </>
              ),
            }))}
          />
        )}
      </nav>
      <ActivePane model={model} index={shown} />
    </>
  );
}

function ActivePane({ model, index }: { model: RoomModel; index: number }) {
  const id = model.view.tabs[index] ?? model.view.tabs[0];
  return (
    <div key={id} data-tab={id} className="relative min-h-0 flex-1">
      <TabPane id={id} model={model} />
    </div>
  );
}

const BAR_BUTTON = { width: 48, height: 48, padding: 0, borderRadius: 6 } as const;

// Mic and camera, then any extra buttons, then Leave.
function PhoneBar({
  onProblem,
  children,
}: {
  onProblem: (message: string) => void;
  children?: React.ReactNode;
}) {
  const t = useT();
  const onDeviceError = useDeviceErrorHandler(onProblem);
  return (
    <div
      className={`flex h-[60px] shrink-0 items-center gap-2 px-1 ${children ? "justify-between" : "justify-center gap-3"}`}
    >
      <TrackToggle
        source={Track.Source.Microphone}
        showIcon
        style={BAR_BUTTON}
        aria-label={t.room.microphone}
        onDeviceError={(error) => onDeviceError({ source: Track.Source.Microphone, error })}
      />
      <TrackToggle
        source={Track.Source.Camera}
        showIcon
        style={BAR_BUTTON}
        aria-label={t.room.camera}
        onDeviceError={(error) => onDeviceError({ source: Track.Source.Camera, error })}
      />
      {children}
      <DisconnectButton
        aria-label={t.room.leaveLesson}
        style={{ height: 48, padding: children ? 0 : "0 20px", width: children ? 56 : undefined, borderRadius: 6 }}
      >
        <LogOut size={18} aria-hidden />
        {!children && t.room.leave}
      </DisconnectButton>
    </div>
  );
}

function TeacherBar({ model, onProblem }: { model: RoomModel; onProblem: (message: string) => void }) {
  const t = useT();
  const [sheet, setSheet] = useState<"none" | "files" | "more">("none");
  const close = () => setSheet("none");
  const button = (on: boolean) =>
    `inline-flex h-12 items-center justify-center gap-1.5 rounded-md border bg-surface text-[15px] font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
      on ? "border-accent" : "border-line"
    }`;
  const { actions } = model;
  const opener = useFileOpener(model);

  return (
    <>
      <PhoneBar onProblem={onProblem}>
        {model.files && (
          <button
            type="button"
            aria-expanded={sheet === "files"}
            onClick={() => setSheet("files")}
            className={`${button(sheet === "files")} px-3.5`}
          >
            <FolderOpen size={18} aria-hidden />
            {t.room.files}
          </button>
        )}
        <button
          type="button"
          aria-label={t.room.moreControls}
          aria-expanded={sheet === "more"}
          onClick={() => setSheet("more")}
          className={`${button(sheet === "more")} w-12`}
        >
          <Ellipsis size={18} aria-hidden />
        </button>
      </PhoneBar>

      {sheet === "files" && model.files && (
        <Sheet title={model.filesTitle} onClose={close}>
          <FileList
            files={model.files}
            model={model}
            onOpen={(id) => {
              if (opener.open(id)) close();
            }}
          />
          {model.files.some((f) => f.kind !== "audio") && (
            <p
              aria-live="polite"
              className={`px-1 pt-2 text-[13px] leading-snug ${opener.fullHint ? "text-ink" : "text-ink-muted"}`}
            >
              {opener.full
                ? t.room.filesFull
                : t.room.tapFileToShow(model.otherName)}
            </p>
          )}
        </Sheet>
      )}
      {sheet === "more" && actions && (
        <Sheet title={t.room.lessonControls} onClose={close}>
          <div className="flex flex-col">
            {model.lessonId && (
              <MuteStudentButton
                lessonId={model.lessonId}
                name={model.otherName}
                onProblem={onProblem}
                iconSize={20}
                className="flex min-h-13 items-center gap-3 px-1 text-left text-base text-ink disabled:text-ink-muted"
              />
            )}
            <RecordButton
              iconSize={20}
              className="flex min-h-13 items-center gap-3 border-b border-line px-1 text-left text-base text-ink disabled:text-ink-muted"
            />
            <Switch
              checked={model.view.studentCanEdit}
              onChange={actions.setStudentCanEdit}
              icon={<Pencil size={20} aria-hidden />}
              className="border-t border-line"
            >
              {t.room.canWriteAndDraw(cap(model.otherName))}
            </Switch>
            <button
              type="button"
              onClick={() => {
                actions.setJustTalk(!model.view.justTalk);
                close();
              }}
              className="flex min-h-13 items-center gap-3 border-t border-line px-1 text-left text-base text-ink"
            >
              <Users size={20} aria-hidden />
              {model.view.justTalk ? t.room.showTheTabs : t.room.justTalk}
            </button>
            <p className="px-1 pt-2 text-[13px] leading-snug text-ink-muted">
              {t.room.needsComputer}
            </p>
          </div>
        </Sheet>
      )}
    </>
  );
}
