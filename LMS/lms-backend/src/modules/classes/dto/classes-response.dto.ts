import { ApiProperty } from '@nestjs/swagger';

export class ClassItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  grade!: string;

  @ApiProperty()
  section!: string;

  @ApiProperty()
  academicYear!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ type: [String] })
  subjects!: string[];
}

export class ClassesListResponseDto {
  @ApiProperty({ type: [ClassItemDto] })
  data!: ClassItemDto[];
}

export class ClassSingleResponseDto {
  @ApiProperty({ type: ClassItemDto })
  data!: ClassItemDto;
}

class ClassRemovePayloadDto {
  @ApiProperty()
  success!: boolean;
}

export class ClassRemoveResponseDto {
  @ApiProperty({ type: ClassRemovePayloadDto })
  data!: ClassRemovePayloadDto;
}
