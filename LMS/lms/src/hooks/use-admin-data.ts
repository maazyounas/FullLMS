import { useEffect, useMemo, useState } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import type { Announcement, Student, Teacher } from "@/types/domain";
import type { AdminTeacherRecord } from "@/components/admin/teacher/types";
import type {
  AuditLogEntry,
  FeeTransaction,
  PlannerAllocation,
} from "@/components/admin/types";
import { ApiRequestError, apiAuthRequest } from "@/lib/api";

type BackendStudent = {
  id: string;
  admissionNo: string;
  name: string;
  email: string;
  grade: string;
  guardian: string;
  guardianPhone: string;
  gender?: string;
  dob?: string;
  phone?: string;
  address?: string;
  subjects?: string[];
  status: string;
};

type BackendTeacher = {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  subject: string;
  gender?: string;
  qualification?: string;
  phone?: string;
  address?: string;
  dob?: string;
  classes: string[];
  classSubjects?: Record<string, string[]>;
  status: string;
  emergencyContact?: string;
  emergencyPhone?: string;
};

type BackendAnnouncement = {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  authorName: string;
  publishedAt: string;
};

type BackendFeeTransaction = {
  id: string;
  studentId: string;
  receiptNo: string;
  amount: number;
  method: FeeTransaction["method"];
  collector: string;
  remarks?: string;
  paidAt: string;
};

type BackendFeeDuesItem = {
  studentId: string;
  totalDue: number;
  totalPaid: number;
  pending: number;
};

type BackendFeeStudentSummary = {
  studentId: string;
  totalDue: number;
  totalPaid: number;
  pending: number;
  status: "Paid" | "Partial" | "Pending";
};

type BackendClass = {
  id: string;
  grade: string;
  section: string;
  academicYear: string;
  displayName: string;
  subjects: string[];
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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const toPlannerDay = (dateValue: string): PlannerAllocation["day"] => {
  const date = new Date(`${dateValue}T00:00:00`);
  const label = DAYS[date.getDay()];
  if (label === "Mon" || label === "Tue" || label === "Wed" || label === "Thu" || label === "Fri") {
    return label;
  }
  return "Mon";
};

const formatTimeRange = (start?: string, end?: string) => {
  if (!start || !end) return "";
  return `${start} - ${end}`;
};

const getWeekRange = (baseDate = new Date()) => {
  const date = new Date(baseDate);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);

  const toISODate = (d: Date) => d.toISOString().slice(0, 10);
  return {
    weekStart: toISODate(weekStart),
    weekEnd: toISODate(weekEnd),
  };
};

const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value.replace(/[^0-9]/g, ""));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const mapStudent = (student: BackendStudent, index: number): Student => {
  const id = toNumber(student.admissionNo, index + 1);
  const subjects = (student.subjects ?? []).filter(Boolean);
  return {
    id,
    backendId: student.id,
    admissionNo: student.admissionNo,
    name: student.name,
    email: student.email,
    grade: student.grade,
    avatar: initials(student.name),
    gender: student.gender ?? "",
    dob: student.dob ?? "",
    phone: student.phone ?? "",
    guardian: student.guardian,
    guardianPhone: student.guardianPhone,
    address: student.address ?? "",
    enrollDate: "",
    status: student.status,
    attendance: { present: 0, absent: 0, late: 0, total: 0 },
    tests: subjects.map((subject) => ({
      subject,
      test: 'Enrollment Subject',
      marks: 0,
      total: 100,
      date: new Date().toISOString().slice(0, 10),
      grade: 'N/A',
    })),
    progress: [],
    assignments: [],
    behavior: [],
    fees: { total: 0, paid: 0, pending: 0, status: "Pending" },
  };
};

const mapTeacher = (teacher: BackendTeacher, index: number): AdminTeacherRecord => {
  const id = toNumber(teacher.employeeNo, index + 1);
  const record: Teacher = {
    id,
    backendId: teacher.id,
    employeeNo: teacher.employeeNo,
    name: teacher.name,
    subject: teacher.subject,
    email: teacher.email,
    avatar: initials(teacher.name),
    classes: teacher.classes,
    students: 0,
    phone: teacher.phone ?? "",
    address: teacher.address ?? "",
    dob: teacher.dob ?? "",
    gender: teacher.gender ?? "",
    qualification: teacher.qualification ?? "",
    joinDate: "",
    emergencyContact: teacher.emergencyContact ?? "",
    emergencyPhone: teacher.emergencyPhone ?? "",
    status: teacher.status,
  };
  return {
    ...record,
    classSubjects: teacher.classSubjects ?? {},
  };
};

