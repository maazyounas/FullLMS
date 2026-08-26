import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Calendar,
  CheckCircle2,
  User,
  CalendarOff,
  Megaphone,
  CalendarCheck,
  UserCog,
  Wallet,
  CalendarClock,
  Layers3,
  FileText,
  Settings,
  CalendarDays,
  GraduationCap,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import {
  type Course,
  type Student,
  type Teacher,
  type Announcement,
} from "@/types/domain";
import TeacherDashboard from "@/components/teacher/dashboard/TeacherDashboard";
import TeacherClasses from "@/components/teacher/classes/TeacherClasses";
import TeacherProfile from "@/components/teacher/profile/TeacherProfile";
import TeacherLeave from "@/components/teacher/leave/TeacherLeave";
import TeacherAssignments from "@/components/teacher/assignments/TeacherAssignments";
import TeacherNotifications from "@/components/teacher/notifications/TeacherNotifications";
import TeacherAnnouncements from "@/components/teacher/announcements/TeacherAnnouncements";
import TeacherCreateQuiz from "@/components/teacher/quizzes/TeacherCreateQuiz";
import TeacherCheckQuizzes from "@/components/teacher/quizzes/TeacherCheckQuizzes";
import TeacherAttendance from "@/components/teacher/attendance/TeacherAttendance";
import AdminAttendance from "@/components/admin/attendance/AdminAttendance";
import TeacherGradebook from "@/components/teacher/gradebook/TeacherGradebook";
import TeacherTimetable from "@/components/teacher/timetable/TeacherTimetable";
import AdminStudent from "@/components/admin/student/AdminStudent";
import AdminTeacher from "@/components/admin/teacher/AdminTeacher";
import FeeManagement from "@/components/admin/fee/FeeManagement";
import AdminTimetablePlanner from "@/components/admin/planner/AdminTimetablePlanner";
import AdminCreateClass from "@/components/admin/create-class/AdminCreateClass";
import AdminReports from "@/components/admin/reports/AdminReports";
import AdminSettings from "@/components/admin/settings/AdminSettings";
import { useAdminData } from "@/hooks/use-admin-data";
import { apiAuthRequest } from "@/lib/api";
import { EmptyState, SectionLoader } from "@/components/ui/states";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "create-class", label: "Create Class", icon: Layers3 },
  { id: "students", label: "Students", icon: UserCog },
  { id: "teachers", label: "Teachers", icon: GraduationCap },
  { id: "fee", label: "Fee Management", icon: Wallet },
  { id: "planner", label: "Timetable Planner", icon: CalendarClock },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "leave", label: "Leave Requests", icon: CalendarDays },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "classes", label: "My Classes", icon: BookOpen },
  { id: "gradebook", label: "Gradebook", icon: ClipboardList },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "timetable", label: "Timetable", icon: Calendar },
  { id: "createQuiz", label: "Create Quiz", icon: ClipboardCheck },
  { id: "checkQuizzes", label: "Check Quizzes", icon: CheckCircle2 },
];

const emptyTeacher: Teacher = {
  id: 0,
  backendId: "",
  name: "Teacher",
  subject: "",
  email: "",
  avatar: "T",
  classes: [],
  students: 0,
  phone: "",
  address: "",
  dob: "",
  gender: "",
  qualification: "",
  joinDate: "",
  emergencyContact: "",
  emergencyPhone: "",
};

type BackendStudent = {
  id: string;
  admissionNo: string;
  name: string;
  email: string;
  grade: string;
  guardian: string;
  guardianPhone: string;
  status: string;
};

type BackendTeacher = {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  subject: string;
  classes: string[];
  phone: string;
  address: string;
  dob: string;
  status: string;
  emergencyContact: string;
  emergencyPhone: string;
  qualification?: string;
  gender?: string;
  avatarUrl?: string;
};

