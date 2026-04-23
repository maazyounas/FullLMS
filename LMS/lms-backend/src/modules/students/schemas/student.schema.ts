import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'students' })
export class Student {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  admissionNo!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, trim: true })
  grade!: string;

  @Prop({ required: true, trim: true })
  guardian!: string;

  @Prop({ required: true, trim: true })
  guardianPhone!: string;

  @Prop({ trim: true, default: '' })
  gender!: string;

  @Prop({ trim: true, default: '' })
  dob!: string;

  @Prop({ trim: true, default: '' })
  phone!: string;

  @Prop({ trim: true, default: '' })
  address!: string;

  @Prop({ type: [String], default: [] })
  subjects!: string[];

  @Prop({ type: [String], default: [] })
  enrolledCourses!: string[];

  @Prop({ type: [String], default: [] })
  enrolledCourseIds!: string[];

  @Prop({ trim: true })
  avatarUrl?: string;

  @Prop({ default: 'Active' })
  status!: string;
}

export type StudentDocument = HydratedDocument<Student>;
export const StudentSchema = SchemaFactory.createForClass(Student);

StudentSchema.index({ admissionNo: 1 }, { unique: true });
StudentSchema.index({ grade: 1, status: 1 });
StudentSchema.index({ email: 1 });
StudentSchema.index({ enrolledCourseIds: 1 });
