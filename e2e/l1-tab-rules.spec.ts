import { expect, test } from "@playwright/test";
import {
  addableTabs,
  canAddTab,
  cleanActive,
  cleanTabs,
  closeTab,
  INITIAL_TABS,
  openTab,
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
});
