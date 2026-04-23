import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'timetable_slots' })
export class TimetableSlot {
  @Prop({ required: true, trim: true })
  date!: string; // YYYY-MM-DD

  @Prop({ required: true, trim: true })
  startTime!: string; // HH:mm

  @Prop({ required: true, trim: true })
  endTime!: string; // HH:mm

  @Prop({ required: true, trim: true })
  className!: string;

  @Prop({ required: true, trim: true })
  subject!: string;

  @Prop({ required: true, trim: true })
  teacherId!: string;

  @Prop({ required: true, trim: true })
  teacherName!: string;
}

export type TimetableSlotDocument = HydratedDocument<TimetableSlot>;
export const TimetableSlotSchema = SchemaFactory.createForClass(TimetableSlot);

TimetableSlotSchema.index({ date: 1, className: 1, startTime: 1, endTime: 1 });
TimetableSlotSchema.index({ date: 1, teacherId: 1, startTime: 1, endTime: 1 });
