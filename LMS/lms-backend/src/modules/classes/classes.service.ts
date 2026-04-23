import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SchoolClass, SchoolClassDocument } from './schemas/class.schema';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(SchoolClass.name)
    private readonly classModel: Model<SchoolClassDocument>,
  ) {}

  async create(dto: CreateClassDto) {
    const existing = await this.classModel.exists({
      grade: dto.grade,
      section: dto.section ?? '',
      academicYear: dto.academicYear,
    });
    if (existing) {
      throw new ConflictException(
        'Class already exists for this academic year.',
      );
    }

    const classDoc = await this.classModel.create({
      ...dto,
      section: dto.section ?? '',
      displayName: dto.section ? `${dto.grade}-${dto.section}` : dto.grade,
      subjects: dto.subjects ?? [],
    });

    return this.toResponse(classDoc);
  }

  async findAll() {
    const classes = await this.classModel
      .find()
      .sort({ grade: 1, section: 1 })
      .exec();
    return classes.map((entry) => this.toResponse(entry));
  }

  async update(id: string, dto: UpdateClassDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Class not found.');
    }

    const classDoc = await this.classModel.findById(id).exec();
    if (!classDoc) {
      throw new NotFoundException('Class not found.');
    }

    if (dto.grade) classDoc.grade = dto.grade;
    if (dto.section) classDoc.section = dto.section;
    if (dto.academicYear) classDoc.academicYear = dto.academicYear;
    if (dto.subjects) classDoc.subjects = dto.subjects;
    classDoc.displayName = classDoc.section
      ? `${classDoc.grade}-${classDoc.section}`
      : classDoc.grade;

    await classDoc.save();
    return this.toResponse(classDoc);
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Class not found.');
    }

    const deleted = await this.classModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException('Class not found.');
    }

    return { success: true };
  }

  private toResponse(
    entry: SchoolClassDocument | (SchoolClass & { _id: Types.ObjectId }),
  ) {
    return {
      id: entry._id.toString(),
      grade: entry.grade,
      section: entry.section,
      academicYear: entry.academicYear,
      displayName: entry.displayName,
      subjects: entry.subjects,
    };
  }
}