const mapAnnouncement = (announcement: BackendAnnouncement, index: number): Announcement => ({
  id: toNumber(announcement.id, index + 1),
  title: announcement.title,
  date: announcement.publishedAt.slice(0, 10),
  priority: announcement.priority,
  content: announcement.content,
  author: announcement.authorName,
});

const feeStatusFromSummary = (summary: {
  totalDue: number;
  totalPaid: number;
  pending: number;
}): "Paid" | "Partial" | "Pending" => {
  if (summary.pending <= 0 && summary.totalDue > 0) return "Paid";
  if (summary.totalPaid > 0) return "Partial";
  return "Pending";
};

export const useAdminData = () => {
  const [studentIdMap, setStudentIdMap] = useState<Record<number, string>>({});
  const [teacherIdMap, setTeacherIdMap] = useState<Record<number, string>>({});
  const [classIdMap, setClassIdMap] = useState<Record<string, string>>({});

  const [announcements, setAnnouncements] = usePersistentState<Announcement[]>({
    key: "announcements",
    defaultValue: [],
  });
  const [students, setStudents] = usePersistentState<Student[]>({
    key: "students",
    defaultValue: [],
  });
  const [teachers, setTeachers] = usePersistentState<AdminTeacherRecord[]>({
    key: "teachers",
    defaultValue: [],
  });
  const [feeTransactions, setFeeTransactions] = usePersistentState<FeeTransaction[]>({
    key: "fee-transactions",
    defaultValue: [],
  });
  const [auditLogs, setAuditLogs] = usePersistentState<AuditLogEntry[]>({
    key: "audit-logs",
    defaultValue: [],
  });
  const [plannerAllocations, setPlannerAllocations] = usePersistentState<PlannerAllocation[]>({
    key: "planner-allocations",
    defaultValue: [],
  });
  const [customClasses, setCustomClasses] = usePersistentState<string[]>({
    key: "custom-classes",
    defaultValue: [],
  });
  const [classSubjects, setClassSubjects] = usePersistentState<Record<string, string[]>>({
    key: "class-subjects",
    defaultValue: {},
  });

  const teacherBackendByName = useMemo(
    () =>
      Object.fromEntries(
        teachers
          .map((teacher) => {
            const backendId = teacherIdMap[teacher.id];
            if (!backendId) return null;
            return [teacher.name.trim().toLowerCase(), backendId] as const;
          })
          .filter((entry): entry is readonly [string, string] => Boolean(entry)),
      ),
    [teacherIdMap, teachers],
  );

  const applyClassesSnapshot = (classRows: BackendClass[]) => {
    const nextClassIdMap: Record<string, string> = {};
    const nextClassSubjects: Record<string, string[]> = {};
    const nextCustomClasses = classRows
      .map((item) => {
        nextClassIdMap[item.displayName] = item.id;
        nextClassSubjects[item.displayName] = item.subjects ?? [];
        return item.displayName;
      })
      .filter(Boolean)
      .sort();

    setClassIdMap(nextClassIdMap);
    setCustomClasses(nextCustomClasses);
    setClassSubjects(nextClassSubjects);
  };

  const refreshClassesFromServer = async () => {
    const classRows = await apiAuthRequest<BackendClass[]>("/classes");
    applyClassesSnapshot(classRows);
  };

  const mapBackendSlotToPlanner = (
    slot: BackendTimetableSlot,
    backendTeacherToNumeric: Record<string, number>,
  ): PlannerAllocation => ({
    id: slot.id,
    day: toPlannerDay(slot.date),
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    time: formatTimeRange(slot.startTime, slot.endTime),
    className: slot.className,
    subject: slot.subject,
    teacherId: backendTeacherToNumeric[slot.teacherId] ?? 0,
    teacherName: slot.teacherName,
  });

  useEffect(() => {
    let mounted = true;

    const loadAdminData = async () => {
      try {
        const { weekStart, weekEnd } = getWeekRange();
        const [studentRes, teacherRes, announcementRes, transactionRes, classRes, duesRes, timetableRes] = await Promise.all([
          apiAuthRequest<BackendStudent[]>("/students"),
          apiAuthRequest<BackendTeacher[]>("/teachers"),
          apiAuthRequest<BackendAnnouncement[]>("/announcements"),
          apiAuthRequest<BackendFeeTransaction[]>("/fees/transactions"),
          apiAuthRequest<BackendClass[]>('/classes'),
          apiAuthRequest<BackendFeeDuesItem[]>('/fees/reports/dues'),
          apiAuthRequest<BackendTimetableSlot[]>(
            `/timetable/slots?weekStart=${weekStart}&weekEnd=${weekEnd}`,
          ).catch(() => []),
        ]);

        if (!mounted) return;

        const duesByStudentId = new Map<string, BackendFeeDuesItem>(
          duesRes.map((item) => [item.studentId, item]),
        );

        const nextStudents = studentRes.map((student, index) => {
          const mapped = mapStudent(student, index);
          const summary = duesByStudentId.get(student.id);
          if (!summary) return mapped;

          return {
            ...mapped,
            fees: {
              total: summary.totalDue,
              paid: summary.totalPaid,
              pending: summary.pending,
              status: feeStatusFromSummary(summary),
            },
          };
        });
        const studentByBackendKey = new Map<string, Student>();
        const nextStudentMap: Record<number, string> = {};
        const nextTeacherMap: Record<number, string> = {};

        studentRes.forEach((student, index) => {
          const mapped = nextStudents[index];
          studentByBackendKey.set(student.id, mapped);
          studentByBackendKey.set(student.admissionNo, mapped);
          nextStudentMap[mapped.id] = student.id;
        });

        setStudents(nextStudents);
        setStudentIdMap(nextStudentMap);
        const nextTeachers = teacherRes.map(mapTeacher);
        teacherRes.forEach((teacher, index) => {
          nextTeacherMap[nextTeachers[index].id] = teacher.id;
        });
        const backendTeacherToNumeric = Object.fromEntries(
          Object.entries(nextTeacherMap).map(([numericId, backendId]) => [backendId, Number(numericId)]),
        );
        setTeacherIdMap(nextTeacherMap);
        setTeachers(nextTeachers);
        setAnnouncements(announcementRes.map(mapAnnouncement));
        applyClassesSnapshot(classRes);
        setFeeTransactions(
          transactionRes.map((tx) => {
            const student = studentByBackendKey.get(tx.studentId);
            const numericId = student?.id ?? 0;
            return {
              id: tx.id,
              receiptNo: tx.receiptNo,
              studentId: numericId,
              studentName: student?.name ?? `Student ${tx.studentId}`,
              className: student?.grade ?? "",
              amount: tx.amount,
              method: tx.method,
              collector: tx.collector,
              remarks: tx.remarks ?? "",
              transactionDate: tx.paidAt,
            } as FeeTransaction;
          }),
        );
        setPlannerAllocations(
          timetableRes.map((slot) =>
            mapBackendSlotToPlanner(slot, backendTeacherToNumeric),
          ),
        );
      } catch {
        // Keep existing local fallback state when API calls fail.
      }
    };

    void loadAdminData();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setAnnouncements, setFeeTransactions, setPlannerAllocations, setStudents, setTeachers]);

  const fetchPlannerAllocations = async (args: {
    weekStart: string;
    weekEnd: string;
  }) => {
    const rows = await apiAuthRequest<BackendTimetableSlot[]>(
      `/timetable/slots?weekStart=${args.weekStart}&weekEnd=${args.weekEnd}`,
    );
    const backendTeacherToNumeric = Object.fromEntries(
      Object.entries(teacherIdMap).map(([numericId, backendId]) => [backendId, Number(numericId)]),
    );
    const mapped = rows.map((slot) =>
      mapBackendSlotToPlanner(slot, backendTeacherToNumeric),
    );
    setPlannerAllocations(mapped);
    return mapped;
  };

  const createPlannerAllocation = async (slot: {
    date: string;
    startTime: string;
    endTime: string;
    className: string;
    subject: string;
    teacherId: number;
  }) => {
    const selectedTeacher = teachers.find((teacher) => teacher.id === slot.teacherId);
    const backendTeacherId =
      teacherIdMap[slot.teacherId] ??
      (selectedTeacher ? teacherBackendByName[selectedTeacher.name.trim().toLowerCase()] : undefined);
    if (!backendTeacherId) {
      throw new Error('Selected teacher is not synced with backend. Refresh and try again.');
    }

    let created: BackendTimetableSlot;
    try {
      created = await apiAuthRequest<BackendTimetableSlot>('/timetable/slots', {
        method: 'POST',
        body: JSON.stringify({
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          className: slot.className,
          subject: slot.subject,
          teacherId: backendTeacherId,
        }),
      });
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        throw new Error('Timetable endpoint not found (404). Restart backend with latest code.');
      }
      throw error;
    }

    const mapped = mapBackendSlotToPlanner(created, { [backendTeacherId]: slot.teacherId });
    setPlannerAllocations((prev) => [mapped, ...prev]);
    return mapped;
  };

  const createPlannerAllocationsBulk = async (
    slots: {
      date: string;
      startTime: string;
      endTime: string;
      className: string;
      subject: string;
      teacherId: number;
    }[]
  ) => {
    const payload = slots.map((slot) => {
      const selectedTeacher = teachers.find((teacher) => teacher.id === slot.teacherId);
      const backendTeacherId =
        teacherIdMap[slot.teacherId] ??
        (selectedTeacher ? teacherBackendByName[selectedTeacher.name.trim().toLowerCase()] : undefined);
      if (!backendTeacherId) {
        throw new Error('Selected teacher is not synced with backend. Refresh and try again.');
      }
      return {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        className: slot.className,
        subject: slot.subject,
        teacherId: backendTeacherId,
      };
    });

    const response = await apiAuthRequest<{ data: BackendTimetableSlot[] }>('/timetable/slots/bulk', {
      method: 'POST',
      body: JSON.stringify({ slots: payload }),
    });

    const created = response.data || [];

    const idMap: Record<string, number> = {};
    slots.forEach(slot => {
      const selectedTeacher = teachers.find((t) => t.id === slot.teacherId);
      const backendTeacherId = teacherIdMap[slot.teacherId] ?? (selectedTeacher ? teacherBackendByName[selectedTeacher.name.trim().toLowerCase()] : undefined);
      if (backendTeacherId) {
        idMap[backendTeacherId] = slot.teacherId;
      }
    });

    const mapped = created.map(item => mapBackendSlotToPlanner(item, idMap));
    setPlannerAllocations((prev) => [...mapped, ...prev]);
    return mapped;
  };

  const updatePlannerAllocation = async (
    allocationId: string,
    slot: {
      date: string;
      startTime: string;
      endTime: string;
      className: string;
      subject: string;
      teacherId: number;
    },
  ) => {
    const selectedTeacher = teachers.find((teacher) => teacher.id === slot.teacherId);
    const backendTeacherId =
      teacherIdMap[slot.teacherId] ??
      (selectedTeacher ? teacherBackendByName[selectedTeacher.name.trim().toLowerCase()] : undefined);
    if (!backendTeacherId) {
      throw new Error('Selected teacher is not synced with backend. Refresh and try again.');
    }

    const updated = await apiAuthRequest<BackendTimetableSlot>(`/timetable/slots/${allocationId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        className: slot.className,
        subject: slot.subject,
        teacherId: backendTeacherId,
      }),
    });

    const mapped = mapBackendSlotToPlanner(updated, { [backendTeacherId]: slot.teacherId });
    setPlannerAllocations((prev) =>
      prev.map((item) => (item.id === allocationId ? mapped : item)),
    );
    return mapped;
  };

  const deletePlannerAllocation = async (allocationId: string) => {
    await apiAuthRequest<{ id: string }>(`/timetable/slots/${allocationId}`, {
      method: 'DELETE',
    });

    setPlannerAllocations((prev) => prev.filter((item) => item.id !== allocationId));
  };

  const createAnnouncement = async (payload: {
    title: string;
    content: string;
    priority?: "low" | "medium" | "high";
  }) => {
    const created = await apiAuthRequest<BackendAnnouncement>("/announcements", {
      method: "POST",
      body: JSON.stringify({
        title: payload.title,
        content: payload.content,
        priority: payload.priority ?? "medium",
        targetType: "all",
      }),
    });

    const mapped = mapAnnouncement(created, Date.now());
    setAnnouncements((prev) => [mapped, ...prev]);
    return mapped;
  };

  const createFeeTransaction = async (transaction: FeeTransaction) => {
    const backendStudentId = studentIdMap[transaction.studentId];
    if (!backendStudentId) {
      return;
    }

    const created = await apiAuthRequest<BackendFeeTransaction>("/fees/transactions", {
      method: "POST",
      body: JSON.stringify({
        studentId: backendStudentId,
        amount: transaction.amount,
        method: transaction.method,
        collector: transaction.collector,
        remarks: transaction.remarks,
      }),
    });

    setFeeTransactions((prev) => {
      const exists = prev.some((item) => item.id === created.id);
      if (exists) return prev;

      return [
        {
          id: created.id,
          receiptNo: created.receiptNo,
          studentId: transaction.studentId,
          studentName: transaction.studentName,
          className: transaction.className,
          amount: created.amount,
          method: created.method,
          collector: created.collector,
          remarks: created.remarks ?? "",
          transactionDate: created.paidAt,
        },
        ...prev,
      ];
    });

    const summary = await apiAuthRequest<BackendFeeStudentSummary>(
      `/fees/students/${backendStudentId}/summary`,
    );

    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== transaction.studentId) return student;
        return {
          ...student,
          fees: {
            total: summary.totalDue,
            paid: summary.totalPaid,
            pending: summary.pending,
            status: summary.status,
          },
        };
      }),
    );
  };

  const updateFeeTransaction = async (
    txId: string,
    updates: {
      amount: number;
      method: FeeTransaction['method'];
      collector: string;
      remarks: string;
    },
  ) => {
    const existing = feeTransactions.find((tx) => tx.id === txId);
    if (!existing) return;

    const backendStudentId = studentIdMap[existing.studentId];
    if (!backendStudentId) return;

    const updated = await apiAuthRequest<BackendFeeTransaction>(`/fees/transactions/${txId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });

    setFeeTransactions((prev) =>
      prev.map((tx) =>
        tx.id === txId
          ? {
              ...tx,
              amount: updated.amount,
              method: updated.method,
              collector: updated.collector,
              remarks: updated.remarks ?? '',
              transactionDate: updated.paidAt,
            }
          : tx,
      ),
    );

    const summary = await apiAuthRequest<BackendFeeStudentSummary>(
      `/fees/students/${backendStudentId}/summary`,
    );

    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== existing.studentId) return student;
        return {
          ...student,
          fees: {
            total: summary.totalDue,
            paid: summary.totalPaid,
            pending: summary.pending,
            status: summary.status,
          },
        };
      }),
    );
  };

  const assignStudentFeeDue = async (args: {
    studentId: number;
    period: string;
    amountDue: number;
  }) => {
    const backendStudentId = studentIdMap[args.studentId];
    if (!backendStudentId) {
      throw new Error('Student is not synced with backend yet. Re-open the page and try again.');
    }

    try {
      await apiAuthRequest<{
        id: string;
        studentId: string;
        period: string;
        amountDue: number;
        status: 'Paid' | 'Partial' | 'Pending';
      }>('/fees/invoices/upsert', {
        method: 'POST',
        body: JSON.stringify({
          studentId: backendStudentId,
          period: args.period,
          amountDue: args.amountDue,
        }),
      });
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        throw new Error('Fee invoice endpoint not found (404). Restart backend so latest routes are loaded.');
      }
      throw error;
    }

    const summary = await apiAuthRequest<BackendFeeStudentSummary>(
      `/fees/students/${backendStudentId}/summary`,
    );

    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== args.studentId) return student;
        return {
          ...student,
          fees: {
            total: summary.totalDue,
            paid: summary.totalPaid,
            pending: summary.pending,
            status: summary.status,
          },
        };
      }),
    );
  };

  const createStudent = async (student: Student) => {
    const selectedSubjects = Array.from(
      new Set(student.tests.map((item) => item.subject).filter(Boolean)),
    );

    const created = await apiAuthRequest<BackendStudent>("/students", {
      method: "POST",
      body: JSON.stringify({
        admissionNo: student.admissionNo ?? String(student.id),
        name: student.name,
        email: student.email,
        grade: student.grade,
        guardian: student.guardian,
        guardianPhone: student.guardianPhone,
        subjects: selectedSubjects,
        enrolledCourses: selectedSubjects,
      }),
    });

    const mapped = mapStudent(created, students.length);
    const merged: Student = {
      ...student,
      ...mapped,
      tests: student.tests,
      progress: student.progress,
      assignments: student.assignments,
      behavior: student.behavior,
      fees: student.fees,
    };

    setStudents((prev) => [...prev, merged]);
    setStudentIdMap((prev) => ({ ...prev, [merged.id]: created.id }));
    return merged;
  };

  const updateStudent = async (student: Student) => {
    const backendStudentId = studentIdMap[student.id];
    if (!backendStudentId) {
      setStudents((prev) => prev.map((item) => (item.id === student.id ? student : item)));
      return student;
    }

    const selectedSubjects = Array.from(
      new Set(student.tests.map((item) => item.subject).filter(Boolean)),
    );

    const updated = await apiAuthRequest<BackendStudent>(`/students/${backendStudentId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: student.name,
        email: student.email,
        grade: student.grade,
        guardian: student.guardian,
        guardianPhone: student.guardianPhone,
        subjects: selectedSubjects,
        enrolledCourses: selectedSubjects,
        status: student.status,
      }),
    });

    const mapped = mapStudent(updated, 0);
    const merged: Student = {
      ...student,
      ...mapped,
      tests: student.tests,
      progress: student.progress,
      assignments: student.assignments,
      behavior: student.behavior,
      fees: student.fees,
    };

    setStudents((prev) => prev.map((item) => (item.id === merged.id ? merged : item)));
    return merged;
  };

  const deleteStudent = async (studentId: number) => {
    const backendStudentId = studentIdMap[studentId];
    if (backendStudentId) {
      await apiAuthRequest<{ id: string }>(`/students/${backendStudentId}`, {
        method: "DELETE",
      });
    }

    setStudents((prev) => prev.filter((student) => student.id !== studentId));
    setStudentIdMap((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  };

  const resetStudentPassword = async (studentId: number) => {
    const backendStudentId = studentIdMap[studentId];
    if (!backendStudentId) {
      return String(studentId);
    }

    const result = await apiAuthRequest<{ id: string; defaultPassword: string }>(
      `/students/${backendStudentId}/reset-password`,
      {
        method: "POST",
      },
    );

    return result.defaultPassword;
  };

  const createTeacher = async (teacher: AdminTeacherRecord) => {
    const created = await apiAuthRequest<BackendTeacher>("/teachers", {
      method: "POST",
      body: JSON.stringify({
        employeeNo: teacher.employeeNo ?? String(teacher.id),
        name: teacher.name,
        email: teacher.email,
        subject: teacher.subject,
        gender: teacher.gender,
        qualification: teacher.qualification,
        classes: teacher.classes,
        classSubjects: teacher.classSubjects ?? {},
      }),
    });

    const mapped = mapTeacher(created, teachers.length);
    const merged: AdminTeacherRecord = {
      ...teacher,
      ...mapped,
      classSubjects: teacher.classSubjects,
    };

    setTeachers((prev) => [...prev, merged]);
    setTeacherIdMap((prev) => ({ ...prev, [merged.id]: created.id }));
    return merged;
  };

  const updateTeacher = async (
    teacher: AdminTeacherRecord,
    previousTeacherId?: number,
  ) => {
    const previousTeacher = teachers.find(
      (item) => item.id === (previousTeacherId ?? teacher.id),
    );
    const backendTeacherId =
      teacherIdMap[teacher.id] ??
      (previousTeacher ? teacherIdMap[previousTeacher.id] : undefined);
    if (!backendTeacherId) {
      setTeachers((prev) =>
        prev.map((item) =>
          item.id === (previousTeacherId ?? teacher.id) ? teacher : item,
        ),
      );
      return teacher;
    }

    const updated = await apiAuthRequest<BackendTeacher>(`/teachers/${backendTeacherId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: teacher.name,
        email: teacher.email,
        subject: teacher.subject,
        gender: teacher.gender,
        qualification: teacher.qualification,
        classes: teacher.classes,
        classSubjects: teacher.classSubjects ?? {},
        status: teacher.status,
      }),
    });

    const mapped = mapTeacher(updated, 0);
    const merged: AdminTeacherRecord = {
      ...teacher,
      ...mapped,
      classSubjects: teacher.classSubjects,
    };

    setTeachers((prev) =>
      prev.map((item) =>
        item.id === (previousTeacherId ?? merged.id) ? merged : item,
      ),
    );
    setTeacherIdMap((prev) => {
      const next = { ...prev };
      const previousId = previousTeacherId ?? previousTeacher?.id;
      if (previousId !== undefined && previousId !== merged.id) {
        delete next[previousId];
      }
      next[merged.id] = backendTeacherId;
      return next;
    });
    return merged;
  };

  const deleteTeacher = async (teacherId: number) => {
    const backendTeacherId = teacherIdMap[teacherId];
    if (backendTeacherId) {
      await apiAuthRequest<{ id: string }>(`/teachers/${backendTeacherId}`, {
        method: "DELETE",
      });
    }

    setTeachers((prev) => prev.filter((teacher) => teacher.id !== teacherId));
    setTeacherIdMap((prev) => {
      const next = { ...prev };
      delete next[teacherId];
      return next;
    });
  };

  const resetTeacherPassword = async (teacherId: number) => {
    const backendTeacherId = teacherIdMap[teacherId];
    if (!backendTeacherId) {
      return String(teacherId);
    }

    const result = await apiAuthRequest<{ id: string; defaultPassword: string }>(
      `/teachers/${backendTeacherId}/reset-password`,
      {
        method: "POST",
      },
    );

    return result.defaultPassword;
  };

  const splitClassName = (value: string) => {
    const trimmed = value.trim();
    const dash = trimmed.lastIndexOf("-");
    if (dash > 0 && dash < trimmed.length - 1) {
      return {
        grade: trimmed.slice(0, dash).trim(),
        section: trimmed.slice(dash + 1).trim(),
      };
    }

    return {
      grade: trimmed,
      section: "",
    };
  };

  const currentAcademicYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    return `${year}-${year + 1}`;
  };

  const createClass = async (className: string) => {
    const normalized = className.trim();
    if (!normalized) return;
    if (classIdMap[normalized]) return;

    const parsed = splitClassName(normalized);
    await apiAuthRequest<BackendClass>("/classes", {
      method: "POST",
      body: JSON.stringify({
        grade: parsed.grade,
        section: parsed.section,
        academicYear: currentAcademicYear(),
        subjects: [],
      }),
    });

    await refreshClassesFromServer();
  };

  const deleteClass = async (className: string) => {
    const classId = classIdMap[className];
    if (!classId) return;

    await apiAuthRequest<{ success: boolean }>(`/classes/${classId}`, {
      method: "DELETE",
    });

    await refreshClassesFromServer();
  };

  const addClassSubject = async (className: string, subject: string) => {
    const classId = classIdMap[className];
    if (!classId) return;

    const current = classSubjects[className] ?? [];
    if (current.includes(subject)) return;

    await apiAuthRequest<BackendClass>(`/classes/${classId}`, {
      method: "PATCH",
      body: JSON.stringify({
        subjects: [...current, subject],
      }),
    });

    await refreshClassesFromServer();
  };

  const deleteClassSubject = async (className: string, subject: string) => {
    const classId = classIdMap[className];
    if (!classId) return;

    const current = classSubjects[className] ?? [];
    const nextSubjects = current.filter((item) => item !== subject);

    await apiAuthRequest<BackendClass>(`/classes/${classId}`, {
      method: "PATCH",
      body: JSON.stringify({
        subjects: nextSubjects,
      }),
    });

    await refreshClassesFromServer();
  };

  const addAuditLog = (entry: Omit<AuditLogEntry, "id" | "createdAt">) => {
    const nextEntry: AuditLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [nextEntry, ...prev]);
  };

  return {
    announcements,
    setAnnouncements,
    students,
    setStudents,
    teachers,
    setTeachers,
    feeTransactions,
    setFeeTransactions,
    auditLogs,
    setAuditLogs,
    plannerAllocations,
    setPlannerAllocations,
    customClasses,
    setCustomClasses,
    classSubjects,
    setClassSubjects,
    addAuditLog,
    createAnnouncement,
    createFeeTransaction,
    updateFeeTransaction,
    assignStudentFeeDue,
    createStudent,
    updateStudent,
    deleteStudent,
    resetStudentPassword,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    resetTeacherPassword,
    createClass,
    deleteClass,
    addClassSubject,
    deleteClassSubject,
    fetchPlannerAllocations,
    createPlannerAllocation,
    createPlannerAllocationsBulk,
    updatePlannerAllocation,
    deletePlannerAllocation,
  } as const;
};
