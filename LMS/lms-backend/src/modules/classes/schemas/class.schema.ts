import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'classes' })
export class SchoolClass {
  @Prop({ required: true, trim: true })
  grade!: string;

  @Prop({ required: true, trim: true })
  section!: string;

  @Prop({ required: true, trim: true })
  academicYear!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ type: [String], default: [] })
  subjects!: string[];
}

export type SchoolClassDocument = HydratedDocument<SchoolClass>;
export const SchoolClassSchema = SchemaFactory.createForClass(SchoolClass);

SchoolClassSchema.index(
  { grade: 1, section: 1, academicYear: 1 },
  { unique: true },
);
