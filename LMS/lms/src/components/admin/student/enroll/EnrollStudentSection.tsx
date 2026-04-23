import { UserPlus } from "lucide-react";
import type { EnrollStudentForm } from "../types";
import { studentCode } from "../utils";

interface Props {
  enrollForm: EnrollStudentForm;
  onChange: (next: EnrollStudentForm) => void;
  onEnroll: () => void;
  classes: string[];
  activeSubjectOptions: string[];
  onToggleSubject: (subject: string) => void;
  lastEnrolledId: number | null;
}

const EnrollStudentSection = ({
  enrollForm,
  onChange,
  onEnroll,
  classes,
  activeSubjectOptions,
  onToggleSubject,
  lastEnrolledId,
}: Props) => {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Enroll Student</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <input
          value={enrollForm.name}
          onChange={(e) => onChange({ ...enrollForm, name: e.target.value })}
          placeholder="Student Name"
          className="rounded-lg border border-border bg-background px-3 py-2"
        />
        <div className="space-y-1">
          <input
            value={enrollForm.id}
            onChange={(e) => onChange({ ...enrollForm, id: e.target.value })}
            placeholder="Stu-0001"
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
          />
          <p className="text-xs text-muted-foreground">
            {lastEnrolledId
              ? `Recently enrolled ID: ${studentCode(lastEnrolledId)}`
              : "Use a unique student ID like Stu-0001. The default password will be the same ID."}
          </p>
        </div>

        <select
          value={enrollForm.gender}
          onChange={(e) => onChange({ ...enrollForm, gender: e.target.value })}
          className="rounded-lg border border-border bg-background px-3 py-2"
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>

        <input
          value={enrollForm.guardian}
          onChange={(e) => onChange({ ...enrollForm, guardian: e.target.value })}
          placeholder="Guardian Name"
          className="rounded-lg border border-border bg-background px-3 py-2"
        />

        <input
          value={enrollForm.guardianPhone}
          onChange={(e) => onChange({ ...enrollForm, guardianPhone: e.target.value })}
          placeholder="Guardian Phone"
          className="rounded-lg border border-border bg-background px-3 py-2"
        />

        <select
          value={enrollForm.className}
          onChange={(e) =>
            onChange({ ...enrollForm, className: e.target.value, subjects: [] })
          }
          className="rounded-lg border border-border bg-background px-3 py-2"
        >
          <option value="">Select Class</option>
          {classes.map((className) => (
            <option key={className} value={className}>
              {className}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground mb-2">Select Subjects</p>
        {enrollForm.className && activeSubjectOptions.length === 0 && (
          <p className="mb-2 text-xs text-muted-foreground">
            No courses are configured for this class yet.
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {activeSubjectOptions.map((subject) => (
            <label
              key={subject}
              className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm"
            >
              <input
                type="checkbox"
                checked={enrollForm.subjects.includes(subject)}
                onChange={() => onToggleSubject(subject)}
              />
              {subject}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={onEnroll}
        className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
      >
        Enroll Student
      </button>
    </div>
  );
};

export default EnrollStudentSection;
