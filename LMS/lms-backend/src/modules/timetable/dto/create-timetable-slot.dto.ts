import { IsArray, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTimetableSlotDto {
  @ApiProperty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  className!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  subject!: string;

  @ApiProperty()
  @IsString()
  teacherId!: string;
}

export class CreateTimetableSlotsBulkDto {
  @ApiProperty({ type: [CreateTimetableSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTimetableSlotDto)
  slots!: CreateTimetableSlotDto[];
}
