"use client";

import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, type RemoteParticipant } from "livekit-client";
import { useEffect, useEffectEvent } from "react";
import * as Y from "yjs";
import { onBytes, sendBytes } from "./transport";

const REMOTE = "remote";
const MIN_DIFF_INTERVAL_MS = 3000; // per peer

// Keeps a Y.Doc in sync with everyone in the LiveKit room.
// - Local edits are broadcast as Yjs updates.
// - When two participants see each other (join, late join, reconnect), each sends its
//   state vector and the other replies with exactly what is missing. This works both ways,
//   so whoever has the newer content, nothing is lost.
// `acceptUpdate` can drop live edits from a participant (the teacher uses it to ignore the
// student while editing is off). A full-state diff is applied only when we asked that peer for
// one (our join, a reconnect, a missing update), so a tampered client can't push a rewritten
// document whenever it likes; and each peer gets at most one full diff every few seconds, so
// it can't make us resend the whole document in a loop.
export function useYjsSync(
  doc: Y.Doc,
  name: string,
  acceptUpdate?: (fromIdentity: string) => boolean,
) {
  const room = useRoomContext();
  const accepts = useEffectEvent((fromIdentity: string) => acceptUpdate?.(fromIdentity) ?? true);

  useEffect(() => {
    const topics = { stateVector: `${name}:sv`, diff: `${name}:diff`, update: `${name}:update` };

    // Peers we asked for a diff and haven't heard back from yet.
    const awaitingDiff = new Set<string>();
    const greet = (identities: string[]) => {
      if (identities.length === 0) return;
      identities.forEach((id) => awaitingDiff.add(id));
      sendBytes(room, topics.stateVector, Y.encodeStateVector(doc), identities).catch(
        console.error,
      );
    };
    // When each peer last got a full diff from us.
    const lastDiffTo = new Map<string, number>();
    const greetEveryone = () => greet([...room.remoteParticipants.keys()]);
    const onParticipantConnected = (p: RemoteParticipant) => greet([p.identity]);

    const onLocalUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === REMOTE || room.remoteParticipants.size === 0) return;
      sendBytes(room, topics.update, update).catch(console.error);
    };
    const applyRemote = (bytes: Uint8Array) => Y.applyUpdate(doc, bytes, REMOTE);

    // A live update can depend on an earlier one we never applied (dropped while the student
    // wasn't allowed to edit, or lost on a reconnect). Yjs then holds it back as "pending".
    // Ask that peer for everything we're missing, once, until its diff arrives.
    const resyncIfIncomplete = (from: string) => {
      const incomplete = doc.store.pendingStructs !== null || doc.store.pendingDs !== null;
      if (incomplete && !awaitingDiff.has(from)) {
        awaitingDiff.add(from);
        greet([from]);
      }
    };

    const unsubscribe = [
      onBytes(room, topics.stateVector, (stateVector, from) => {
        const now = Date.now();
        if (now - (lastDiffTo.get(from) ?? 0) < MIN_DIFF_INTERVAL_MS) return;
        lastDiffTo.set(from, now);
        sendBytes(room, topics.diff, Y.encodeStateAsUpdate(doc, stateVector), [from]).catch(
          console.error,
        );
      }),
      onBytes(room, topics.diff, (diff, from) => {
        if (!awaitingDiff.delete(from)) return; // we didn't ask this peer: ignored
        applyRemote(diff);
      }),
      onBytes(room, topics.update, (update, from) => {
        if (!accepts(from)) return;
        applyRemote(update);
        resyncIfIncomplete(from);
      }),
    ];
    doc.on("update", onLocalUpdate);
    room.on(RoomEvent.Connected, greetEveryone);
    room.on(RoomEvent.Reconnected, greetEveryone);
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    greetEveryone();

    return () => {
      unsubscribe.forEach((off) => off());
      doc.off("update", onLocalUpdate);
      room.off(RoomEvent.Connected, greetEveryone);
      room.off(RoomEvent.Reconnected, greetEveryone);
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
    };
  }, [room, doc, name]);
}
