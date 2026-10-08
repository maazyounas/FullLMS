import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  UserCog,
  Wallet,
  GraduationCap,
  CalendarCheck,
  CalendarDays,
  Bell,
  Layers3,
  CalendarClock,
  FileText,
  Settings,
  BookOpen,
  ClipboardList,
  Calendar,
  ClipboardCheck,
  CheckCircle2,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import AdminDashboard from "@/components/admin/dashboard/AdminDashboard";
import AdminAttendance from "@/components/admin/attendance/AdminAttendance";
import AdminLeaveRequests from "@/components/admin/leave-requests/AdminLeaveRequests";
import AdminAnnouncements from "@/components/admin/announcements/AdminAnnouncements";
import AdminReports from "@/components/admin/reports/AdminReports";
import AdminStudent from "@/components/admin/student/AdminStudent";
import FeeManagement from "@/components/admin/fee/FeeManagement";
import AdminTeacher from "@/components/admin/teacher/AdminTeacher";
import AdminTimetablePlanner from "@/components/admin/planner/AdminTimetablePlanner";
import AdminCreateClass from "@/components/admin/create-class/AdminCreateClass";
import AdminSettings from "@/components/admin/settings/AdminSettings";
import AdminPasswordResetNotifications from "@/components/admin/communication/AdminPasswordResetNotifications";
import { useAdminData } from "@/hooks/use-admin-data";
import TeacherLeave from "@/components/teacher/leave/TeacherLeave";
import TeacherClasses from "@/components/teacher/classes/TeacherClasses";
import TeacherGradebook from "@/components/teacher/gradebook/TeacherGradebook";
import TeacherAssignments from "@/components/teacher/assignments/TeacherAssignments";
import TeacherTimetable from "@/components/teacher/timetable/TeacherTimetable";
import TeacherCreateQuiz from "@/components/teacher/quizzes/TeacherCreateQuiz";
import TeacherCheckQuizzes from "@/components/teacher/quizzes/TeacherCheckQuizzes";
import type { Course, Teacher } from "@/types/domain";

const DEFAULT_SUBJECTS = [
  "Mathematics",
  "English",
  "Physics",
  "Chemistry",
  "Urdu",
  "Computer Science",
  "Biology",
];

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "create-class", label: "Create Class", icon: Layers3 },
  { id: "students", label: "Students", icon: UserCog },
  { id: "teachers", label: "Teachers", icon: GraduationCap },
  { id: "fee", label: "Fee Management", icon: Wallet },
  { id: "planner", label: "Timetable Planner", icon: CalendarClock },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "leave-requests", label: "Leave Requests", icon: CalendarDays },
  { id: "announcements", label: "Announcements", icon: Bell },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "classes", label: "My Classes", icon: BookOpen },
  { id: "gradebook", label: "Gradebook", icon: ClipboardList },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "timetable", label: "Teacher Timetable", icon: Calendar },
  { id: "createQuiz", label: "Create Quiz", icon: ClipboardCheck },
  { id: "checkQuizzes", label: "Check Quizzes", icon: CheckCircle2 },
];

