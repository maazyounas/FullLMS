import { apiAuthRequest } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface StudyMaterial {
  id?: string;
  title: string;
  type: 'pdf' | 'doc' | 'video' | 'link' | 'image' | 'other';
  url?: string;
  content?: string;
}

export interface CourseTopic {
  id?: string;
  topicName: string;
  description?: string;
  materials?: StudyMaterial[];
}

export interface CourseChapter {
  id?: string;
  chapterNumber: number;
  chapterName: string;
  description?: string;
  topics?: CourseTopic[];
  materials?: StudyMaterial[];
}

interface PastPaper {
  title: string;
  year: string;
  totalMarks: number;
  file: string;
}

interface Teacher {
  _id: string;
  name: string;
  email: string;
  qualification?: string;
  phone?: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  teacher?: Teacher;
  teacherId: string;
  grade: string;
  description: string;
  overviewTitle?: string;
  learningOutcomes?: string[];
  objectives?: string[];
  thumbnailUrl?: string;
  schedule: string;
  weeklySchedule?: Array<{
    id?: string;
    day: string;
    startTime: string;
    endTime: string;
    topic?: string;
    location?: string;
  }>;
  room?: string;
  credits?: number;
  progress?: number;
  chapters?: CourseChapter[];
  materials?: StudyMaterial[];
  pastPapers?: PastPaper[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

type StudentProfile = {
  id: string;
  grade: string;
  subjects?: string[];
  enrolledCourses?: string[];
};

const toCourseCode = (grade: string, subject: string) =>
  `${grade}-${subject}`.replace(/\s+/g, '-').toUpperCase();

const buildFallbackCourses = (profile: StudentProfile): Course[] => {
  const subjects = Array.from(
    new Set([
      ...(profile.enrolledCourses ?? []),
      ...(profile.subjects ?? []),
    ]
      .map((item) => item.trim())
      .filter(Boolean)),
  );

  return subjects.map((subject, index) => ({
    id: `subject-${index + 1}-${subject.toLowerCase().replace(/\s+/g, '-')}`,
    name: subject,
    code: toCourseCode(profile.grade, subject),
    teacherId: '',
    grade: profile.grade,
    description: `${subject} course assigned through your class enrollment.`,
    schedule: 'As per class timetable',
    room: profile.grade,
    credits: 1,
    progress: 0,
    materials: [],
    chapters: [],
    pastPapers: [],
    status: 'Active',
  }));
};

export const useCourses = () => {
  const queryClient = useQueryClient();

  const {
    data: courses = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['student-courses'],
    queryFn: async () => {
      try {
        const data = await apiAuthRequest<Course[]>('/courses/student/enrolled');
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
        const profile = await apiAuthRequest<StudentProfile>('/students/me');
        return buildFallbackCourses(profile);
      } catch (err) {
        // Secondary fallback when courses endpoint fails but student profile still loads.
        const profile = await apiAuthRequest<StudentProfile>('/students/me');
        return buildFallbackCourses(profile);
      }
    },
  });

  const toggleTopicMutation = useMutation({
    mutationFn: async ({ courseId, topicId, completed }: { courseId: string; topicId: string; completed: boolean }) => {
      await apiAuthRequest<{ progress: number; completedTopicIds: string[] }>(`/courses/${courseId}/progress/topics/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, completed }),
      });
      return { courseId, topicId, completed };
    },
    onMutate: async ({ courseId, topicId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['student-courses'] });
      const previousCourses = queryClient.getQueryData<Course[]>(['student-courses']);
      
      queryClient.setQueryData<Course[]>(['student-courses'], (old) => {
        if (!old) return old;
        return old.map(course => course.id === courseId ? {
          ...course,
          progress: Math.max(0, Math.min(100, Math.round((countCompletedTopics(course, topicId, completed) / Math.max(countAllTopics(course), 1)) * 100)))
        } : course);
      });
      
      return { previousCourses };
    },
    onError: (err, variables, context) => {
      if (context?.previousCourses) {
        queryClient.setQueryData(['student-courses'], context.previousCourses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['student-courses'] });
    },
  });

  return {
    courses,
    isLoading,
    error: error ? (error instanceof Error ? error.message : String(error)) : null,
    toggleTopicCompletion: async (courseId: string, topicId: string, completed: boolean) => {
      await toggleTopicMutation.mutateAsync({ courseId, topicId, completed });
    },
  };
};

const countAllTopics = (course: Course) =>
  (course.chapters ?? []).reduce(
    (total, chapter) => total + (chapter.topics?.length ?? 0),
    0,
  );

const countCompletedTopics = (
  course: Course,
  topicId: string,
  completed: boolean,
) => {
  const totalTopics = countAllTopics(course);
  if (totalTopics === 0 || !course.progress) {
    return completed ? 1 : 0;
  }

  const estimatedCompleted = Math.round((course.progress / 100) * totalTopics);
  if (completed) {
    return Math.min(totalTopics, estimatedCompleted + 1);
  }

  return Math.max(0, estimatedCompleted - 1);
};
