import LoadingScreen from "@/components/room/LoadingScreen";

// D5d: "Start lesson" shows the loading screen at once (the same one stays until connected).
export default function Loading() {
  return <LoadingScreen title="Getting your lesson ready" />;
}
