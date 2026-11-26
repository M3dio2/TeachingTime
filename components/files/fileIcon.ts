import {
  Clapperboard,
  File,
  FileText,
  FileType2,
  ImageIcon,
  Link2,
  ListChecks,
  type LucideIcon,
  Music,
  ScrollText,
  SquarePlay,
} from "lucide-react";

// F1: one icon per kind of file, for the Classroom page, the lesson's panel and the tabs.
export function fileIcon(kind: string, name = "", isYouTube = false): LucideIcon {
  switch (kind) {
    case "pdf":
      return FileText;
    case "doc":
      return FileType2;
    case "text":
    case "txt":
      return ScrollText;
    case "image":
      return ImageIcon;
    case "audio":
      return Music;
    case "video":
      return isYouTube ? SquarePlay : Clapperboard;
    case "link":
      return isYouTube ? SquarePlay : Link2;
    case "quiz":
      return ListChecks;
  }
  void name;
  return File;
}
