import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Student } from "@/types/domain";
import type { AdminTeacherRecord } from "@/components/admin/teacher/types";

type CourseSummary = {
  id?: number;
  name: string;
  code?: string;
  progress?: number;
  schedule?: string;
};

interface Props {
  classes: string[];
  classSubjects: Record<string, string[]>;
  teachers: AdminTeacherRecord[];
  students: Student[];
  courses: CourseSummary[];
  onAddClass: (value: string) => Promise<void>;
  onDeleteClass: (value: string) => Promise<void>;
  onAddSubject: (className: string, value: string) => Promise<void>;
  onDeleteSubject: (className: string, value: string) => Promise<void>;
}

const AdminCreateClass = ({
  classes,
  classSubjects,
  teachers,
  students,
  courses,
  onAddClass,
  onDeleteClass,
  onAddSubject,
  onDeleteSubject,
}: Props) => {
  const [newClassName, setNewClassName] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const normalizedClasses = useMemo(
    () => classes.map((item) => item.trim()).filter(Boolean),
    [classes]
  );
  const normalizedSubjects = useMemo(() => {
    if (!selectedClass) return [];
    const subjects = classSubjects[selectedClass] ?? [];
    return subjects.map((item) => item.trim()).filter(Boolean);
  }, [classSubjects, selectedClass]);

  const classDetails = useMemo(() => {
    if (!selectedClass) return null;
    const classCourses = classSubjects[selectedClass] ?? [];
    const studentsInClass = students.filter((s) => s.grade === selectedClass);
    const teachersForClass = teachers.filter((t) => t.classes.includes(selectedClass));
    const courseRows = classCourses.map((courseName) => {
      const assignedTeachers = teachersForClass.filter((t) => {
        const subjects = t.classSubjects?.[selectedClass];
        if (subjects && subjects.length > 0) {
          return subjects.includes(courseName);
        }
        return t.subject
          .split(",")
          .map((s) => s.trim())
          .includes(courseName);
      });
      const courseMeta = courses.find((c) => c.name === courseName);
      return {
        courseName,
        teachers: assignedTeachers.map((t) => t.name),
        progress: courseMeta?.progress ?? 0,
        schedule: courseMeta?.schedule ?? "Not set",
      };
    });

    const avgProgress =
      courseRows.length > 0
        ? Math.round(
            courseRows.reduce((sum, row) => sum + row.progress, 0) / courseRows.length
          )
        : 0;

    return {
      classCourses,
      studentsInClass,
      teachersForClass,
      courseRows,
      avgProgress,
    };
  }, [classSubjects, selectedClass, students, teachers, courses]);

  const handleAddClass = async () => {
    const value = newClassName.trim();
    if (!value) {
      toast.error("Enter a class name.");
      return;
    }
    if (normalizedClasses.some((c) => c.toLowerCase() === value.toLowerCase())) {
      toast.error("Class already exists.");
      return;
    }
    try {
      await onAddClass(value);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add class.");
      return;
    }
    setNewClassName("");
    setSelectedClass(value);
    toast.success("New class added.");
  };

  const handleAddSubject = async () => {
    const value = newSubjectName.trim();
    if (!selectedClass) {
      toast.error("Select a class first.");
      return;
    }
    if (!value) {
      toast.error("Enter a subject name.");
      return;
    }
    if (normalizedSubjects.some((s) => s.toLowerCase() === value.toLowerCase())) {
      toast.error("Subject already exists.");
      return;
    }
    try {
      await onAddSubject(selectedClass, value);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add course.");
      return;
    }
    setNewSubjectName("");
    toast.success("New subject added.");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Create Classes & Subjects</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add new classes and subjects to use in the timetable planner.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="font-semibold text-foreground">Add New Class</p>
          <div className="flex gap-2">
            <input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g. 12-A"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                void handleAddClass();
              }}
              className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
            >
              Add Class
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="font-semibold text-foreground">Add New Course</p>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select Class</option>
            {normalizedClasses.map((item) => (
              <option key={`select-${item}`} value={item}>
                {item}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="e.g. Pak Studies"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              disabled={!selectedClass}
            />
            <button
              onClick={() => {
                void handleAddSubject();
              }}
              disabled={!selectedClass}
              className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
            >
              Add Course
            </button>
          </div>
          {!selectedClass && (
            <p className="text-xs text-muted-foreground">
              Select a class to add subjects.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-foreground">Created Classes</p>
            <span className="text-xs text-muted-foreground">
              {normalizedClasses.length} total
            </span>
          </div>
          {normalizedClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes created yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {normalizedClasses.map((item) => (
                <div
                  key={`class-${item}`}
                  className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedClass(item)}
                    className="text-left hover:text-primary"
                  >
                    {item}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (selectedClass === item) {
                        setSelectedClass("");
                      }
                      try {
                        await onDeleteClass(item);
                        toast.success("Class deleted.");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Unable to delete class.");
                      }
                    }}
                    className="rounded-full border border-border px-2 py-0.5 text-[10px]"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-foreground">
              {selectedClass ? `Courses for ${selectedClass}` : "Courses"}
            </p>
            <span className="text-xs text-muted-foreground">
              {normalizedSubjects.length} total
            </span>
          </div>
          {!selectedClass ? (
            <p className="text-sm text-muted-foreground">Select a class to view courses.</p>
          ) : normalizedSubjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses created yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {normalizedSubjects.map((item) => (
                <div
                  key={`subject-${item}`}
                  className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await onDeleteSubject(selectedClass, item);
                        toast.success("Course deleted.");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Unable to delete course.");
                      }
                    }}
                    className="rounded-full border border-border px-2 py-0.5 text-[10px]"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {classDetails && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {selectedClass} Overview
              </h3>
              <p className="text-xs text-muted-foreground">
                {classDetails.classCourses.length} courses ·{" "}
                {classDetails.studentsInClass.length} students ·{" "}
                {classDetails.teachersForClass.length} teachers
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              Avg syllabus progress:{" "}
              <span className="font-semibold text-foreground">
                {classDetails.avgProgress}%
              </span>
            </div>
          </div>

          {classDetails.courseRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No course details available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-muted/30">
                  <tr>
                    {["Course", "Assigned Teacher(s)", "Schedule", "Progress"].map((head) => (
                      <th
                        key={head}
                        className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classDetails.courseRows.map((row) => (
                    <tr key={row.courseName} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-sm font-medium text-foreground">
                        {row.courseName}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {row.teachers.length > 0 ? row.teachers.join(", ") : "Not assigned"}
                      </td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">
                        {row.schedule}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-muted/30 overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${row.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {row.progress}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCreateClass;
