"use client";

import { createLocalTracks, type LocalAudioTrack, type LocalTrack, type LocalVideoTrack, MediaDeviceFailure, Track } from "livekit-client";
import { Mic, MicOff, User, Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { deviceProblemMessage } from "./StatusBanner";

// The tracks made on the join card, handed to the room so they're published as they are
// (same devices, mic/camera on or off as chosen). `null` = that device failed.
export type PreJoinTracks = { audio: LocalAudioTrack | null; video: LocalVideoTrack | null };

async function startTracks(): Promise<{ tracks: PreJoinTracks; problem: string | null }> {
  try {
    const tracks = await createLocalTracks({ audio: true, video: true });
    return { tracks: pick(tracks), problem: null };
  } catch (error) {
    // One of the two may still work (e.g. no camera on this computer).
    const [audio, video] = await Promise.allSettled([
      createLocalTracks({ audio: true, video: false }),
      createLocalTracks({ audio: false, video: true }),
    ]);
    const got = [audio, video].flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    const kind = !got.length ? undefined : audio.status === "fulfilled" ? "videoinput" : "audioinput";
    return {
      tracks: pick(got),
      problem: deviceProblemMessage(MediaDeviceFailure.getFailure(error), kind),
    };
  }
}

function pick(tracks: LocalTrack[]): PreJoinTracks {
  return {
    audio: (tracks.find((t) => t.kind === Track.Kind.Audio) as LocalAudioTrack | undefined) ?? null,
    video: (tracks.find((t) => t.kind === Track.Kind.Video) as LocalVideoTrack | undefined) ?? null,
  };
}

// Join card: camera preview with round mic and camera buttons (docs/design/HANDOFF.md, "Student
// join"). Owns the tracks until `handOver()` gives them to the room; otherwise stops them.
export function useCameraCheck() {
  const [tracks, setTracks] = useState<PreJoinTracks | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const handedOver = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let mine: PreJoinTracks | null = null;
    startTracks().then(({ tracks, problem }) => {
      if (cancelled) {
        tracks.audio?.stop();
        tracks.video?.stop();
        return;
      }
      mine = tracks;
      setTracks(tracks);
      setProblem(problem);
    });
    return () => {
      cancelled = true;
      if (!handedOver.current) {
        mine?.audio?.stop();
        mine?.video?.stop();
      }
    };
  }, []);

  return {
    tracks,
    problem,
    micOn,
    camOn,
    toggleMic: async () => {
      if (!tracks?.audio) return;
      await (micOn ? tracks.audio.mute() : tracks.audio.unmute());
      setMicOn(!micOn);
    },
    toggleCam: async () => {
      if (!tracks?.video) return;
      await (camOn ? tracks.video.mute() : tracks.video.unmute());
      setCamOn(!camOn);
    },
    handOver: () => {
      handedOver.current = true;
      return tracks;
    },
  };
}

export function CameraPreview({ check }: { check: ReturnType<typeof useCameraCheck> }) {
  const video = useRef<HTMLVideoElement>(null);
  const track = check.tracks?.video;
  useEffect(() => {
    const el = video.current;
    if (!track || !el) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);
  const showVideo = Boolean(track) && check.camOn;
  const micLabel = check.micOn ? "Turn off your microphone" : "Turn on your microphone";
  const camLabel = check.camOn ? "Turn off your camera" : "Turn on your camera";

  return (
    <div className="flex flex-col gap-2">
      <div
        data-testid="camera-preview"
        className="relative flex aspect-video items-center justify-center overflow-hidden rounded-panel bg-video"
      >
        <video
          ref={video}
          muted
          playsInline
          className={`absolute inset-0 h-full w-full -scale-x-100 object-cover ${showVideo ? "" : "hidden"}`}
        />
        {!showVideo && (
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-ink-muted text-white">
            <User size={28} aria-hidden />
          </span>
        )}
        <span className="absolute top-2.5 left-2.5 rounded-md bg-video/85 px-2 py-0.5 text-xs text-white">
          {check.tracks ? "Your camera" : "Starting your camera…"}
        </span>
        <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-2.5">
          <RoundButton label={micLabel} off={!check.micOn} disabled={!check.tracks?.audio} onClick={check.toggleMic}>
            {check.micOn ? <Mic size={18} aria-hidden /> : <MicOff size={18} aria-hidden />}
          </RoundButton>
          <RoundButton label={camLabel} off={!check.camOn} disabled={!check.tracks?.video} onClick={check.toggleCam}>
            {check.camOn ? <Video size={18} aria-hidden /> : <VideoOff size={18} aria-hidden />}
          </RoundButton>
        </div>
      </div>
      {check.problem && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2.5 text-sm leading-snug text-danger">
          {check.problem}
        </p>
      )}
    </div>
  );
}

function RoundButton({
  label,
  off,
  disabled,
  onClick,
  children,
}: {
  label: string;
  off: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={off}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/35 text-white focus-visible:ring-2 focus-visible:ring-marker focus-visible:outline-none disabled:opacity-40 ${
        off ? "bg-danger" : "bg-paper/10 hover:bg-paper/20"
      }`}
    >
      {children}
    </button>
  );
}
