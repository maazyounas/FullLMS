import { ChevronDown, ChevronUp, Folder, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { Course, StudyMaterial } from "@/types/domain";
import { materialIcon } from "../classUtils";
import { toast } from "sonner";

interface Props {
  selectedClass: Course;
  expandedChapters: Set<number>;
  expandedTopics: Set<number>;
  onToggleChapter: (chapterId: number) => void;
  onToggleTopic: (topicId: number) => void;
  onAddChapter: (data: { chapterNumber: number; chapterName: string; description?: string }) => void;
  onUpdateChapter: (
    chapterId: number,
    patch: { chapterNumber?: number; chapterName?: string; description?: string },
  ) => void;
  onAddChapterMaterial: (chapterId: number, material: Omit<StudyMaterial, "id">) => void;
  onAddTopic: (chapterId: number, topicName: string) => void;
  onUpdateTopic: (chapterId: number, topicId: number, topicName: string) => void;
  onAddTopicMaterial: (
    chapterId: number,
    topicId: number,
    material: Omit<StudyMaterial, "id">,
  ) => void;
}

const ChaptersTab = ({
  selectedClass,
  expandedChapters,
  expandedTopics,
  onToggleChapter,
  onToggleTopic,
  onAddChapter,
  onUpdateChapter,
  onAddChapterMaterial,
  onAddTopic,
  onUpdateTopic,
  onAddTopicMaterial,
}: Props) => {
  const [newChapterNumber, setNewChapterNumber] = useState("");
  const [newChapterName, setNewChapterName] = useState("");
  const [newChapterDescription, setNewChapterDescription] = useState("");

  type MaterialDraft = { title: string; url: string; content: string; file: File | null };
  const [chapterMaterialDrafts, setChapterMaterialDrafts] = useState<Record<number, MaterialDraft>>(
    {},
  );
  const [topicMaterialDrafts, setTopicMaterialDrafts] = useState<Record<string, MaterialDraft>>({});
  const [topicDrafts, setTopicDrafts] = useState<Record<number, string>>({});

  const chapterNumberValue = useMemo(() => Number(newChapterNumber), [newChapterNumber]);
  const canAddChapter = useMemo(
    () =>
      newChapterName.trim().length > 0 &&
      newChapterNumber.trim().length > 0 &&
      !Number.isNaN(chapterNumberValue),
    [newChapterName, newChapterNumber, chapterNumberValue],
  );

  const handleAddChapter = () => {
    if (!canAddChapter) return;
    onAddChapter({
      chapterNumber: chapterNumberValue,
      chapterName: newChapterName.trim(),
      description: newChapterDescription.trim() || undefined,
    });
    setNewChapterNumber("");
    setNewChapterName("");
    setNewChapterDescription("");
  };

  const getChapterDraft = (chapterId: number) =>
    chapterMaterialDrafts[chapterId] || { title: "", url: "", content: "", file: null };

  const setChapterDraft = (chapterId: number, patch: Partial<MaterialDraft>) => {
    setChapterMaterialDrafts((prev) => ({
      ...prev,
      [chapterId]: { ...getChapterDraft(chapterId), ...patch },
    }));
  };

  const getTopicDraft = (chapterId: number, topicId: number) =>
    topicMaterialDrafts[`${chapterId}:${topicId}`] || {
      title: "",
      url: "",
      content: "",
      file: null,
    };

  const setTopicDraft = (
    chapterId: number,
    topicId: number,
    patch: Partial<MaterialDraft>,
  ) => {
    const key = `${chapterId}:${topicId}`;
    setTopicMaterialDrafts((prev) => ({
      ...prev,
      [key]: { ...getTopicDraft(chapterId, topicId), ...patch },
    }));
  };

  const inferFileType = (name: string): StudyMaterial["type"] => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (ext === "pdf") return "pdf";
    if (ext === "doc" || ext === "docx") return "doc";
    if (ext === "ppt" || ext === "pptx") return "ppt";
    return "note";
  };

  const isAllowedFile = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return ["pdf", "doc", "docx", "ppt", "pptx"].includes(ext);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Course Chapters</h3>
      </div>
      <div className="bg-muted/10 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-foreground mb-3">Add New Chapter</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={newChapterNumber}
            onChange={(e) => setNewChapterNumber(e.target.value)}
            placeholder="Chapter number"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <input
            value={newChapterName}
            onChange={(e) => setNewChapterName(e.target.value)}
            placeholder="Chapter name"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <input
            value={newChapterDescription}
            onChange={(e) => setNewChapterDescription(e.target.value)}
            placeholder="Short description (optional)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>
        <button
          onClick={handleAddChapter}
          disabled={!canAddChapter}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm text-primary hover:bg-primary/10 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add Chapter
        </button>
      </div>
      {selectedClass.chapters && selectedClass.chapters.length > 0 ? (
        <div className="space-y-4">
          {selectedClass.chapters.map((chapter) => (
            <div key={chapter.id} className="border border-border rounded-lg overflow-hidden">
              <div
                onClick={() => onToggleChapter(chapter.id)}
                className="flex items-center justify-between p-4 bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Folder className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">
                    Chapter {chapter.chapterNumber}: {chapter.chapterName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {expandedChapters.has(chapter.id) ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </div>

              {expandedChapters.has(chapter.id) && (
                <div className="p-4 border-t border-border">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <input
                      value={chapter.chapterNumber}
                      onChange={(e) =>
                        onUpdateChapter(chapter.id, { chapterNumber: Number(e.target.value) })
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="Chapter number"
                    />
                    <input
                      value={chapter.chapterName}
                      onChange={(e) => onUpdateChapter(chapter.id, { chapterName: e.target.value })}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="Chapter name"
                    />
                    <input
                      value={(chapter as { description?: string }).description || ""}
                      onChange={(e) => onUpdateChapter(chapter.id, { description: e.target.value })}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="Description (optional)"
                    />
                  </div>
                  {chapter.materials && chapter.materials.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-foreground mb-2">Chapter Materials</h5>
                      <div className="space-y-2">
                        {chapter.materials.map((mat) => {
                          const Icon = materialIcon(mat.type);
                          return (
                            <div key={mat.id} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-primary" />
                                <span className="text-sm">{mat.title}</span>
                              </div>
                              {mat.url && (
                                <a
                                  href={mat.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary text-xs hover:underline"
                                >
                                  View
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="bg-muted/10 rounded-lg p-3 mb-4">
                    <h6 className="text-sm font-medium text-foreground mb-2">Add Chapter Material</h6>
                    {(() => {
                      const draft = getChapterDraft(chapter.id);
                      const hasTitle = draft.title.trim().length > 0;
                      const hasFile = !!draft.file;
                      const hasUrl = draft.url.trim().length > 0;
                      const canAdd = hasTitle && (hasFile !== hasUrl);
                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                            <input
                              value={draft.title}
                              onChange={(e) => setChapterDraft(chapter.id, { title: e.target.value })}
                              placeholder="Title"
                              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.ppt,.pptx"
                              onChange={(e) =>
                                setChapterDraft(chapter.id, { file: e.target.files?.[0] || null })
                              }
                              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                            <input
                              value={draft.url}
                              onChange={(e) => setChapterDraft(chapter.id, { url: e.target.value })}
                              placeholder="URL (optional)"
                              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                            <input
                              value={draft.content}
                              onChange={(e) => setChapterDraft(chapter.id, { content: e.target.value })}
                              placeholder="Short note (optional)"
                              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                          </div>
                          <button
                            onClick={() => {
                              if (!canAdd) return;
                              if (draft.file && draft.url.trim()) {
                                toast.error("Please provide either a file or a URL, not both.");
                                return;
                              }
                              if (draft.file && !isAllowedFile(draft.file.name)) {
                                toast.error("Only PDF, Word, or PowerPoint files are allowed.");
                                return;
                              }
                              const nextType = draft.file
                                ? inferFileType(draft.file.name)
                                : "link";
                              const nextUrl = draft.file
                                ? URL.createObjectURL(draft.file)
                                : draft.url.trim();
                              onAddChapterMaterial(chapter.id, {
                                title: draft.title.trim(),
                                type: nextType,
                                url: nextUrl || undefined,
                                content: draft.content.trim() || undefined,
                              });
                              setChapterDraft(chapter.id, {
                                title: "",
                                url: "",
                                content: "",
                                file: null,
                              });
                            }}
                            disabled={!canAdd}
                            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary/10 disabled:opacity-50"
                          >
                            <Plus className="h-4 w-4" /> Add Material
                          </button>
                        </>
                      );
                    })()}
                  </div>

                  <h5 className="text-sm font-medium text-foreground mb-2">Topics</h5>
                  {chapter.topics && chapter.topics.length > 0 ? (
                    <div className="space-y-3">
                      {chapter.topics.map((topic) => (
                        <div key={topic.id} className="ml-4 border-l-2 border-primary/30 pl-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                value={topic.topicName}
                                onChange={(e) => onUpdateTopic(chapter.id, topic.id, e.target.value)}
                                className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                              />
                            </div>
                            <button
                              onClick={() => onToggleTopic(topic.id)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {expandedTopics.has(topic.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>

                          {expandedTopics.has(topic.id) && (
                            <div className="mt-2 space-y-2">
                              {topic.materials && topic.materials.length > 0 ? (
                                topic.materials.map((mat) => {
                                  const Icon = materialIcon(mat.type);
                                  return (
                                    <div key={mat.id} className="flex items-center justify-between p-2 bg-muted/10 rounded">
                                      <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-primary" />
                                        <span className="text-sm">{mat.title}</span>
                                      </div>
                                      {mat.url && (
                                        <a
                                          href={mat.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary text-xs hover:underline"
                                        >
                                          View
                                        </a>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-xs text-muted-foreground">No materials for this topic.</p>
                              )}
                              <div className="bg-muted/10 rounded-lg p-2">
                                {(() => {
                                  const draft = getTopicDraft(chapter.id, topic.id);
                                  const hasTitle = draft.title.trim().length > 0;
                                  const hasFile = !!draft.file;
                                  const hasUrl = draft.url.trim().length > 0;
                                  const canAdd = hasTitle && (hasFile !== hasUrl);
                                  return (
                                    <>
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                        <input
                                          value={draft.title}
                                          onChange={(e) =>
                                            setTopicDraft(chapter.id, topic.id, {
                                              title: e.target.value,
                                            })
                                          }
                                          placeholder="Title"
                                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                        <input
                                          type="file"
                                          accept=".pdf,.doc,.docx,.ppt,.pptx"
                                          onChange={(e) =>
                                            setTopicDraft(chapter.id, topic.id, {
                                              file: e.target.files?.[0] || null,
                                            })
                                          }
                                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                        <input
                                          value={draft.url}
                                          onChange={(e) =>
                                            setTopicDraft(chapter.id, topic.id, { url: e.target.value })
                                          }
                                          placeholder="URL (optional)"
                                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                        <input
                                          value={draft.content}
                                          onChange={(e) =>
                                            setTopicDraft(chapter.id, topic.id, {
                                              content: e.target.value,
                                            })
                                          }
                                          placeholder="Short note (optional)"
                                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                      </div>
                                      <button
                                        onClick={() => {
                                          if (!canAdd) return;
                                          if (draft.file && draft.url.trim()) {
                                            toast.error("Please provide either a file or a URL, not both.");
                                            return;
                                          }
                                          if (draft.file && !isAllowedFile(draft.file.name)) {
                                            toast.error("Only PDF, Word, or PowerPoint files are allowed.");
                                            return;
                                          }
                                          const nextType = draft.file
                                            ? inferFileType(draft.file.name)
                                            : "link";
                                          const nextUrl = draft.file
                                            ? URL.createObjectURL(draft.file)
                                            : draft.url.trim();
                                          onAddTopicMaterial(chapter.id, topic.id, {
                                            title: draft.title.trim(),
                                            type: nextType,
                                            url: nextUrl || undefined,
                                            content: draft.content.trim() || undefined,
                                          });
                                          setTopicDraft(chapter.id, topic.id, {
                                            title: "",
                                            url: "",
                                            content: "",
                                            file: null,
                                          });
                                        }}
                                        disabled={!canAdd}
                                        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-primary px-2 py-1 text-xs text-primary hover:bg-primary/10 disabled:opacity-50"
                                      >
                                        <Plus className="h-3 w-3" /> Add Topic Material
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No topics in this chapter.</p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      value={topicDrafts[chapter.id] || ""}
                      onChange={(e) =>
                        setTopicDrafts((prev) => ({ ...prev, [chapter.id]: e.target.value }))
                      }
                      placeholder="New topic name"
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                    <button
                      onClick={() => {
                        const name = (topicDrafts[chapter.id] || "").trim();
                        if (!name) return;
                        onAddTopic(chapter.id, name);
                        setTopicDrafts((prev) => ({ ...prev, [chapter.id]: "" }));
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-4 w-4" /> Add Topic
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No chapters added yet.</p>
      )}
    </div>
  );
};

export default ChaptersTab;
