import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MaterialType =
  | 'pdf'
  | 'doc'
  | 'video'
  | 'link'
  | 'image'
  | 'note'
  | 'other';

export interface StudyMaterial {
  id?: string;
  title: string;
  type: MaterialType;
  url?: string;
  content?: string;
  chapterId?: string;
  topicId?: string;
  createdAt?: string;
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

export interface CourseOverview {
  title: string;
  description: string;
  learningOutcomes: string[];
  objectives: string[];
  thumbnailUrl?: string;
}

export interface WeeklyScheduleItem {
  id?: string;
  day: string;
  startTime: string;
  endTime: string;
  topic?: string;
  location?: string;
}

export interface PastPaper {
  title: string;
  year: string;
  totalMarks: number;
  file: string;
}

@Schema({ timestamps: true, collection: 'courses' })
export class Course {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, trim: true })
  code!: string;

  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  teacherId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  grade!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({
    type: {
      title: { type: String, trim: true, default: '' },
      description: { type: String, trim: true, default: '' },
      learningOutcomes: { type: [String], default: [] },
      objectives: { type: [String], default: [] },
      thumbnailUrl: { type: String, trim: true, default: '' },
    },
    default: () => ({
      title: '',
      description: '',
      learningOutcomes: [],
      objectives: [],
      thumbnailUrl: '',
    }),
  })
  overview?: CourseOverview;

  @Prop({ type: [String], default: [] })
  learningOutcomes?: string[];

  @Prop({ type: [String], default: [] })
  objectives?: string[];

  @Prop({ trim: true, default: '' })
  thumbnailUrl?: string;

  @Prop({ required: true, trim: true })
  schedule!: string;

  @Prop({
    type: [
      {
        id: { type: String, trim: true },
        day: { type: String, required: true, trim: true },
        startTime: { type: String, required: true, trim: true },
        endTime: { type: String, required: true, trim: true },
        topic: { type: String, trim: true },
        location: { type: String, trim: true },
      },
    ],
    default: [],
  })
  weeklySchedule?: WeeklyScheduleItem[];

  @Prop({ trim: true })
  room?: string;

  @Prop({ default: 5 })
  credits?: number;

  @Prop({ type: [Object], default: [] })
  chapters?: CourseChapter[];

  @Prop({ type: [Object], default: [] })
  materials?: StudyMaterial[];

  @Prop({ type: [Object], default: [] })
  pastPapers?: PastPaper[];

  @Prop({ default: 'Active' })
  status?: string;
}

export type CourseDocument = HydratedDocument<Course>;
export const CourseSchema = SchemaFactory.createForClass(Course);

CourseSchema.index({ code: 1 }, { unique: true });
CourseSchema.index({ grade: 1 });
CourseSchema.index({ teacherId: 1 });
CourseSchema.index({ teacherId: 1, status: 1, grade: 1 });
