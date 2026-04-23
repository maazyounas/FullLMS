import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @MinLength(1)
  grade!: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsString()
  @MinLength(4)
  academicYear!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];
}
