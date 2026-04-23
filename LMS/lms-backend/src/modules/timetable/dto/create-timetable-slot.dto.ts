import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateTimetableSlotDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @IsString()
  @MaxLength(80)
  className!: string;

  @IsString()
  @MaxLength(80)
  subject!: string;

  @IsString()
  teacherId!: string;
}
