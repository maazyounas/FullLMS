import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AdminTeacherRecord } from "@/components/admin/teacher/types";
import type { PlannerAllocation } from "@/components/admin/types";

interface Props {
  role?: "ADMIN" | "TEACHER";
  teacherProfile?: any; // The logged-in teacher profile if role is TEACHER
  teachers: AdminTeacherRecord[];
  allocations: PlannerAllocation[];
  classOptions: string[];
  subjectOptions: string[];
  classSubjectOptions?: Record<string, string[]>;
  onAllocationsChange: (next: PlannerAllocation[]) => void;
  onLoadWeek?: (args: { weekStart: string; weekEnd: string }) => Promise<PlannerAllocation[]>;
  onCreateAllocation?: (slot: {
    date: string;
    startTime: string;
    endTime: string;
    className: string;
    subject: string;
    teacherId: number;
  }) => Promise<PlannerAllocation>;
  onCreateAllocationBulk?: (slots: {
    date: string;
    startTime: string;
    endTime: string;
    className: string;
    subject: string;
    teacherId: number;
  }[]) => Promise<PlannerAllocation[]>;
  onUpdateAllocation?: (
    allocationId: string,
    slot: {
      date: string;
      startTime: string;
      endTime: string;
      className: string;
      subject: string;
      teacherId: number;
    },
  ) => Promise<PlannerAllocation>;
  onDeleteAllocation?: (allocationId: string) => Promise<void>;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const WEEK_DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

const toMinutes = (value: string) => {
  const [hourRaw, minuteRaw] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hourRaw) || !Number.isFinite(minuteRaw)) return 0;
  return hourRaw * 60 + minuteRaw;
};

const toPlannerDay = (dateValue: string): PlannerAllocation["day"] => {
  const day = new Date(`${dateValue}T00:00:00`).getDay();
  if (day === 1) return "Mon";
  if (day === 2) return "Tue";
  if (day === 3) return "Wed";
  if (day === 4) return "Thu";
  if (day === 5) return "Fri";
  return "Mon";
};

const getWeekRange = (baseDate: string) => {
  const date = new Date(`${baseDate}T00:00:00`);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Monday to Sunday
  return {
    weekStart: toISODate(weekStart),
    weekEnd: toISODate(weekEnd),
  };
};

const getWeeksInMonth = (year: number, month: number) => {
  const result: { weekStart: string; weekEnd: string; label: string }[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const start = new Date(firstDay);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);

  const endLimit = new Date(lastDay);
  const endDay = endLimit.getDay();
  const diffToSunday = endDay === 0 ? 0 : 7 - endDay;
  endLimit.setDate(endLimit.getDate() + diffToSunday);

  const current = new Date(start);
  let weekIndex = 1;
  while (current <= endLimit) {
    const wStart = new Date(current);
    const wEnd = new Date(current);
    wEnd.setDate(current.getDate() + 6);

    const startStr = wStart.toISOString().slice(0, 10);
    const endStr = wEnd.toISOString().slice(0, 10);

    result.push({
      weekStart: startStr,
      weekEnd: endStr,
      label: `Week ${weekIndex} (${startStr} to ${endStr})`,
    });

    current.setDate(current.getDate() + 7);
    weekIndex++;
  }
  return result;
};

const buildTimeSlots = () => {
  const result: string[] = [];
  for (let hour = 7; hour <= 21; hour += 1) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === 21 && minute > 0) continue;
      result.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  return result;
};

const TIME_SLOTS = buildTimeSlots();