type BackendAnnouncement = {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  authorName: string;
  publishedAt: string;
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

const mapStudent = (student: BackendStudent, index: number): Student => ({
  id: toNumber(student.admissionNo, index + 1),
  backendId: student.id,
  name: student.name,
  email: student.email,
  grade: student.grade,
  avatar: initials(student.name),
  gender: "",
  dob: "",
  phone: "",
  guardian: student.guardian,
  guardianPhone: student.guardianPhone,
  address: "",
  enrollDate: "",
  status: student.status,
  attendance: { present: 0, absent: 0, late: 0, total: 0 },
  tests: [],
  progress: [],
  assignments: [],
  behavior: [],
  fees: { total: 0, paid: 0, pending: 0, status: "Pending" },
});

const mapTeacher = (teacher: BackendTeacher, index: number): Teacher => ({
  id: toNumber(teacher.employeeNo, index + 1),
  backendId: teacher.id,
  name: teacher.name,
  subject: teacher.subject,
  email: teacher.email,
  avatar: initials(teacher.name),
  avatarUrl: teacher.avatarUrl ?? "",
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
});

const mapAnnouncement = (
  announcement: BackendAnnouncement,
  index: number,
): Announcement => ({
  id: toNumber(announcement.id, index + 1),
  title: announcement.title,
  date: announcement.publishedAt.slice(0, 10),
  priority: announcement.priority,
  content: announcement.content,
  author: announcement.authorName,
});

interface AnnouncementTarget {
  targetType: "all" | "classes" | "students";
  targetClasses: string[];
  targetStudentIds: number[];
}

const TeacherPortal = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const [selectedClass, setSelectedClass] = useState<Course | null>(null);

  const { data: portalData, isLoading, isError: hasLoadError } = useQuery({
    queryKey: ["teacher-portal-data"],
    queryFn: async () => {
      const [teacherResult, studentsResult, announcementsResult] =
        await Promise.allSettled([
          apiAuthRequest<BackendTeacher>("/teachers/me"),
          apiAuthRequest<BackendStudent[]>("/students"),
          apiAuthRequest<BackendAnnouncement[]>("/announcements"),
        ]);

      let teacherData = emptyTeacher;
      if (teacherResult.status === "fulfilled") {
        teacherData = mapTeacher(teacherResult.value, 0);
      }

      let studentsData: Student[] = [];
      if (studentsResult.status === "fulfilled") {
        studentsData = studentsResult.value.map(mapStudent);
      }

      let announcementsData: Announcement[] = [];
      if (announcementsResult.status === "fulfilled") {
        announcementsData = announcementsResult.value.map((a, idx) =>
          mapAnnouncement(a, idx),
        );
      }

      return {
        teacher: teacherData,
        students: studentsData,
        announcements: announcementsData,
      };
    },
  });

  const teacher = portalData?.teacher ?? emptyTeacher;
  const students = portalData?.students ?? [];
  const announcements = portalData?.announcements ?? [];
  const myStudents = students;

  const {
    announcements: adminAnnouncements,
    setAnnouncements,
    students: adminStudents,
    setStudents,
    teachers: adminTeachers,
    setTeachers: setAdminTeachers,
    feeTransactions,
    setFeeTransactions,
    plannerAllocations,
    setPlannerAllocations,
    customClasses,
    setCustomClasses,
    classSubjects,
    setClassSubjects,
    addAuditLog,
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
    updatePlannerAllocation,
    deletePlannerAllocation,
  } = useAdminData();

  const [feeFilter, setFeeFilter] = useState<"all" | "pending">("all");
  const [studentSection, setStudentSection] = useState<"enroll" | "search" | "reset">("enroll");
  const [dashboardSelectedStudentId, setDashboardSelectedStudentId] = useState<number | null>(null);
  const [teacherSection, setTeacherSection] = useState<"enroll" | "search" | "reset">("enroll");

  const classOptions = useMemo(() => {
    const fromStudents = adminStudents.map((s) => s.grade);
    const fromAllocations = plannerAllocations.map((a) => a.className);
    return Array.from(new Set([...fromStudents, ...fromAllocations, ...customClasses])).sort();
  }, [adminStudents, plannerAllocations, customClasses]);

  const DEFAULT_SUBJECTS = [
    "Mathematics",
    "English",
    "Physics",
    "Chemistry",
    "Urdu",
    "Computer Science",
    "Biology",
  ];

  const subjectOptions = useMemo(() => {
    const fromTeachers = adminTeachers.flatMap((t) =>
      t.subject
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    const fromAllocations = plannerAllocations.map((a) => a.subject);
    const fromClasses = Object.values(classSubjects).flat();
    return Array.from(
      new Set([...DEFAULT_SUBJECTS, ...fromTeachers, ...fromAllocations, ...fromClasses])
    ).sort();
  }, [adminTeachers, plannerAllocations, classSubjects]);

  const timetableRows = useMemo(() => {
    const dayMap: Record<string, "mon" | "tue" | "wed" | "thu" | "fri"> = {
      Mon: "mon",
      Tue: "tue",
      Wed: "wed",
      Thu: "thu",
      Fri: "fri",
    };

    const rows = plannerAllocations.reduce<
      Record<
        string,
        {
          time: string;
          mon?: string;
          tue?: string;
          wed?: string;
          thu?: string;
          fri?: string;
        }
      >
    >((acc, allocation) => {
      const key = allocation.time || `${allocation.startTime} - ${allocation.endTime}`;
      const dayKey = dayMap[allocation.day];
      if (!dayKey) return acc;

      if (!acc[key]) {
        acc[key] = { time: key };
      }

      acc[key][dayKey] = allocation.subject;
      return acc;
    }, {});

    return Object.values(rows);
  }, [plannerAllocations]);

  const courseSummaries = useMemo(() => {
    const scheduleByClassSubject = plannerAllocations.reduce<Record<string, string>>((acc, item) => {
      const key = `${item.className}::${item.subject}`;
      const label = `${item.day} ${item.time}`;
      acc[key] = acc[key] ? `${acc[key]}, ${label}` : label;
      return acc;
    }, {});

    return Object.entries(classSubjects).flatMap(([className, subjects], index) =>
      subjects.map((subject, subjectIndex) => ({
        id: index * 100 + subjectIndex + 1,
        name: subject,
        code: `${className}-${subject}`.replace(/\s+/g, "-").toUpperCase(),
        progress: 0,
        schedule: scheduleByClassSubject[`${className}::${subject}`] ?? "Not set",
      })),
    );
  }, [classSubjects, plannerAllocations]);

  const studentIdMap = useMemo(
    () =>
      Object.fromEntries(
        students
          .filter((student) => !!student.backendId)
          .map((student) => [student.id, student.backendId as string]),
      ),
    [students],
  );

  const allowedSections = useMemo(
    () => new Set([...navItems.map((item) => item.id), "profile"]),
    [],
  );

  const activeNav = allowedSections.has(section ?? "")
    ? (section as string)
    : "dashboard";

  useEffect(() => {
    if (!section || !allowedSections.has(section)) {
      navigate("/teacher/dashboard", { replace: true });
    }
  }, [allowedSections, navigate, section]);

  useEffect(() => {
    if (activeNav !== "classes" && selectedClass) {
      setSelectedClass(null);
    }
  }, [activeNav, selectedClass]);

  const handleNavChange = (nav: string) => {
    navigate(`/teacher/${nav}`);
  };

  const createAnnouncementMutation = useMutation({
    mutationFn: async ({
      announcement,
      target,
    }: {
      announcement: Announcement;
      target: AnnouncementTarget;
    }) => {
      return apiAuthRequest<BackendAnnouncement>("/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: announcement.title,
          content: announcement.content,
          priority: announcement.priority,
          targetType: target.targetType,
          targetClasses: target.targetClasses,
          targetStudentIds: target.targetStudentIds
            .map((id) => studentIdMap[id])
            .filter((id): id is string => Boolean(id)),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-portal-data"] });
    },
  });

  const renderContent = () => {
    switch (activeNav) {
      case "dashboard":
        return (
          <TeacherDashboard
            teacher={teacher}
            students={myStudents.filter((s) => teacher.classes.includes(s.grade))}
            onNavigate={handleNavChange}
            onSelectClass={setSelectedClass}
          />
        );
      case "classes":
        return (
          <TeacherClasses
            teacher={teacher}
            selectedClass={selectedClass}
            onSelectClass={setSelectedClass}
            onNavigate={handleNavChange}
          />
        );
      case "gradebook":
        return (
          <TeacherGradebook
            teacher={teacher}
            students={myStudents.filter((s) => teacher.classes.includes(s.grade))}
          />
        );
      case "timetable":
        return <TeacherTimetable teacher={teacher} />;
      case "profile":
        return (
          <TeacherProfile
            teacher={teacher}
            onProfileUpdated={(next) => {
              queryClient.setQueryData(["teacher-portal-data"], (old: any) => {
                if (!old) return old;
                return { ...old, teacher: { ...old.teacher, ...next } };
              });
            }}
          />
        );
      case "leave":
        return <TeacherLeave teacher={teacher} />;
      case "assignments":
        return (
          <TeacherAssignments
            teacher={teacher}
            students={myStudents.filter((s) => teacher.classes.includes(s.grade))}
          />
        );
      case "attendance":
        return (
          <AdminAttendance
            students={students}
            teacherName={teacher.name}
            teacherClasses={teacher.classes}
          />
        );
      case "create-class":
        return (
          <AdminCreateClass
            classes={customClasses}
            classSubjects={classSubjects}
            teachers={adminTeachers}
            students={adminStudents}
            courses={courseSummaries}
            onAddClass={createClass}
            onDeleteClass={deleteClass}
            onAddSubject={addClassSubject}
            onDeleteSubject={deleteClassSubject}
          />
        );
      case "students":
        return (
          <AdminStudent
            students={adminStudents}
            onStudentsChange={setStudents}
            onOpenFeeManagement={() => handleNavChange("fee")}
            timetable={timetableRows}
            onAuditLog={addAuditLog}
            currentAdmin={teacher.name}
            initialSection={studentSection}
            initialSelectedStudentId={dashboardSelectedStudentId}
            onCreateStudent={createStudent}
            onUpdateStudent={updateStudent}
            onDeleteStudent={deleteStudent}
            onResetStudentPassword={resetStudentPassword}
          />
        );
      case "teachers":
        return (
          <AdminTeacher
            teachers={adminTeachers}
            onTeachersChange={setAdminTeachers}
            onAuditLog={addAuditLog}
            currentAdmin={teacher.name}
            initialSection={teacherSection}
            onCreateTeacher={createTeacher}
            onUpdateTeacher={updateTeacher}
            onDeleteTeacher={deleteTeacher}
            onResetTeacherPassword={resetTeacherPassword}
            classOptions={customClasses}
            subjectOptions={Array.from(new Set(Object.values(classSubjects).flat())).sort()}
            classSubjectOptions={classSubjects}
          />
        );
      case "fee":
        return (
          <FeeManagement
            students={adminStudents}
            onStudentsChange={setStudents}
            onRecordTransaction={createFeeTransaction}
            onUpdateTransaction={updateFeeTransaction}
            onAssignDue={assignStudentFeeDue}
            onTransactionsChange={setFeeTransactions}
            transactions={feeTransactions}
            onAuditLog={addAuditLog}
            currentAdmin={teacher.name}
            showPendingOnly={feeFilter === "pending"}
          />
        );
      case "planner":
        return (
          <AdminTimetablePlanner
            teachers={adminTeachers}
            allocations={plannerAllocations}
            classOptions={customClasses}
            subjectOptions={subjectOptions}
            onAllocationsChange={setPlannerAllocations}
            classSubjectOptions={classSubjects}
            onLoadWeek={fetchPlannerAllocations}
            onCreateAllocation={createPlannerAllocation}
            onUpdateAllocation={updatePlannerAllocation}
            onDeleteAllocation={deletePlannerAllocation}
          />
        );
      case "reports":
        return <AdminReports />;
      case "settings":
        return <AdminSettings />;
      case "createQuiz":
        return <TeacherCreateQuiz teacher={teacher} />;
      case "checkQuizzes":
        return (
          <TeacherCheckQuizzes
            teacher={teacher}
            students={myStudents.filter((s) => teacher.classes.includes(s.grade))}
          />
        );
      case "announcements": {
        const teacherClasses = teacher.classes || [];
        const studentsInTeacherClasses = myStudents.filter((s) =>
          teacherClasses.includes(s.grade),
        );
        return (
          <TeacherAnnouncements
            senderName={teacher.name}
            classes={teacherClasses}
            students={studentsInTeacherClasses}
            receivedAnnouncements={announcements}
            allStudentsLabel="All Students (in my classes)"
            onAnnouncementCreated={(announcement, target) =>
              createAnnouncementMutation.mutateAsync({ announcement, target })
            }
          />
        );
      }
      default:
        return null;
    }
  };

  return (
    <PortalLayout
      role="Teacher"
      userName={teacher.name}
      userAvatar={teacher.avatar}
      navItems={navItems}
      activeNav={activeNav}
      onNavChange={handleNavChange}
      notificationSlot={
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNavChange("profile")}
            className="btn-outline btn-icon h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20"
            title="My Profile"
            aria-label="Open my profile"
          >
            <User className="h-5 w-5 text-primary" />
          </button>
          <TeacherNotifications
            teacher={teacher}
            students={myStudents.filter((student) => teacher.classes.includes(student.grade))}
            onNavigate={handleNavChange}
          />
        </div>
      }
    >
      <div className="space-y-6 animate-fade-in">
        {/* Main content container for all tabs (announcements is already inside its own card) */}
        {activeNav !== "announcements" ? (
          <div className="card card-elevated animate-slide-up p-6">
            {isLoading ? (
              <SectionLoader label="Loading teacher workspace..." />
            ) : hasLoadError ? (
              <EmptyState
                title="Unable to load teacher data"
                description="Please refresh the page or try again in a moment."
              />
            ) : (
              renderContent()
            )}
          </div>
        ) : (
          isLoading ? (
            <SectionLoader label="Loading announcements..." />
          ) : hasLoadError ? (
            <EmptyState
              title="Unable to load announcements"
              description="Please refresh the page or try again in a moment."
            />
          ) : (
            renderContent()
          )
        )}
      </div>
    </PortalLayout>
  );
};

export default TeacherPortal;
