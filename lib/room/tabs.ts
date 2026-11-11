// The lesson room's tab rules (docs/design/HANDOFF.md, "Tabs"; reference: openTab, closeTab and
// toggleShare in docs/design/screens/Main.dc.html). Pure functions, so the e2e rules spec can
// test them without a browser. Only the teacher's client runs them; the student renders what
// the teacher publishes (lib/sync/useTeacherSettings.ts).

// Built-in tabs, plus one tab per classroom file: `pdf:<id>`, `image:<id>`, `doc:<id>` (Word).
export const TAB_IDS = ["screen", "text", "draw"] as const;
export type BuiltInTab = (typeof TAB_IDS)[number];
export type FileTab = `pdf:${string}` | `image:${string}` | `doc:${string}`;
export type FileTabKind = "pdf" | "image" | "doc";
export type TabId = BuiltInTab | FileTab;
export type Layout = "split" | "single";

export const MAX_TABS = 2;
// Side by side needs 320 px per tab, plus the handle and padding.
export const MIN_TAB_PX = 320;
export const SPLIT_MIN_PX = 2 * MIN_TAB_PX + 28;

export type TabState = {
  tabs: TabId[]; // 1 or 2, in screen order
  active: number; // index into tabs
  layout: Layout;
  justTalk: boolean;
  // Teacher only, not published: the tab Screen took the place of, given back when sharing stops.
  screenReplaced: TabId | null;
};

export const INITIAL_TABS: TabState = {
  tabs: ["text"],
  active: 0,
  layout: "split",
  justTalk: false,
  screenReplaced: null,
};

const LABELS: Record<BuiltInTab, string> = { screen: "Screen", text: "Text", draw: "Draw" };
// File tabs are labelled with the file's name; `names` maps tab id → name.
export const tabLabel = (id: TabId, names?: Record<string, string>) =>
  isFileTab(id) ? (names?.[id] ?? FILE_LABELS[fileTabKind(id)]) : LABELS[id];
const FILE_LABELS: Record<FileTabKind, string> = { pdf: "PDF", image: "Picture", doc: "Word file" };

const FILE_TAB = /^(pdf|image|doc):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isFileTab = (value: string): value is FileTab => FILE_TAB.test(value);
export const fileTabId = (kind: FileTabKind, resourceId: string): FileTab => `${kind}:${resourceId}`;
export const fileTabKind = (id: FileTab) => id.slice(0, id.indexOf(":")) as FileTabKind;
export const resourceIdOf = (id: FileTab) => id.slice(id.indexOf(":") + 1);

export const isTabId = (value: unknown): value is TabId =>
  typeof value === "string" && ((TAB_IDS as readonly string[]).includes(value) || isFileTab(value));

// + shows only while one tab is open.
export const canAddTab = (s: TabState) => s.tabs.length < MAX_TABS;

// × shows on each tab only while two are open; the last tab can't be closed.
export const canCloseTabs = (s: TabState) => s.tabs.length > 1;

// What + offers: Screen (only while someone shares), Text and Draw, if not open yet.
export function addableTabs(s: TabState, sharing: boolean): TabId[] {
  const candidates: TabId[] = sharing ? ["screen", "text", "draw"] : ["text", "draw"];
  return canAddTab(s) ? candidates.filter((id) => !s.tabs.includes(id)) : [];
}

// Open a tab beside the one that's open. Already open: it becomes active. Two open: nothing
// changes (a tab is never replaced silently).
export function openTab(s: TabState, id: TabId): TabState {
  const at = s.tabs.indexOf(id);
  if (at !== -1) return { ...s, active: at, justTalk: false };
  if (!canAddTab(s)) return s;
  const tabs = [...s.tabs, id];
  return { ...s, tabs, active: tabs.length - 1, layout: "split", justTalk: false };
}

// Where a file goes: "auto" is a click (active if open, beside if one tab, else nothing: the
// files panel shows a hint); a drop goes "beside" or replaces the tab at an index.
export type Where = "auto" | "beside" | number;

export function openTabAt(s: TabState, id: TabId, where: Where): TabState {
  const at = s.tabs.indexOf(id);
  if (at !== -1) return { ...s, active: at, justTalk: false };
  if (where === "auto" || where === "beside") return openTab(s, id);
  if (where < 0 || where >= s.tabs.length) return s;
  const tabs = [...s.tabs];
  const replaced = tabs[where];
  tabs[where] = id;
  return {
    ...s,
    tabs,
    active: where,
    justTalk: false,
    screenReplaced: replaced === "screen" ? null : s.screenReplaced,
  };
}

export function closeTab(s: TabState, index: number): TabState {
  if (!canCloseTabs(s) || index < 0 || index >= s.tabs.length) return s;
  const closed = s.tabs[index];
  return {
    ...s,
    tabs: s.tabs.filter((_, i) => i !== index),
    active: 0,
    // Closing Screen while sharing is the teacher's choice: forget what it replaced.
    screenReplaced: closed === "screen" ? null : s.screenReplaced,
  };
}

export function pickTab(s: TabState, index: number): TabState {
  if (index < 0 || index >= s.tabs.length) return s;
  return { ...s, active: index };
}

export const setLayout = (s: TabState, layout: Layout): TabState => ({ ...s, layout });
export const setJustTalk = (s: TabState, justTalk: boolean): TabState => ({ ...s, justTalk });

// Someone started sharing: the one exception to "never replace a tab". With one tab, Screen
// opens to its left; with two, it takes the active tab's place and remembers that tab.
export function screenStarted(s: TabState): TabState {
  const base = { ...s, layout: "split" as const, justTalk: false };
  const at = s.tabs.indexOf("screen");
  if (at !== -1) return { ...base, active: at };
  if (canAddTab(s)) return { ...base, tabs: ["screen", ...s.tabs], active: 0, screenReplaced: null };
  const tabs = [...s.tabs];
  const replaced = tabs[s.active];
  tabs[s.active] = "screen";
  return { ...base, tabs, screenReplaced: replaced };
}

// Sharing stopped: Screen closes, and the tab it replaced comes back in its place.
export function screenStopped(s: TabState): TabState {
  const back = s.screenReplaced;
  if (!s.tabs.includes("screen")) return { ...s, screenReplaced: null };
  let tabs: TabId[] =
    back && !s.tabs.includes(back)
      ? s.tabs.map((id) => (id === "screen" ? back : id))
      : s.tabs.filter((id) => id !== "screen");
  if (!tabs.length) tabs = ["text"];
  return { ...s, tabs, active: Math.min(s.active, tabs.length - 1), screenReplaced: null };
}

// The student's side: whatever arrives in the teacher's attributes is checked before use.
export function cleanTabs(raw: unknown): TabId[] {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  if (!Array.isArray(parsed)) return [...INITIAL_TABS.tabs];
  const tabs = [...new Set(parsed.filter(isTabId))].slice(0, MAX_TABS);
  return tabs.length ? tabs : [...INITIAL_TABS.tabs];
}

export function cleanActive(raw: unknown, tabCount: number) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n < tabCount ? n : 0;
}

export const cleanLayout = (raw: unknown): Layout => (raw === "single" ? "single" : "split");