const AdminTimetablePlanner = ({
  role = "ADMIN",
  teacherProfile,
  teachers,
  allocations,
  classOptions,
  subjectOptions,
  classSubjectOptions = {},
  onAllocationsChange,
  onLoadWeek,
  onCreateAllocation,
  onCreateAllocationBulk,
  onUpdateAllocation,
  onDeleteAllocation,
}: Props) => {
  const today = toISODate(new Date());
  
  // Date states
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [date, setDate] = useState(today);
  const weekRange = useMemo(() => getWeekRange(date), [date]);

  // Form states
  const [scheduleType, setScheduleType] = useState<"single" | "recurring">("single");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [targetWeeks, setTargetWeeks] = useState<string[]>([]);
  
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:45");
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [teacherId, setTeacherId] = useState("");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isWeekLoading, setIsWeekLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal apply states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applySelectedWeeks, setApplySelectedWeeks] = useState<string[]>([]);

  // Calculate weeks in the selected month
  const weeks = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split("-");
    const y = Number(yearStr) || new Date().getFullYear();
    const m = (Number(monthStr) || 1) - 1;
    return getWeeksInMonth(y, m);
  }, [selectedMonth]);

  const futureWeeks = useMemo(() => {
    return weeks.filter((w) => w.weekStart > weekRange.weekStart);
  }, [weeks, weekRange.weekStart]);

  // Set targetWeeks default selection when weeks change
  useEffect(() => {
    const remaining = weeks.filter((wk) => wk.weekEnd >= today).map((wk) => wk.weekStart);
    setTargetWeeks(remaining);
  }, [weeks, today]);

  // Limit class grade options for Teacher role
  const computedClassOptions = useMemo(() => {
    if (role === "TEACHER" && teacherProfile) {
      return teacherProfile.classes || [];
    }
    return classOptions;
  }, [role, teacherProfile, classOptions]);

  // Limit subject options based on selection and role
  const classSpecificSubjects = useMemo(() => {
    if (!className) return [];
    if (role === "TEACHER" && teacherProfile) {
      const classSubjects = teacherProfile.classSubjects?.[className] ?? [];
      if (classSubjects.length > 0) {
        return classSubjects;
      }
      return (teacherProfile.subject ?? "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
    const configured = classSubjectOptions[className] ?? [];
    return configured.length > 0 ? configured : subjectOptions;
  }, [role, teacherProfile, className, classSubjectOptions, subjectOptions]);

  const configuredSubjectsForClass = useMemo(
    () => (className ? classSubjectOptions[className] ?? [] : []),
    [className, classSubjectOptions],
  );

  // Eligible teachers logic
  const eligibleTeachers = useMemo(() => {
    if (role === "TEACHER" && teacherProfile) {
      return teachers.filter((t) => String(t.id) === String(teacherProfile.id));
    }
    if (!className || !subject) return teachers;
    return teachers.filter((teacher) => {
      if (!(teacher.classes ?? []).includes(className)) return false;
      const classSubjects = teacher.classSubjects?.[className] ?? [];
      if (classSubjects.length > 0) {
        return classSubjects.includes(subject);
      }
      return teacher.subject
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .includes(subject);
    });
  }, [role, teacherProfile, className, subject, teachers]);

  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => String(teacher.id) === teacherId) ?? null,
    [teacherId, teachers],
  );

  // Set default teacher ID
  useEffect(() => {
    if (role === "TEACHER" && teacherProfile) {
      setTeacherId(String(teacherProfile.id));
      return;
    }
    if (!teacherId) {
      if (eligibleTeachers.length === 1) {
        setTeacherId(String(eligibleTeachers[0].id));
      }
      return;
    }
    const isStillEligible = eligibleTeachers.some(
      (teacher) => String(teacher.id) === teacherId,
    );
    if (!isStillEligible) {
      setTeacherId(eligibleTeachers.length === 1 ? String(eligibleTeachers[0].id) : "");
    }
  }, [role, teacherProfile, eligibleTeachers, teacherId]);

  // Conflict calculation
  const conflicts = useMemo(
    () =>
      allocations.filter((slot, idx) =>
        allocations.some(
          (other, j) =>
            j !== idx &&
            (slot.date ?? "") === (other.date ?? "") &&
            slot.teacherId === other.teacherId &&
            toMinutes(slot.startTime ?? "00:00") < toMinutes(other.endTime ?? "00:00") &&
            toMinutes(other.startTime ?? "00:00") < toMinutes(slot.endTime ?? "00:00") &&
            slot.className !== other.className,
        ),
      ),
    [allocations],
  );

  const sortedAllocations = useMemo(
    () =>
      [...allocations].sort((a, b) => {
        const dateCompare = (a.date ?? "").localeCompare(b.date ?? "");
        if (dateCompare !== 0) return dateCompare;
        return toMinutes(a.startTime ?? "00:00") - toMinutes(b.startTime ?? "00:00");
      }),
    [allocations],
  );

  const displayedAllocations = useMemo(
    () =>
      sortedAllocations.filter((slot) => {
        const slotDate = slot.date ?? "";
        return slotDate >= weekRange.weekStart && slotDate <= weekRange.weekEnd;
      }),
    [sortedAllocations, weekRange.weekEnd, weekRange.weekStart],
  );

  const missingCoursesForClass =
    className.length > 0 &&
    role !== "TEACHER" &&
    (classSubjectOptions[className] ?? []).length === 0;

  const disableSave =
    !className || !subject || !teacherId || !startTime || !endTime || missingCoursesForClass ||
    (scheduleType === "single" && !date) ||
    (scheduleType === "recurring" && (selectedDays.length === 0 || targetWeeks.length === 0));

  const teacherHelperText = useMemo(() => {
    if (role === "TEACHER") return "Scheduling classes under your account.";
    if (!className) return "Choose a class first.";
    if (missingCoursesForClass) return `Add courses to ${className} before creating timetable slots.`;
    if (!subject) return "Choose a subject to see matching teachers.";
    if (eligibleTeachers.length === 0) {
      return `No teacher is assigned to teach ${subject} in ${className}. Update teacher class-course assignments first.`;
    }
    if (eligibleTeachers.length === 1) {
      return `${eligibleTeachers[0].name} is the only teacher currently eligible, so we selected them for you.`;
    }
    return `${eligibleTeachers.length} teachers can teach ${subject} in ${className}.`;
  }, [role, className, eligibleTeachers, missingCoursesForClass, subject]);

  const resetForm = () => {
    setEditingId(null);
    setDate(weekRange.weekStart);
    setStartTime("08:00");
    setEndTime("08:45");
    setClassName("");
    setSubject("");
    setSelectedDays([]);
    setScheduleType("single");
    if (role !== "TEACHER") {
      setTeacherId("");
    }
  };

  const loadWeek = async (baseDate: string) => {
    if (!onLoadWeek) return;
    setIsWeekLoading(true);
    try {
      await onLoadWeek(getWeekRange(baseDate));
    } catch {
      toast.error("Failed to load timetable week from server.");
    } finally {
      setIsWeekLoading(false);
    }
  };

  const applyAllocation = async () => {
    if (isSaving) return;

    const numericTeacherId = Number(teacherId);
    const targetTeacher = teachers.find((t) => t.id === numericTeacherId);
    if (!targetTeacher || !className || !subject || !startTime || !endTime) {
      toast.error("Select teacher, class, subject, and time range.");
      return;
    }

    if (toMinutes(endTime) <= toMinutes(startTime)) {
      toast.error("End time must be later than start time.");
      return;
    }

    if (scheduleType === "single") {
      const hasClassConflict = allocations.some(
        (slot) =>
          slot.id !== editingId &&
          (slot.date ?? "") === date &&
          slot.className === className &&
          toMinutes(startTime) < toMinutes(slot.endTime ?? "00:00") &&
          toMinutes(slot.startTime ?? "00:00") < toMinutes(endTime),
      );

      const hasTeacherConflict = allocations.some(
        (slot) =>
          slot.id !== editingId &&
          (slot.date ?? "") === date &&
          slot.teacherId === targetTeacher.id &&
          toMinutes(startTime) < toMinutes(slot.endTime ?? "00:00") &&
          toMinutes(slot.startTime ?? "00:00") < toMinutes(endTime),
      );

      if (hasClassConflict || hasTeacherConflict) {
        toast.error("Time conflict detected. Choose another slot.");
        return;
      }

      const payload = {
        date,
        startTime,
        endTime,
        className,
        subject,
        teacherId: targetTeacher.id,
      };

      setIsSaving(true);
      try {
        if (editingId) {
          if (onUpdateAllocation) {
            await onUpdateAllocation(editingId, payload);
          } else {
            onAllocationsChange(
              allocations.map((slot) =>
                slot.id === editingId
                  ? {
                      ...slot,
                      day: toPlannerDay(date),
                      date,
                      startTime,
                      endTime,
                      time: `${startTime} - ${endTime}`,
                      className,
                      subject,
                      teacherId: targetTeacher.id,
                      teacherName: targetTeacher.name,
                    }
                  : slot,
              ),
            );
          }
          toast.success("Allocation updated.");
        } else {
          if (onCreateAllocation) {
            await onCreateAllocation(payload);
          } else {
            const next: PlannerAllocation = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              day: toPlannerDay(date),
              date,
              startTime,
              endTime,
              time: `${startTime} - ${endTime}`,
              className,
              subject,
              teacherId: targetTeacher.id,
              teacherName: targetTeacher.name,
            };
            onAllocationsChange([next, ...allocations]);
          }
          toast.success("Allocation added.");
        }
        resetForm();
      } catch (error: any) {
        toast.error(error.message || "Unable to save allocation.");
      } finally {
        setIsSaving(false);
      }
    } else {
      // Recurring Bulk
      const bulkSlots: any[] = [];
      targetWeeks.forEach((weekStartStr) => {
        selectedDays.forEach((dayValue) => {
          const weekDate = new Date(`${weekStartStr}T00:00:00`);
          weekDate.setDate(weekDate.getDate() + (dayValue - 1));
          bulkSlots.push({
            date: weekDate.toISOString().slice(0, 10),
            startTime,
            endTime,
            className,
            subject,
            teacherId: targetTeacher.id,
          });
        });
      });

      setIsSaving(true);
      try {
        if (onCreateAllocationBulk) {
          await onCreateAllocationBulk(bulkSlots);
          toast.success(`Scheduled ${bulkSlots.length} recurring sessions!`);
          resetForm();
          await loadWeek(date);
        } else {
          toast.error("Bulk creation endpoint not available.");
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to schedule recurring sessions.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const removeAllocation = async (allocationId: string) => {
    if (deletingId) return;

    setDeletingId(allocationId);
    try {
      if (onDeleteAllocation) {
        await onDeleteAllocation(allocationId);
      } else {
        onAllocationsChange(allocations.filter((x) => x.id !== allocationId));
      }
      if (editingId === allocationId) {
        resetForm();
      }
      toast.success("Allocation removed.");
    } catch {
      toast.error("Unable to delete allocation.");
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (slot: PlannerAllocation) => {
    setEditingId(slot.id);
    setDate(slot.date ?? weekRange.weekStart);
    setStartTime(slot.startTime ?? "08:00");
    setEndTime(slot.endTime ?? "08:45");
    setClassName(slot.className);
    setSubject(slot.subject);
    setTeacherId(String(slot.teacherId));
    setScheduleType("single");
  };

  const handleCopyPreviousWeek = async () => {
    setIsWeekLoading(true);
    try {
      const prevWeekStart = new Date(`${weekRange.weekStart}T00:00:00`);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekEnd = new Date(prevWeekStart);
      prevWeekEnd.setDate(prevWeekStart.getDate() + 6);

      const prevWeekStartStr = prevWeekStart.toISOString().slice(0, 10);
      const prevWeekEndStr = prevWeekEnd.toISOString().slice(0, 10);

      let prevAllocations: PlannerAllocation[] = [];
      if (onLoadWeek) {
        prevAllocations = await onLoadWeek({ weekStart: prevWeekStartStr, weekEnd: prevWeekEndStr });
      }

      if (role === "TEACHER" && teacherProfile) {
        prevAllocations = prevAllocations.filter(s => String(s.teacherId) === String(teacherProfile.id));
      }

      if (prevAllocations.length === 0) {
        toast.error("No schedule allocations found in the previous week.");
        return;
      }

      const cloned = prevAllocations.map((slot) => {
        const slotDate = new Date(`${slot.date}T00:00:00`);
        slotDate.setDate(slotDate.getDate() + 7);
        return {
          date: slotDate.toISOString().slice(0, 10),
          startTime: slot.startTime,
          endTime: slot.endTime,
          className: slot.className,
          subject: slot.subject,
          teacherId: slot.teacherId,
        };
      });

      if (onCreateAllocationBulk) {
        await onCreateAllocationBulk(cloned);
        toast.success(`Copied ${cloned.length} allocations from last week.`);
        await loadWeek(date);
      } else {
        toast.error("Bulk copy not configured.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to copy schedule.");
    } finally {
      setIsWeekLoading(false);
    }
  };

  const handleApplyToFutureWeeks = async () => {
    if (applySelectedWeeks.length === 0) {
      toast.error("Select at least one week to apply.");
      return;
    }

    let currentWeekSlots = [...displayedAllocations];
    if (role === "TEACHER" && teacherProfile) {
      currentWeekSlots = currentWeekSlots.filter(s => String(s.teacherId) === String(teacherProfile.id));
    }

    if (currentWeekSlots.length === 0) {
      toast.error("No allocations exist in the current week to copy.");
      return;
    }

    const bulkSlots: any[] = [];
    currentWeekSlots.forEach((slot) => {
      const slotDate = new Date(`${slot.date}T00:00:00`);
      const dayOffset = slotDate.getDay() === 0 ? 6 : slotDate.getDay() - 1;

      applySelectedWeeks.forEach((weekStartStr) => {
        const weekDate = new Date(`${weekStartStr}T00:00:00`);
        weekDate.setDate(weekDate.getDate() + dayOffset);
        bulkSlots.push({
          date: weekDate.toISOString().slice(0, 10),
          startTime: slot.startTime,
          endTime: slot.endTime,
          className: slot.className,
          subject: slot.subject,
          teacherId: slot.teacherId,
        });
      });
    });

    setIsSaving(true);
    try {
      if (onCreateAllocationBulk) {
        await onCreateAllocationBulk(bulkSlots);
        toast.success(`Applied schedule to ${applySelectedWeeks.length} future weeks.`);
        setShowApplyModal(false);
        setApplySelectedWeeks([]);
        await loadWeek(date);
      } else {
        toast.error("Bulk creation not configured.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to apply schedule.");
    } finally {
      setIsSaving(false);
    }
  };

  const formattedDate = (value: string) => {
    const d = new Date(`${value}T00:00:00`);
    const day = DAYS[d.getDay()] ?? "Mon";
    return `${day} ${value}`;
  };

  const weekBadgeText = `${formattedDate(weekRange.weekStart)} to ${formattedDate(weekRange.weekEnd)}`;

  // Generate 7 day grid cells
  const daysOfWeek = useMemo(() => {
    const monday = new Date(`${weekRange.weekStart}T00:00:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = DAYS[d.getDay()];
      return {
        date: dateStr,
        label,
        formatted: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      };
    });
  }, [weekRange.weekStart]);

  const slotsByDay = useMemo(() => {
    const result: Record<string, PlannerAllocation[]> = {};
    daysOfWeek.forEach((day) => {
      result[day.date] = displayedAllocations.filter((slot) => slot.date === day.date);
    });
    return result;
  }, [daysOfWeek, displayedAllocations]);

  const activeClasses = useMemo(
    () => new Set(displayedAllocations.map((slot) => slot.className)).size,
    [displayedAllocations],
  );

  const formInputClass =
    "h-11 w-full rounded-xl border border-border/80 bg-background/90 px-3 text-sm text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground/80 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

  const subtlePanelClass =
    "rounded-2xl border border-border/80 bg-card/90 p-4 shadow-[0_10px_30px_-18px_hsl(var(--foreground)/0.35)] backdrop-blur-sm";

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/40 p-4 shadow-[0_16px_40px_-24px_hsl(var(--foreground)/0.45)] sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Timetable + Schedule Planner
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {role === "TEACHER"
                ? "View and manage your own weekly timetable and schedule entries."
                : "Build weekly class schedules, prevent overlaps, and assign the right teacher quickly."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              Week: {weekBadgeText}
            </span>
            <span className="inline-flex items-center rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              {displayedAllocations.length} slot{displayedAllocations.length === 1 ? "" : "s"}
            </span>
            {role !== "TEACHER" && (
              <span className="inline-flex items-center rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                {activeClasses} active class{activeClasses === 1 ? "" : "es"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigator Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            Month:
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-background border border-border rounded px-2.5 py-1 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            Week:
            <select
              value={weekRange.weekStart}
              onChange={(e) => {
                setDate(e.target.value);
                void loadWeek(e.target.value);
              }}
              className="bg-background border border-border rounded px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
            >
              {weeks.map((wk) => (
                <option key={wk.weekStart} value={wk.weekStart}>
                  {wk.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyPreviousWeek}
            disabled={isWeekLoading}
            className="btn-outline h-9 px-3 text-xs font-medium bg-background text-foreground border border-border rounded-lg hover:bg-muted"
          >
            Copy Previous Week
          </button>
          <button
            onClick={() => setShowApplyModal(true)}
            className="btn-outline h-9 px-3 text-xs font-medium bg-background text-foreground border border-border rounded-lg hover:bg-muted"
          >
            Apply to Future Weeks
          </button>
        </div>
      </div>

      {/* Apply modal drawer */}
      {showApplyModal && (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 animate-[fade-in_200ms_ease-out] space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Apply Current Schedule to Future Weeks</h3>
            <p className="text-xs text-muted-foreground">Select future weeks in the month to clone current timetable slots to.</p>
          </div>
          {futureWeeks.length === 0 ? (
            <p className="text-xs text-warning font-medium">No future weeks available in this month.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {futureWeeks.map((wk) => (
                <label key={wk.weekStart} className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applySelectedWeeks.includes(wk.weekStart)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setApplySelectedWeeks([...applySelectedWeeks, wk.weekStart]);
                      } else {
                        setApplySelectedWeeks(applySelectedWeeks.filter((w) => w !== wk.weekStart));
                      }
                    }}
                    className="rounded border-border text-primary focus:ring-primary/30"
                  />
                  <span>{wk.label}</span>
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleApplyToFutureWeeks}
              disabled={isSaving || applySelectedWeeks.length === 0}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-95"
            >
              Apply Copy
            </button>
            <button
              onClick={() => {
                setShowApplyModal(false);
                setApplySelectedWeeks([]);
              }}
              className="px-3 py-1.5 bg-background text-foreground border border-border text-xs font-semibold rounded-lg hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Create Allocation section */}
      <section className={`${subtlePanelClass} space-y-4`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-foreground">
              {editingId ? "Edit Allocation" : "Schedule Sessions"}
            </h2>
            {!editingId && (
              <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/60">
                <button
                  onClick={() => setScheduleType("single")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    scheduleType === "single"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Single Session
                </button>
                <button
                  onClick={() => setScheduleType("recurring")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    scheduleType === "recurring"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Recurring Schedule
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isWeekLoading ? "Loading selected week..." : "All fields use 15-minute intervals."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {scheduleType === "single" ? (
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  void loadWeek(e.target.value);
                }}
                className={formInputClass}
                title="Date picker"
              />
            </label>
          ) : (
            <div className="xl:col-span-2 space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Select Days</span>
              <div className="flex flex-wrap gap-2.5 p-2.5 rounded-xl border border-border bg-background/80">
                {WEEK_DAYS.map((day) => (
                  <label key={day.value} className="flex items-center gap-1 text-xs text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(day.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDays([...selectedDays, day.value]);
                        } else {
                          setSelectedDays(selectedDays.filter((d) => d !== day.value));
                        }
                      }}
                      className="rounded border-border text-primary focus:ring-primary/30"
                    />
                    <span>{day.label.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start Time</span>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={formInputClass}
            >
              {TIME_SLOTS.map((slot) => (
                <option key={`start-${slot}`} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End Time</span>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={formInputClass}
            >
              {TIME_SLOTS.map((slot) => (
                <option key={`end-${slot}`} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Class</span>
            <select
              value={className}
              onChange={(e) => {
                setClassName(e.target.value);
                setSubject("");
                if (role !== "TEACHER") {
                  setTeacherId("");
                }
              }}
              className={formInputClass}
            >
              <option value="">Select class</option>
              {computedClassOptions.map((cn) => (
                <option key={cn} value={cn}>
                  {cn}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <label className="space-y-1.5 lg:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</span>
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (role !== "TEACHER") {
                  setTeacherId("");
                }
              }}
              className={formInputClass}
              disabled={!className || missingCoursesForClass}
            >
              <option value="">Select subject</option>
              {classSpecificSubjects.map((sn) => (
                <option key={sn} value={sn}>
                  {sn}
                </option>
              ))}
            </select>
          </label>

          {role !== "TEACHER" ? (
            <label className="space-y-1.5 lg:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Teacher</span>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className={formInputClass}
                disabled={!className || !subject}
              >
                <option value="">Select teacher</option>
                {eligibleTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.classes.join(", ")})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="lg:col-span-2 flex flex-col justify-end">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Teacher Perspective</span>
              <div className="h-11 flex items-center bg-muted/30 border border-border/80 px-3.5 rounded-xl text-sm font-medium text-foreground">
                {teacherProfile?.name} (You)
              </div>
            </div>
          )}

          <div className="lg:col-span-1 flex flex-col justify-end">
            <div className="rounded-xl border border-border/80 bg-muted/30 px-3.5 py-3 text-[11px] leading-5 text-muted-foreground h-11 flex items-center overflow-hidden">
              <span className="truncate">{teacherHelperText}</span>
            </div>
          </div>
        </div>

        {/* Display recurring target weeks picker */}
        {scheduleType === "recurring" && (
          <div className="animate-[fade-in-up_250ms_ease-out] space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Select Target Weeks (Remaining of Month: {selectedMonth})
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 p-3 rounded-xl border border-border bg-background/80">
              {weeks.map((wk) => {
                const isRemaining = wk.weekEnd >= today;
                return (
                  <label key={wk.weekStart} className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={targetWeeks.includes(wk.weekStart)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTargetWeeks([...targetWeeks, wk.weekStart]);
                        } else {
                          setTargetWeeks(targetWeeks.filter((w) => w !== wk.weekStart));
                        }
                      }}
                      className="rounded border-border text-primary focus:ring-primary/30"
                    />
                    <span className={isRemaining ? "font-semibold" : "text-muted-foreground"}>
                      {wk.label} {isRemaining ? "(Remaining)" : "(Past)"}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {selectedTeacher && role !== "TEACHER" && (
          <div className="animate-[fade-in-up_300ms_ease-out] rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{selectedTeacher.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Classes: {selectedTeacher.classes.join(", ") || "None"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Courses for {className || "selected class"}: {" "}
              {className
                ? (selectedTeacher.classSubjects?.[className] ?? [])
                    .filter(Boolean)
                    .join(", ") || selectedTeacher.subject || "None"
                : selectedTeacher.subject || "None"}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => {
              void applyAllocation();
            }}
            disabled={disableSave || isSaving}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:translate-y-[-1px] hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : editingId ? "Save Changes" : scheduleType === "recurring" ? "Schedule Recurring" : "Add Session"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </section>

      {/* Conflicts alerts section */}
      <section className={subtlePanelClass}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-base font-semibold text-foreground">Conflict Alerts</p>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
              conflicts.length > 0
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-border bg-background text-muted-foreground"
            }`}
          >
            {conflicts.length}
          </span>
        </div>

        <div className="space-y-2">
          {conflicts.length === 0 && (
            <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
              No scheduling conflicts detected in this week.
            </div>
          )}

          {conflicts.map((slot) => (
            <div
              key={`conflict-${slot.id}`}
              className="animate-[fade-in-up_250ms_ease-out] rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-foreground"
            >
              <span className="font-medium">{slot.teacherName}</span> has overlapping classes on {slot.date} ({slot.startTime} to {slot.endTime}).
            </div>
          ))}
        </div>
      </section>

      {/* Calendar Grid View */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 border-b border-border/80 pb-3">
          <h2 className="text-base font-semibold text-foreground">Weekly Calendar Board</h2>
          <p className="text-xs text-muted-foreground">Showing classes and schedule allocations for {weekBadgeText}.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
          {daysOfWeek.map((day) => {
            const daySlots = slotsByDay[day.date] || [];
            return (
              <div key={day.date} className="rounded-xl border border-border bg-card p-3 shadow-sm flex flex-col min-h-[280px]">
                <div className="border-b border-border/85 pb-2 mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{day.label}</p>
                    <p className="text-sm font-bold text-foreground">{day.formatted}</p>
                  </div>
                  <span className="text-[10px] bg-muted/70 px-2 py-0.5 rounded font-bold text-muted-foreground">
                    {daySlots.length}
                  </span>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto">
                  {daySlots.length === 0 ? (
                    <div className="h-full flex items-center justify-center border border-dashed border-border/50 rounded-lg p-4">
                      <p className="text-[11px] text-muted-foreground text-center italic">No classes scheduled</p>
                    </div>
                  ) : (
                    daySlots.map((slot) => {
                      const isOwner = role !== "TEACHER" || String(slot.teacherId) === String(teacherProfile?.id);
                      return (
                        <div
                          key={slot.id}
                          className={`p-2.5 rounded-lg border text-xs shadow-sm flex flex-col justify-between gap-2.5 ${
                            isOwner
                              ? "bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors"
                              : "bg-muted/10 border-border/70"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-primary">{slot.startTime} - {slot.endTime}</span>
                            </div>
                            <p className="font-bold text-foreground truncate">{slot.className}</p>
                            <p className="text-muted-foreground truncate">{slot.subject}</p>
                            {role !== "TEACHER" && (
                              <p className="text-[10px] text-muted-foreground mt-1.5 italic border-t border-border/40 pt-1">
                                Teacher: {slot.teacherName}
                              </p>
                            )}
                          </div>
                          {isOwner && (
                            <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40">
                              <button
                                onClick={() => startEdit(slot)}
                                className="flex-1 text-[10px] text-center text-muted-foreground hover:text-foreground py-0.5 bg-background border border-border rounded"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => void removeAllocation(slot.id)}
                                disabled={deletingId === slot.id}
                                className="flex-1 text-[10px] text-center text-destructive/80 hover:text-destructive py-0.5 bg-background border border-border rounded"
                              >
                                {deletingId === slot.id ? "..." : "Delete"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default AdminTimetablePlanner;
