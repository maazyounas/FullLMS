import { useState, useMemo } from "react";
import { Filter, Calendar, Clock, BookOpen } from "lucide-react";
import { useTimetable } from "../hooks/useTimetable";

const StudentTimetable = () => {
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const { timetable, isLoading } = useTimetable();

  // Extract unique courses from timetable (excluding "BREAK" and empty strings)
  const courses = useMemo(() => {
    const courseSet = new Set<string>();
    timetable.forEach((row) => {
      [row.mon, row.tue, row.wed, row.thu, row.fri, row.sat].forEach((cell) => {
        if (cell && cell !== "BREAK") {
          courseSet.add(cell);
        }
      });
    });
    return Array.from(courseSet).sort();
  }, [timetable]);

  // Filter rows based on selected course
  const filteredRows = useMemo(() => {
    if (!selectedCourse) return timetable;
    return timetable.filter((row) =>
      [row.mon, row.tue, row.wed, row.thu, row.fri, row.sat].some(
        (cell) => cell === selectedCourse
      )
    );
  }, [selectedCourse, timetable]);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header with title and filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="h-7 w-7 text-primary" /> My Timetable
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your weekly class schedule
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border/60 rounded-xl px-3 py-2 shadow-sm">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="bg-transparent text-sm font-medium text-foreground focus:outline-none pr-6"
            aria-label="Filter timetable by course"
          >
            <option value="">All Courses</option>
            {courses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-4 text-sm text-muted-foreground flex items-center gap-2">
          <span className="spinner h-4 w-4" />
          Loading timetable...
        </div>
      )}

      {/* Timetable Table */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-muted/10">
                <th className="sticky left-0 bg-muted/10 px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Time
                  </div>
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="px-4 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredRows.length > 0 ? (
                filteredRows.map((row, i) => {
                  const cells = [row.mon, row.tue, row.wed, row.thu, row.fri, row.sat];
                  const isBreak = cells.some((cell) => cell === "BREAK");

                  return (
                    <tr
                      key={i}
                      className={`transition-colors ${isBreak
                          ? "bg-warning/5 hover:bg-warning/10"
                          : "hover:bg-muted/20"
                        }`}
                    >
                      {/* Time column (sticky) */}
                      <td className="sticky left-0 bg-card px-5 py-3 font-medium text-foreground whitespace-nowrap border-r border-border/30">
                        {row.time}
                      </td>

                      {/* Day cells */}
                      {cells.map((cell, j) => {
                        const isMatchingCourse = selectedCourse && cell === selectedCourse;
                        let cellClasses = "px-4 py-3 whitespace-nowrap transition-all";
                        if (cell === "BREAK") {
                          cellClasses += " text-warning font-medium";
                        } else if (isMatchingCourse) {
                          cellClasses += " bg-primary/15 font-semibold text-primary rounded-lg shadow-sm";
                        } else if (cell) {
                          cellClasses += " text-foreground";
                        } else {
                          cellClasses += " text-muted-foreground";
                        }
                        return (
                          <td key={j} className={cellClasses}>
                            {cell || "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    No classes found for {selectedCourse}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend / hint when filtering */}
      {selectedCourse && filteredRows.length > 0 && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-sm text-muted-foreground flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary/40" />
          <span>
            Showing only time slots that contain <span className="font-medium text-primary">{selectedCourse}</span>.
            Matching cells are highlighted.
          </span>
        </div>
      )}
      {!selectedCourse && timetable.length > 0 && (
        <div className="text-xs text-muted-foreground text-center pt-2">
          Use the filter to see when a specific course is scheduled.
        </div>
      )}
    </div>
  );
};

export default StudentTimetable;