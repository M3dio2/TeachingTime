"use client";

import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLoadedFile } from "@/lib/room/fileCache";
import { videoPosition, type VideoState, youtubeId, youtubeStart } from "@/lib/room/links";
import type { FileTab } from "@/lib/room/tabs";
import { cap, type RoomModel } from "./roomModel";

// A YouTube video tab (G2). The teacher's player has the normal controls; whatever she does
// (play, pause, jump) is published in her `video` attribute, and the student's player follows
// it, with no controls of its own. Both load the video from YouTube (privacy-enhanced
// youtube-nocookie.com), so the picture is sharp and costs no lesson bandwidth.

type Player = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  destroy(): void;
};
type YT = {
  Player: new (el: HTMLElement, options: Record<string, unknown>) => Player;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
};
declare global {
  interface Window {
    YT?: YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let api: Promise<YT> | null = null;
function loadApi() {
  api ??= new Promise<YT>((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => {
      api = null;
      reject(new Error("YouTube didn't load"));
    };
    document.head.appendChild(s);
  });
  return api;
}

const DRIFT = 1.5; // seconds the student may be off before a jump

export default function VideoPane({ id, model }: { id: FileTab; model: RoomModel }) {
  const { file, failed } = useLoadedFile(model.inviteSlug, id);
  const box = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const [ready, setReady] = useState(false);
  const [broken, setBroken] = useState(false);
  const [needsTap, setNeedsTap] = useState(false); // student: the browser blocked sound
  const teacher = model.role === "teacher";
  const videoId = file?.url ? youtubeId(file.url) : null;
  // Student: the teacher's player state, for this tab only.
  const followed = !teacher && model.view.video?.tab === id ? model.view.video : null;
  const followedRef = useRef<VideoState | null>(null);
  useEffect(() => {
    followedRef.current = followed;
  }, [followed]);
  const setVideo = model.setVideo;

  // Create the player once the link is known.
  useEffect(() => {
    const el = box.current;
    if (!videoId || !el) return;
    let gone = false;
    const mount = document.createElement("div");
    el.replaceChildren(mount);
    loadApi()
      .then((YT) => {
        if (gone) return;
        const publish = () => {
          const p = player.current;
          if (!p || !setVideo) return;
          const state = p.getPlayerState();
          setVideo({ tab: id, playing: state === YT.PlayerState.PLAYING, at: p.getCurrentTime(), ts: Date.now() });
        };
        player.current = new YT.Player(mount, {
          host: "https://www.youtube-nocookie.com",
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            start: file?.url ? youtubeStart(file.url) : 0,
            controls: teacher ? 1 : 0,
            disablekb: teacher ? 0 : 1,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (gone) return;
              setReady(true);
              if (teacher) publish();
            },
            onStateChange: (e: { data: number }) => {
              if (teacher && (e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED)) {
                publish();
              }
            },
            onError: () => !gone && setBroken(true),
          },
        });
      })
      .catch(() => !gone && setBroken(true));
    return () => {
      gone = true;
      player.current?.destroy();
      player.current = null;
      setReady(false);
    };
    // The player is made once per video; the start position only matters then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, teacher, id, setVideo]);

  // Teacher: jumps while playing don't always change the state, so check the position now and
  // then and publish again when it moved more than playback explains.
  useEffect(() => {
    if (!teacher || !ready || !setVideo) return;
    let last = { at: player.current?.getCurrentTime() ?? 0, ts: Date.now(), playing: false };
    const timer = setInterval(() => {
      const p = player.current;
      if (!p) return;
      const playing = p.getPlayerState() === 1;
      const at = p.getCurrentTime();
      const expected = last.at + (last.playing ? (Date.now() - last.ts) / 1000 : 0);
      if (playing !== last.playing || Math.abs(at - expected) > DRIFT) {
        setVideo({ tab: id, playing, at, ts: Date.now() });
      }
      last = { at, ts: Date.now(), playing };
    }, 1000);
    return () => clearInterval(timer);
  }, [teacher, ready, setVideo, id]);

  // Student: follow the teacher, on every change and every 2 seconds against drift.
  useEffect(() => {
    if (teacher || !ready) return;
    const follow = () => {
      const p = player.current;
      const v = followedRef.current;
      if (!p || !v) return;
      const target = videoPosition(v);
      if (Math.abs(p.getCurrentTime() - target) > DRIFT) p.seekTo(target, true);
      const state = p.getPlayerState();
      if (v.playing && state !== 1 && state !== 3) {
        p.playVideo();
        // Blocked with sound (no tap on this page yet): play muted and offer the sound.
        setTimeout(() => {
          const q = player.current;
          if (q && followedRef.current?.playing && q.getPlayerState() !== 1 && q.getPlayerState() !== 3) {
            q.mute();
            q.playVideo();
            setNeedsTap(true);
          }
        }, 1200);
      }
      if (!v.playing && state === 1) p.pauseVideo();
    };
    follow();
    const timer = setInterval(follow, 2000);
    return () => clearInterval(timer);
  }, [teacher, ready, followed]);

  if (failed || broken || (file && !videoId)) {
    return <p className="flex h-full items-center justify-center bg-video p-4 text-sm text-surface-2">This video couldn&apos;t be played.</p>;
  }

  const note = teacher
    ? `${cap(model.otherName)} watches along: play, pause or jump, it follows you`
    : `${cap(model.otherName)} controls the video`;

  return (
    <div className="flex h-full flex-col gap-3 bg-video p-3 text-surface-2">
      <div className="relative min-h-0 w-full flex-1">
        <div ref={box} data-testid="video-player" data-following={followed ? (followed.playing ? "playing" : "paused") : "none"} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
        {/* The student can't click the player (it follows the teacher). */}
        {!teacher && <div className="absolute inset-0" aria-hidden />}
        {!ready && <p className="absolute inset-0 flex items-center justify-center text-sm">Opening the video…</p>}
        {needsTap && (
          <button
            type="button"
            onClick={() => {
              player.current?.unMute();
              setNeedsTap(false);
            }}
            className="absolute bottom-3 left-1/2 inline-flex h-11 -translate-x-1/2 items-center gap-2 rounded-md bg-marker px-4 font-semibold text-ink shadow-soft"
          >
            <Volume2 size={18} aria-hidden />
            Tap to hear the video
          </button>
        )}
      </div>
      <p className="text-center text-[13px]">{note}</p>
    </div>
  );
}