const AdminPortal = () => {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const {
    announcements,
    setAnnouncements,
    students,
    setStudents,
    teachers,
    setTeachers,
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
    createPlannerAllocationsBulk,
    updatePlannerAllocation,
    deletePlannerAllocation,
  } = useAdminData();

  const [feeFilter, setFeeFilter] = useState<"all" | "pending">("all");
  const [studentSection, setStudentSection] = useState<"enroll" | "search" | "reset">(
    "enroll"
  );
  const [dashboardSelectedStudentId, setDashboardSelectedStudentId] = useState<
    number | null
  >(null);
  const [teacherSection, setTeacherSection] = useState<"enroll" | "search" | "reset">(
    "enroll"
  );
  const [pendingLeaves, setPendingLeaves] = useState(3);
  const currentAdmin = "Admin User";

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [adminSelectedTeacherClass, setAdminSelectedTeacherClass] = useState<Course | null>(null);

  const selectedTeacher = useMemo(() => {
    const defaultTeacher = {
      id: 0,
      backendId: "",
      name: "Unassigned Teacher",
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
    return teachers.find((t) => t.backendId === selectedTeacherId) || teachers[0] || defaultTeacher;
  }, [teachers, selectedTeacherId]);

  const activeNav = navItems.some((item) => item.id === section)
    ? (section as string)
    : "dashboard";

  useEffect(() => {
    if (!section || !navItems.some((item) => item.id === section)) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [navigate, section]);

  const handleNavChange = (id: string) => {
    if (id === "fee") {
      setFeeFilter("all");
    }
    navigate(`/admin/${id}`);
  };

  const navigateTo = (id: string) => {
    navigate(`/admin/${id}`);
  };

  const classOptions = useMemo(() => {
    const fromStudents = students.map((s) => s.grade);
    const fromAllocations = plannerAllocations.map((a) => a.className);
    return Array.from(new Set([...fromStudents, ...fromAllocations, ...customClasses])).sort();
  }, [students, plannerAllocations, customClasses]);

  const subjectOptions = useMemo(() => {
    const fromTeachers = teachers.flatMap((t) =>
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
  }, [teachers, plannerAllocations, classSubjects]);

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

  const renderContent = () => {
    switch (activeNav) {
      case "dashboard":
        return (
          <AdminDashboard
            students={students}
            teachersCount={teachers.length}
            announcements={announcements}
            pendingLeaves={pendingLeaves}
            onOpenStudent={(student) => {
              if (student) {
                setStudentSection("search");
                setDashboardSelectedStudentId(student.id);
                handleNavChange("students");
              }
            }}
            onOpenStudentSearch={() => {
              setStudentSection("search");
              setDashboardSelectedStudentId(null);
              handleNavChange("students");
            }}
            onOpenTeacherSearch={() => {
              setTeacherSection("search");
              handleNavChange("teachers");
            }}
            onOpenAnnouncements={() => handleNavChange("announcements")}
            onOpenLeaveRequests={() => handleNavChange("leave-requests")}
            onOpenFeeWithDues={() => {
              setFeeFilter("pending");
              navigateTo("fee");
            }}
          />
        );
      case "students":
        return (
          <AdminStudent
            students={students}
            onStudentsChange={setStudents}
            onOpenFeeManagement={() => handleNavChange("fee")}
            timetable={timetableRows}
            onAuditLog={addAuditLog}
            currentAdmin={currentAdmin}
            initialSection={studentSection}
            initialSelectedStudentId={dashboardSelectedStudentId}
            onCreateStudent={createStudent}
            onUpdateStudent={updateStudent}
            onDeleteStudent={deleteStudent}
            onResetStudentPassword={resetStudentPassword}
          />
        );
      case "fee":
        return (
          <FeeManagement
            students={students}
            onStudentsChange={setStudents}
            onRecordTransaction={createFeeTransaction}
            onUpdateTransaction={updateFeeTransaction}
            onAssignDue={assignStudentFeeDue}
            onTransactionsChange={setFeeTransactions}
            transactions={feeTransactions}
            onAuditLog={addAuditLog}
            currentAdmin={currentAdmin}
            showPendingOnly={feeFilter === "pending"}
          />
        );
      case "teachers":
        return (
          <AdminTeacher
            teachers={teachers}
            onTeachersChange={setTeachers}
            onAuditLog={addAuditLog}
            currentAdmin={currentAdmin}
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
      case "planner":
        return (
          <AdminTimetablePlanner
            role="ADMIN"
            teachers={teachers}
            allocations={plannerAllocations}
            classOptions={customClasses}
            subjectOptions={subjectOptions}
            onAllocationsChange={setPlannerAllocations}
            classSubjectOptions={classSubjects}
            onLoadWeek={fetchPlannerAllocations}
            onCreateAllocation={createPlannerAllocation}
            onCreateAllocationBulk={createPlannerAllocationsBulk}
            onUpdateAllocation={updatePlannerAllocation}
            onDeleteAllocation={deletePlannerAllocation}
          />
        );
      case "create-class":
        return (
          <AdminCreateClass
            classes={customClasses}
            classSubjects={classSubjects}
            teachers={teachers}
            students={students}
            courses={courseSummaries}
            onAddClass={createClass}
            onDeleteClass={deleteClass}
            onAddSubject={addClassSubject}
            onDeleteSubject={deleteClassSubject}
          />
        );
      case "attendance":
        return (
          <AdminAttendance
            students={students}
            teacherName={selectedTeacher.name}
            teacherClasses={selectedTeacher.classes}
          />
        );
      case "leave-requests":
        return <TeacherLeave onPendingCountChange={setPendingLeaves} />;
      case "classes":
        return (
          <TeacherClasses
            teacher={selectedTeacher}
            selectedClass={adminSelectedTeacherClass}
            onSelectClass={setAdminSelectedTeacherClass}
            onNavigate={handleNavChange}
          />
        );
      case "gradebook":
        return (
          <TeacherGradebook
            teacher={selectedTeacher}
            students={students.filter((s) => selectedTeacher.classes.includes(s.grade))}
          />
        );
      case "assignments":
        return (
          <TeacherAssignments
            teacher={selectedTeacher}
            students={students.filter((s) => selectedTeacher.classes.includes(s.grade))}
          />
        );
      case "timetable":
        return <TeacherTimetable teacher={selectedTeacher} />;
      case "createQuiz":
        return <TeacherCreateQuiz teacher={selectedTeacher} />;
      case "checkQuizzes":
        return <TeacherCheckQuizzes teacher={selectedTeacher} />;
      case "announcements":
        return (
          <AdminAnnouncements
            announcements={announcements}
            students={students}
            onAnnouncementsChange={setAnnouncements}
          />
        );
      case "reports":
        return <AdminReports />;
      case "settings":
        return <AdminSettings />;
      default:
        return null;
    }
  };

  return (
    <PortalLayout
      role="Administrator"
      userName="Admin User"
      userAvatar="AU"
      navItems={navItems}
      activeNav={activeNav}
      onNavChange={(id) => {
        handleNavChange(id);
      }}
      notificationSlot={<AdminPasswordResetNotifications />}
    >

      {/* Main content area with consistent card styling */}
      <div className="card card-elevated animate-fade-in p-6">
        {new Set([
          "attendance",
          "classes",
          "gradebook",
          "assignments",
          "timetable",
          "createQuiz",
          "checkQuizzes",
        ]).has(activeNav) && (
          <div className="mb-6 p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Teacher Perspective</h3>
              <p className="text-xs text-muted-foreground">You are viewing/marking data as the selected teacher below.</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="teacher-select" className="text-xs font-medium text-muted-foreground whitespace-nowrap">Select Teacher:</label>
              <select
                id="teacher-select"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="select-modern min-w-56 text-sm bg-background border border-border rounded-lg px-3 py-2 outline-none"
              >
                <option value="">-- Choose Teacher --</option>
                {teachers.map((t) => (
                  <option key={t.backendId} value={t.backendId}>
                    {t.name} ({t.subject || "No Subject"})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {renderContent()}
      </div>
    </PortalLayout>
  );
};

export default AdminPortal;
