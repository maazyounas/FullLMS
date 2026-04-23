import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  grade?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  section?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  academicYear?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];
}
