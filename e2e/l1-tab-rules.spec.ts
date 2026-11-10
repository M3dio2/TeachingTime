import { expect, test } from "@playwright/test";
import {
  addableTabs,
  canAddTab,
  cleanActive,
  cleanTabs,
  closeTab,
  INITIAL_TABS,
  isTabId,
  openTab,
  openTabAt,
  pickTab,
  screenStarted,
  screenStopped,
  type TabState,
} from "../lib/room/tabs";

// L1's tab rules (lib/room/tabs.ts, docs/design/HANDOFF.md "Tabs"), without a browser.
const state = (tabs: TabState["tabs"], active = 0, extra: Partial<TabState> = {}): TabState => ({
  ...INITIAL_TABS,
  tabs,
  active,
  ...extra,
});

test.describe("L1 tab rules", () => {
  test("one or two tabs, never more; + only with one", () => {
    let s = INITIAL_TABS;
    expect(s.tabs).toEqual(["text"]);
    expect(canAddTab(s)).toBe(true);
    s = openTab(s, "draw");
    expect(s.tabs).toEqual(["text", "draw"]);
    expect(s.active).toBe(1);
    expect(canAddTab(s)).toBe(false);
    expect(addableTabs(s, true)).toEqual([]);
    // A third tab never replaces one silently.
    const sharingWhileFull = openTab(s, "screen");
    expect(sharingWhileFull).toBe(s);
  });

  test("opening an open tab makes it active", () => {
    const s = openTab(state(["text", "draw"], 1), "text");
    expect(s.tabs).toEqual(["text", "draw"]);
    expect(s.active).toBe(0);
  });

  test("the last tab can't be closed; closing one makes the other active", () => {
    expect(closeTab(state(["text"]), 0)).toEqual(state(["text"]));
    const s = closeTab(state(["text", "draw"], 0), 0);
    expect(s.tabs).toEqual(["draw"]);
    expect(s.active).toBe(0);
  });

  test("+ offers Screen only while someone shares", () => {
    expect(addableTabs(state(["text"]), false)).toEqual(["draw"]);
    expect(addableTabs(state(["text"]), true)).toEqual(["screen", "draw"]);
  });

  test("sharing with one tab opens Screen on its left; stopping closes it", () => {
    let s = screenStarted(state(["draw"]));
    expect(s.tabs).toEqual(["screen", "draw"]);
    expect(s.active).toBe(0);
    s = pickTab(s, 1);
    s = screenStopped(s);
    expect(s.tabs).toEqual(["draw"]);
    expect(s.active).toBe(0);
  });

  test("sharing with two tabs takes the active tab's place and gives it back", () => {
    let s = screenStarted(state(["text", "draw"], 1));
    expect(s.tabs).toEqual(["text", "screen"]);
    expect(s.active).toBe(1);
    expect(s.screenReplaced).toBe("draw");
    s = screenStopped(s);
    expect(s.tabs).toEqual(["text", "draw"]);
    expect(s.active).toBe(1);
    expect(s.screenReplaced).toBeNull();
  });

  test("sharing ends Just talk and switches to side by side", () => {
    const s = screenStarted(state(["text"], 0, { justTalk: true, layout: "single" }));
    expect(s.justTalk).toBe(false);
    expect(s.layout).toBe("split");
  });

  test("closing Screen while sharing: + offers it again, stopping changes nothing", () => {
    let s = screenStarted(state(["text", "draw"], 0)); // Screen replaced Text
    s = closeTab(s, 0);
    expect(s.tabs).toEqual(["draw"]);
    expect(s.screenReplaced).toBeNull();
    expect(addableTabs(s, true)).toEqual(["screen", "text"]);
    expect(screenStopped(s).tabs).toEqual(["draw"]);
  });

  test("Screen as the only tab falls back to Text when sharing stops", () => {
    expect(screenStopped(state(["screen"])).tabs).toEqual(["text"]);
  });

  test("the student cleans whatever arrives", () => {
    expect(cleanTabs('["screen","text"]')).toEqual(["screen", "text"]);
    expect(cleanTabs('["text","text","draw"]')).toEqual(["text", "draw"]);
    expect(cleanTabs('["text","draw","screen"]')).toEqual(["text", "draw"]);
    expect(cleanTabs('["evil"]')).toEqual(["text"]);
    expect(cleanTabs("not json")).toEqual(["text"]);
    expect(cleanTabs(undefined)).toEqual(["text"]);
    expect(cleanActive("1", 2)).toBe(1);
    expect(cleanActive("2", 2)).toBe(0);
    expect(cleanActive("x", 1)).toBe(0);
  });

  // L2a: classroom files as tabs.
  const pdf = "pdf:11111111-1111-4111-8111-111111111111" as const;
  const pic = "image:22222222-2222-4222-8222-222222222222" as const;

  test("file tab ids are checked", () => {
    expect(isTabId(pdf)).toBe(true);
    expect(isTabId(pic)).toBe(true);
    expect(isTabId("pdf:../../etc")).toBe(false);
    expect(isTabId("audio:22222222-2222-4222-8222-222222222222")).toBe(false);
    expect(cleanTabs(JSON.stringify([pdf, "text"]))).toEqual([pdf, "text"]);
  });

  test("clicking a file: beside one tab, nothing with two, active if open", () => {
    let s = openTabAt(state(["text"]), pdf, "auto");
    expect(s.tabs).toEqual(["text", pdf]);
    expect(s.active).toBe(1);
    expect(openTabAt(s, pic, "auto")).toBe(s); // two open: unchanged (the panel shows a hint)
    s = pickTab(s, 0);
    expect(openTabAt(s, pdf, "auto").active).toBe(1);
  });

  test("dropping a file: replace the tab under it, or open beside", () => {
    expect(openTabAt(state(["text"]), pic, 0).tabs).toEqual([pic]);
    expect(openTabAt(state(["text"]), pic, "beside").tabs).toEqual(["text", pic]);
    const s = openTabAt(state(["text", pdf], 1), pic, 0);
    expect(s.tabs).toEqual([pic, pdf]);
    expect(s.active).toBe(0);
  });

  test("replacing Screen while sharing forgets what it replaced", () => {
    const sharing = screenStarted(state(["text", "draw"], 1)); // Screen replaced Draw
    const s = openTabAt(sharing, pdf, 1);
    expect(s.tabs).toEqual(["text", pdf]);
    expect(s.screenReplaced).toBeNull();
    expect(screenStopped(s).tabs).toEqual(["text", pdf]);
  });
});
