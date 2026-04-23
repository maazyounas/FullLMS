import type { Student } from "@/types/domain";

export type AdminAttendanceProps = {
  students?: Student[];
};

export type AttendanceStatus = "Present" | "Absent" | "Late" | "Leave";

export type AttendanceRecord = {
  id: string;
  date: string;
  day: string;
  time: string;
  className: string;
  status: AttendanceStatus;
};
