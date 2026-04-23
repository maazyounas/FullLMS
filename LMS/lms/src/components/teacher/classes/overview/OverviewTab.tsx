import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Course, StudyMaterial } from "@/types/domain";
import { materialIcon } from "../classUtils";
import { toast } from "sonner";

type WeeklyScheduleItem = {
  id?: string;
  day: string;
  startTime: string;
  endTime: string;
  topic?: string;
  location?: string;
};

type OverviewPayload = {
  title: string;
  description: string;
  learningOutcomes: string[];
  objectives: string[];
  thumbnailUrl?: string;
  weeklySchedule: WeeklyScheduleItem[];
};

interface Props {
  selectedClass: Course & {
    overviewTitle?: string;
    learningOutcomes?: string[];
    objectives?: string[];
    thumbnailUrl?: string;
    weeklySchedule?: WeeklyScheduleItem[];
  };
  onSaveOverview: (payload: OverviewPayload) => void;
  onAddMaterial: (material: Omit<StudyMaterial, "id">) => void;
}

const emptySlot = (): WeeklyScheduleItem => ({
  day: "",
  startTime: "",
  endTime: "",
  topic: "",
  location: "",
});

const OverviewTab = ({ selectedClass, onSaveOverview, onAddMaterial }: Props) => {
  const [titleDraft, setTitleDraft] = useState(selectedClass.overviewTitle || selectedClass.name || "");
  const [overviewDraft, setOverviewDraft] = useState(selectedClass.description || "");
  const [outcomesDraft, setOutcomesDraft] = useState((selectedClass.learningOutcomes ?? []).join("\n"));
  const [objectivesDraft, setObjectivesDraft] = useState((selectedClass.objectives ?? []).join("\n"));
  const [thumbnailDraft, setThumbnailDraft] = useState(selectedClass.thumbnailUrl || "");
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleItem[]>(
    selectedClass.weeklySchedule && selectedClass.weeklySchedule.length > 0
      ? selectedClass.weeklySchedule
      : [emptySlot()],
  );
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setTitleDraft(selectedClass.overviewTitle || selectedClass.name || "");
    setOverviewDraft(selectedClass.description || "");
    setOutcomesDraft((selectedClass.learningOutcomes ?? []).join("\n"));
    setObjectivesDraft((selectedClass.objectives ?? []).join("\n"));
    setThumbnailDraft(selectedClass.thumbnailUrl || "");
    setWeeklySchedule(
      selectedClass.weeklySchedule && selectedClass.weeklySchedule.length > 0
        ? selectedClass.weeklySchedule
        : [emptySlot()],
    );
  }, [selectedClass.id, selectedClass.description, selectedClass.learningOutcomes, selectedClass.objectives, selectedClass.overviewTitle, selectedClass.thumbnailUrl, selectedClass.weeklySchedule, selectedClass.name]);

  const isOverviewDirty = useMemo(
    () =>
      titleDraft !== (selectedClass.overviewTitle || selectedClass.name || "") ||
      overviewDraft !== (selectedClass.description || "") ||
      outcomesDraft !== (selectedClass.learningOutcomes ?? []).join("\n") ||
      objectivesDraft !== (selectedClass.objectives ?? []).join("\n") ||
      thumbnailDraft !== (selectedClass.thumbnailUrl || "") ||
      JSON.stringify(weeklySchedule) !== JSON.stringify(selectedClass.weeklySchedule ?? []),
    [
      titleDraft,
      selectedClass.overviewTitle,
      selectedClass.name,
      overviewDraft,
      selectedClass.description,
      outcomesDraft,
      selectedClass.learningOutcomes,
      objectivesDraft,
      selectedClass.objectives,
      thumbnailDraft,
      selectedClass.thumbnailUrl,
      weeklySchedule,
      selectedClass.weeklySchedule,
    ],
  );

  const canSaveOverview = useMemo(
    () => isOverviewDirty && overviewDraft.trim().length > 0 && titleDraft.trim().length > 0,
    [isOverviewDirty, overviewDraft, titleDraft],
  );

  const canAdd = useMemo(() => {
    const hasTitle = title.trim().length > 0;
    const hasFile = !!file;
    const hasUrl = url.trim().length > 0;
    return hasTitle && (hasFile !== hasUrl);
  }, [title, file, url]);

  const inferFileType = (name: string): StudyMaterial["type"] => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (ext === "pdf") return "pdf";
    if (ext === "doc" || ext === "docx") return "doc";
    if (["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) return "image" as StudyMaterial["type"];
    if (ext === "mp4" || ext === "webm" || ext === "mov") return "video";
    return "note";
  };

  const isAllowedFile = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return ["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp", "gif", "bmp", "mp4", "webm", "mov"].includes(ext);
  };

  const handleSaveOverview = () => {
    if (!canSaveOverview) return;
    const normalizeLines = (value: string) =>
      value
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean);

    onSaveOverview({
      title: titleDraft.trim(),
      description: overviewDraft.trim(),
      learningOutcomes: normalizeLines(outcomesDraft),
      objectives: normalizeLines(objectivesDraft),
      thumbnailUrl: thumbnailDraft.trim() || undefined,
      weeklySchedule: weeklySchedule
        .map((slot) => ({
          ...slot,
          day: slot.day.trim(),
          startTime: slot.startTime.trim(),
          endTime: slot.endTime.trim(),
          topic: slot.topic?.trim(),
          location: slot.location?.trim(),
        }))
        .filter((slot) => slot.day && slot.startTime && slot.endTime),
    });
    toast.success("Overview saved.");
  };

  const handleAdd = () => {
    if (!canAdd) return;
    if (file && url.trim()) {
      toast.error("Please provide either a file or a URL, not both.");
      return;
    }
    if (file && !isAllowedFile(file.name)) {
      toast.error("Only PDF, Word, or PowerPoint files are allowed.");
      return;
    }
    const nextType = file ? inferFileType(file.name) : "link";
    const nextUrl = file ? URL.createObjectURL(file) : url.trim();
    onAddMaterial({
      title: title.trim(),
      type: nextType,
      url: nextUrl || undefined,
      content: content.trim() || undefined,
    });
    setTitle("");
    setUrl("");
    setContent("");
    setFile(null);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-4">Course Overview</h3>
      <label className="text-sm font-medium text-foreground">Overview Title</label>
      <input
        value={titleDraft}
        onChange={(e) => setTitleDraft(e.target.value)}
        placeholder="Course title for students"
        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />
      <label className="text-sm font-medium text-foreground">Overview</label>
      <textarea
        value={overviewDraft}
        onChange={(e) => setOverviewDraft(e.target.value)}
        placeholder="Write a brief course overview..."
        className="mt-2 w-full min-h-[110px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground">Learning Outcomes (one per line)</label>
          <textarea
            value={outcomesDraft}
            onChange={(e) => setOutcomesDraft(e.target.value)}
            placeholder="Students will be able to..."
            className="mt-2 w-full min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Course Objectives (one per line)</label>
          <textarea
            value={objectivesDraft}
            onChange={(e) => setObjectivesDraft(e.target.value)}
            placeholder="Objective 1"
            className="mt-2 w-full min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>
      </div>

      <label className="mt-4 block text-sm font-medium text-foreground">Thumbnail URL</label>
      <input
        value={thumbnailDraft}
        onChange={(e) => setThumbnailDraft(e.target.value)}
        placeholder="https://..."
        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />

      <div className="mt-5 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Weekly Timetable</h4>
          <button
            type="button"
            onClick={() => setWeeklySchedule((prev) => [...prev, emptySlot()])}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3 w-3" /> Add Slot
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {weeklySchedule.map((slot, index) => (
            <div key={`slot-${index}`} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
              <input
                value={slot.day}
                onChange={(e) =>
                  setWeeklySchedule((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, day: e.target.value } : item,
                    ),
                  )
                }
                placeholder="Day"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <input
                value={slot.startTime}
                onChange={(e) =>
                  setWeeklySchedule((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, startTime: e.target.value } : item,
                    ),
                  )
                }
                placeholder="Start"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <input
                value={slot.endTime}
                onChange={(e) =>
                  setWeeklySchedule((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, endTime: e.target.value } : item,
                    ),
                  )
                }
                placeholder="End"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <input
                value={slot.topic ?? ""}
                onChange={(e) =>
                  setWeeklySchedule((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, topic: e.target.value } : item,
                    ),
                  )
                }
                placeholder="Topic"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <input
                value={slot.location ?? ""}
                onChange={(e) =>
                  setWeeklySchedule((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, location: e.target.value } : item,
                    ),
                  )
                }
                placeholder="Location"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <button
                type="button"
                onClick={() =>
                  setWeeklySchedule((prev) =>
                    prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev,
                  )
                }
                className="inline-flex items-center justify-center rounded-lg border border-border px-2 py-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSaveOverview}
        disabled={!canSaveOverview}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm text-primary hover:bg-primary/10 disabled:opacity-50"
      >
        <Save className="h-4 w-4" /> Save Overview
      </button>

      <h4 className="font-medium text-foreground mb-3">Recent Materials</h4>
      {selectedClass.materials && selectedClass.materials.length > 0 ? (
        <div className="space-y-2">
          {selectedClass.materials.slice(0, 5).map((mat) => {
            const Icon = materialIcon(mat.type);
            return (
              <div key={mat.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">{mat.title}</span>
                </div>
                {mat.url && (
                  <a
                    href={mat.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    View
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No materials added yet.</p>
      )}

      <div className="mt-6 border-t border-border pt-4">
        <h4 className="font-medium text-foreground mb-2">Add Material</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Material title"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <input
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,.bmp,.mp4,.webm,.mov"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (optional)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Short note/content (optional)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm text-primary hover:bg-primary/10 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add Material
        </button>
      </div>
    </div>
  );
};

export default OverviewTab;
