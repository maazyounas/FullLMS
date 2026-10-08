import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import StudentFees from "./StudentFees";
import type { PortalStudent } from "../types";

const mockStudent: PortalStudent = {
  id: "stu-123",
  admissionNo: "ADM-102",
  name: "Ayesha Khan",
  email: "ayesha@example.com",
  grade: "Grade 9",
  avatar: "AK",
  gender: "Female",
  dob: "2012-04-12",
  phone: "+923001234567",
  guardian: "Khan",
  guardianPhone: "+923005556677",
  address: "Lahore",
  status: "Active",
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      studentId: "stu-123",
      totalDue: 45000,
      totalPaid: 30000,
      pending: 15000,
      status: "Partial",
    },
    isLoading: false,
    isError: false,
  }),
}));

describe("StudentFees", () => {
  it("renders the student fee slip summary", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    root.render(<StudentFees student={mockStudent} />);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(container.textContent).toContain("Student Fee Slip");
    expect(container.textContent).toContain("Total Fee");
    expect(container.textContent).toContain("Rs. 45,000");
    expect(container.textContent).toContain("Pending");

    root.unmount();
    container.remove();
  });
});
