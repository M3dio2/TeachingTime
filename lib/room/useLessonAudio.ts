"use client";

import { useRoomContext } from "@livekit/components-react";
import { type LocalTrackPublication, Track } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioState } from "./audio";
import { loadResource } from "./fileCache";

export type LessonAudio = {
  state: AudioState | null;
  loading: string | null; // resource id being opened
  failed: boolean;
  play: (file: { id: string; name: string }) => void; // play, or resume the same file
  pause: () => void;
  seek: (seconds: number) => void;
  stop: () => void;
};

// Teacher only (A1): plays a classroom audio file for both people. The file goes through Web
// Audio into its own LiveKit track (not the microphone), so the student hears it even while the
// teacher's mic is muted; the teacher hears it locally. Its state goes into the teacher's
// attributes (lib/sync/useTeacherSettings.ts) so the student's bar can run on its own.
export function useLessonAudio(slug: string | undefined): LessonAudio {
  const room = useRoomContext();
  const [state, setState] = useState<AudioState | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const el = useRef<HTMLAudioElement | null>(null);
  const graph = useRef<{ ctx: AudioContext; dest: MediaStreamAudioDestinationNode } | null>(null);
  const publication = useRef<LocalTrackPublication | null>(null);
  const current = useRef<AudioState | null>(null);
  useEffect(() => {
    current.current = state;
  }, [state]);

  const unpublish = useCallback(async () => {
    const pub = publication.current;
    publication.current = null;
    if (pub?.track) await room.localParticipant.unpublishTrack(pub.track, false).catch(() => {});
  }, [room]);

  const stop = useCallback(() => {
    const a = el.current;
    el.current = null;
    if (a) {
      a.pause();
      a.removeAttribute("src");
    }
    setState(null);
    void unpublish();
  }, [unpublish]);

  // Leaving the room ends the audio.
  useEffect(() => () => stop(), [stop]);

  const play = useCallback(
    async (file: { id: string; name: string }) => {
      const now = current.current;
      if (now?.id === file.id && el.current) {
        // Same file: resume from where it paused.
        if (now.pausedAt !== null) {
          el.current.currentTime = now.pausedAt;
          await el.current.play().catch(() => {});
          setState({ ...now, pausedAt: null, startedAt: Date.now() - now.pausedAt * 1000 });
        }
        return;
      }
      if (!slug) return;
      setFailed(false);
      setLoading(file.id);
      // Created on the click (browsers only allow sound after one).
      graph.current ??= (() => {
        const ctx = new AudioContext();
        return { ctx, dest: ctx.createMediaStreamDestination() };
      })();
      const { ctx, dest } = graph.current;
      void ctx.resume();
      try {
        const loaded = await loadResource(slug, file.id);
        if (el.current) {
          el.current.pause();
          el.current.removeAttribute("src");
        }
        const audio = new Audio();
        audio.src = loaded.src!;
        el.current = audio;
        const source = ctx.createMediaElementSource(audio);
        source.connect(dest);
        source.connect(ctx.destination);
        audio.onended = () => {
          if (el.current === audio) stop();
        };
        await audio.play();
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        setState({ id: file.id, name: loaded.name, duration, startedAt: Date.now(), pausedAt: null });
        audio.onloadedmetadata = () =>
          setState((s) => (s && el.current === audio ? { ...s, duration: audio.duration } : s));
        if (!publication.current) {
          publication.current = await room.localParticipant.publishTrack(dest.stream.getAudioTracks()[0], {
            name: "lesson-audio",
            source: Track.Source.Unknown,
          });
        }
      } catch {
        setFailed(true);
        stop();
      } finally {
        setLoading(null);
      }
    },
    [slug, room, stop],
  );

  const pause = useCallback(() => {
    const a = el.current;
    const now = current.current;
    if (!a || !now || now.pausedAt !== null) return;
    a.pause();
    setState({ ...now, pausedAt: a.currentTime });
  }, []);

  const seek = useCallback((seconds: number) => {
    const a = el.current;
    const now = current.current;
    if (!a || !now) return;
    const t = Math.max(0, Math.min(now.duration || 0, seconds));
    a.currentTime = t;
    setState(now.pausedAt !== null ? { ...now, pausedAt: t } : { ...now, startedAt: Date.now() - t * 1000 });
  }, []);

  return { state, loading, failed, play, pause, seek, stop };
}
