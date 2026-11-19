import {
  ArrowLeftRight,
  ListChecks,
  ListOrdered,
  type LucideIcon,
  PenLine,
  SquareChevronDown,
  TextCursorInput,
  ToggleRight,
} from "lucide-react";
import type { QuestionType } from "@/lib/quiz";

// Q1: one icon per question type, in the editor's blocks, the question cards and the lesson.
export const TYPE_ICONS: Record<QuestionType, LucideIcon> = {
  choice: ListChecks,
  truefalse: ToggleRight,
  gap: TextCursorInput,
  select: SquareChevronDown,
  match: ArrowLeftRight,
  order: ListOrdered,
  open: PenLine,
};
