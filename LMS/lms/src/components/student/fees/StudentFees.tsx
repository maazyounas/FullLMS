import { useQuery } from "@tanstack/react-query";
import { FileText, Printer, Wallet } from "lucide-react";
import type { PortalStudent } from "@/components/student/types";
import { apiAuthRequest } from "@/lib/api";

type StudentFeeSummary = {
  studentId: string;
  totalDue: number;
  totalPaid: number;
  pending: number;
  status: "Paid" | "Partial" | "Pending";
};

interface StudentFeesProps {
  student: PortalStudent;
}

const money = (value: number) => `Rs. ${value.toLocaleString()}`;

const StudentFees = ({ student }: StudentFeesProps) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["student-fee-summary", student.id],
    queryFn: async () =>
      apiAuthRequest<StudentFeeSummary>(`/fees/students/${encodeURIComponent(student.id)}/summary`),
    enabled: !!student.id,
  });

  const summary = data ?? {
    studentId: student.id,
    totalDue: 0,
    totalPaid: 0,
    pending: 0,
    status: "Pending" as const,
  };

  const statusClass =
    summary.status === "Paid"
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
      : summary.status === "Partial"
        ? "bg-amber-500/10 text-amber-700 border-amber-200"
        : "bg-rose-500/10 text-rose-700 border-rose-200";

  const printSlip = () => {
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Student Fee Slip</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .box { border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; margin-top: 16px; }
            .row { display: flex; justify-content: space-between; margin: 8px 0; }
            .total { font-weight: 700; font-size: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2>School Management System</h2>
              <p>Student Fee Slip</p>
            </div>
            <p>${new Date().toLocaleDateString()}</p>
          </div>
          <div class="box">
            <div class="row"><strong>Student:</strong> <span>${student.name}</span></div>
            <div class="row"><strong>Admission:</strong> <span>${student.admissionNo}</span></div>
            <div class="row"><strong>Class:</strong> <span>${student.grade}</span></div>
            <div class="row"><strong>Status:</strong> <span>${summary.status}</span></div>
            <div class="row"><strong>Total Fee:</strong> <span>${money(summary.totalDue)}</span></div>
            <div class="row"><strong>Paid:</strong> <span>${money(summary.totalPaid)}</span></div>
            <div class="row total"><strong>Pending:</strong> <span>${money(summary.pending)}</span></div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <section className="space-y-6 animate-fade-in max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary/80">Student Portal</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" /> Student Fee Slip
          </h1>
        </div>

        <button
          type="button"
          onClick={printSlip}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
        >
          <Printer className="h-4 w-4" />
          Print Slip
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading fee details...
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Wallet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <h3 className="text-lg font-semibold text-foreground">Fee details unavailable</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            We could not load the fee summary for this student right now.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Total Fee</p>
              <p className="mt-3 text-3xl font-bold text-foreground">{money(summary.totalDue)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="mt-3 text-3xl font-bold text-emerald-600">{money(summary.totalPaid)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="mt-3 text-3xl font-bold text-amber-600">{money(summary.pending)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Student Details</p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">{student.name}</h2>
              </div>
              <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${statusClass}`}>
                {summary.status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admission</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{student.admissionNo}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Class</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{student.grade}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Guardian</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{student.guardian}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Parent Contact</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{student.guardianPhone}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default StudentFees;
