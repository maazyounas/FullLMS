import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
export interface TimetableEntry {
  time: string;
  mon?: string;
  tue?: string;
  wed?: string;
  thu?: string;
  fri?: string;
  sat?: string;
}
import { apiAuthRequest } from "@/lib/api";

type BackendStudent = {
  id: string;
  grade: string;
};

type BackendTimetableSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  className: string;
  subject: string;
  teacherId: string;
  teacherName: string;
};

type TimetableSlotView = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  subject: string;
};

const toISODate = (value: Date) => value.toISOString().slice(0, 10);

const getCurrentWeekRange = () => {
  const date = new Date();
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diffToMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);

  return {
    weekStart: toISODate(weekStart),
    weekEnd: toISODate(weekEnd),
  };
};

const toTimeLabel = (startTime: string, endTime: string) =>
  `${startTime} - ${endTime}`;

const mapSlotsToRows = (slots: TimetableSlotView[]): TimetableEntry[] => {
  const byTime = new Map<string, TimetableEntry>();

  for (const slot of slots) {
    const day = new Date(`${slot.date}T00:00:00`).getDay();
    const time = toTimeLabel(slot.startTime, slot.endTime);
    const existing = byTime.get(time) ?? { time };

    if (day === 1) existing.mon = slot.subject;
    if (day === 2) existing.tue = slot.subject;
    if (day === 3) existing.wed = slot.subject;
    if (day === 4) existing.thu = slot.subject;
    if (day === 5) existing.fri = slot.subject;
    if (day === 6) existing.sat = slot.subject;

    byTime.set(time, existing);
  }

  return Array.from(byTime.values()).sort((a, b) =>
    a.time.localeCompare(b.time),
  );
};

export const useTimetable = () => {
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["student-timetable"],
    queryFn: async () => {
      const student = await apiAuthRequest<BackendStudent>("/students/me");
      const { weekStart, weekEnd } = getCurrentWeekRange();

      const rows = await apiAuthRequest<BackendTimetableSlot[]>(
        `/timetable/slots?weekStart=${weekStart}&weekEnd=${weekEnd}&className=${encodeURIComponent(student.grade)}`,
      );

      return rows.map((slot) => ({
        id: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        subject: slot.subject,
      }));
    },
  });

  const timetable = useMemo(() => mapSlotsToRows(slots), [slots]);

  return {
    timetable,
    isLoading,
  };
};
