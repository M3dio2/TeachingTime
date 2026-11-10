"use client";

import { DisconnectReason } from "livekit-client";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Panel from "@/components/ui/Panel";
import Marker from "@/components/ui/Marker";
import Wordmark from "@/components/ui/Wordmark";
import LessonRoom from "./LessonRoom";
import RoomMessage from "./RoomMessage";

// Why the student is out of the room: they left, the teacher ended the call (the link is gone),
// or they opened the lesson in another tab.
type Exit = "left" | "ended" | "replaced";

// One id per browser, so joining from a second tab replaces the first (see the token route).
function browserId() {
  try {
    let id = localStorage.getItem("student-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("student-id", id);
    }
    return id;
  } catch {
    return undefined; // storage blocked: the token route picks a random id
  }
}

export default function StudentJoin({ slug }: { slug: string }) {
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [exit, setExit] = useState<Exit | null>(null);

  async function join(e?: React.FormEvent) {
    e?.preventDefault();
    setJoining(true);
    setError(null);
    const res = await fetch("/api/livekit-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name, clientId: browserId() }),
    });
    const data = await res.json();
    setJoining(false);
    if (!res.ok) {
      setError(data.error ?? "Could not join");
      return;
    }
    setExit(null);
    setToken(data.token);
  }

  if (token) {
    return (
      <LessonRoom
        token={token}
        role="student"
        inviteSlug={slug}
        onLeave={(reason) => {
          setToken(null);
          setExit(
            reason === DisconnectReason.ROOM_DELETED
              ? "ended"
              : reason === DisconnectReason.DUPLICATE_IDENTITY
                ? "replaced"
                : "left",
          );
        }}
      />
    );
  }

  if (exit === "ended") {
    return (
      <RoomMessage title="See you next time!" tick>
        The lesson has ended. You can close this page.
      </RoomMessage>
    );
  }
  if (exit === "replaced") {
    return (
      <RoomMessage
        title="You joined this lesson in another tab."
        actions={
          <Button disabled={joining} onClick={() => join()}>
            {joining ? "Joining…" : "Continue here"}
          </Button>
        }
      >
        Close this tab, or continue here to leave the other one.
      </RoomMessage>
    );
  }

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center p-4">
      <Panel className="w-full max-w-sm">
        <form onSubmit={join} className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-3">
            <Wordmark size="sm" underline="none" />
            <h1 className="text-2xl">
              {exit === "left" ? (
                "You left the lesson"
              ) : (
                <>
                  Join your{" "}
                  <span className="relative isolate inline-block">
                    lesson
                    <Marker
                      shape="underline"
                      delay={0.2}
                      className="absolute -bottom-[0.15em] -left-[3%] -z-10 h-[0.3em] w-[106%]"
                    />
                  </span>
                </>
              )}
            </h1>
          </div>
          <Field
            label="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="given-name"
            required
          />
          <Button disabled={joining}>{joining ? "Joining…" : exit === "left" ? "Rejoin" : "Join"}</Button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Panel>
    </main>
  );
}
