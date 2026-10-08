import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TimetableSlot,
  TimetableSlotDocument,
} from './schemas/timetable-slot.schema';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';
import { Teacher, TeacherDocument } from '../teachers/schemas/teacher.schema';
import {
  SchoolClass,
  SchoolClassDocument,
} from '../classes/schemas/class.schema';
import { UserRole } from '../../common/auth/roles.enum';
import { StudentsService } from '../students/students.service';

@Injectable()
export class TimetableService {
  constructor(
    @InjectModel(TimetableSlot.name)
    private readonly slotModel: Model<TimetableSlotDocument>,
    @InjectModel(Teacher.name)
    private readonly teacherModel: Model<TeacherDocument>,
    @InjectModel(SchoolClass.name)
    private readonly classModel: Model<SchoolClassDocument>,
    private readonly studentsService: StudentsService,
  ) {}

  async list(query: {
    weekStart?: string;
    weekEnd?: string;
    teacherId?: string;
    className?: string;
    actorRole: UserRole;
    actorUserId: string;
  }) {
    if (query.actorRole === UserRole.TEACHER) {
      const teacherProfile = await this.teacherModel
        .findOne({ userId: query.actorUserId })
        .select('_id')
        .lean<{ _id: Types.ObjectId } | null>()
        .exec();

      if (!teacherProfile) {
        return [];
      }

      query.teacherId = teacherProfile._id.toString();
    }

    if (query.actorRole === UserRole.STUDENT) {
      const studentProfile = await this.studentsService.findByUserId(
        query.actorUserId,
      );
      query.className = studentProfile.grade;
      query.teacherId = undefined;
    }

    const filter: Record<string, unknown> = {};

    if (query.weekStart || query.weekEnd) {
      filter.date = {
        ...(query.weekStart ? { $gte: query.weekStart } : {}),
        ...(query.weekEnd ? { $lte: query.weekEnd } : {}),
      };
    }

    if (query.teacherId) {
      filter.teacherId = query.teacherId;
    }

    if (query.className) {
      filter.className = query.className;
    }

    const slots = await this.slotModel
      .find(filter)
      .sort({ date: 1, startTime: 1 })
      .exec();
    return slots.map((slot) => this.toResponse(slot));
  }

  async create(dto: CreateTimetableSlotDto, actorRole: UserRole, actorUserId: string) {
    this.validateTimeOrder(dto.startTime, dto.endTime);

    let teacherProfileId: string | null = null;
    if (actorRole === UserRole.TEACHER) {
      const profile = await this.teacherModel.findOne({ userId: actorUserId }).exec();
      if (!profile) {
        throw new NotFoundException('Teacher profile not found.');
      }
      teacherProfileId = profile._id.toString();

      if (dto.teacherId !== teacherProfileId) {
        throw new ForbiddenException('Teachers can only create timetable entries for themselves.');
      }
    }

    const teacher = await this.findTeacherById(dto.teacherId);
    await this.validateTeacherEligibility(teacher, dto.className, dto.subject);
    await this.ensureNoConflicts({
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      className: dto.className,
      teacherId: dto.teacherId,
    });

    const slot = await this.slotModel.create({
      ...dto,
      teacherName: teacher.name,
    });

    return this.toResponse(slot);
  }

  async createBulk(dtos: CreateTimetableSlotDto[], actorRole: UserRole, actorUserId: string) {
    let teacherProfileId: string | null = null;
    if (actorRole === UserRole.TEACHER) {
      const profile = await this.teacherModel.findOne({ userId: actorUserId }).exec();
      if (!profile) {
        throw new NotFoundException('Teacher profile not found.');
      }
      teacherProfileId = profile._id.toString();
    }

    const slotsToCreate: any[] = [];

    for (const dto of dtos) {
      this.validateTimeOrder(dto.startTime, dto.endTime);

      if (actorRole === UserRole.TEACHER && dto.teacherId !== teacherProfileId) {
        throw new ForbiddenException('Teachers can only create timetable entries for themselves.');
      }

      const teacher = await this.findTeacherById(dto.teacherId);
      await this.validateTeacherEligibility(teacher, dto.className, dto.subject);

      await this.ensureNoConflicts({
        date: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        className: dto.className,
        teacherId: dto.teacherId,
      });

      const batchConflict = slotsToCreate.some((existing) => 
        existing.date === dto.date &&
        (existing.className === dto.className || existing.teacherId === dto.teacherId) &&
        this.overlaps(dto.startTime, dto.endTime, existing.startTime, existing.endTime)
      );

      if (batchConflict) {
        throw new ConflictException(
          `Overlap conflict detected within the new timetable slots batch for date ${dto.date}.`
        );
      }

      slotsToCreate.push({
        ...dto,
        teacherName: teacher.name,
      });
    }

    const createdSlots = await this.slotModel.create(slotsToCreate);
    return createdSlots.map((slot) => this.toResponse(slot));
  }

  async update(id: string, dto: UpdateTimetableSlotDto, actorRole: UserRole, actorUserId: string) {
    const slot = await this.findSlotById(id);

    let teacherProfileId: string | null = null;
    if (actorRole === UserRole.TEACHER) {
      const profile = await this.teacherModel.findOne({ userId: actorUserId }).exec();
      if (!profile) {
        throw new NotFoundException('Teacher profile not found.');
      }
      teacherProfileId = profile._id.toString();

      if (slot.teacherId !== teacherProfileId || (dto.teacherId && dto.teacherId !== teacherProfileId)) {
        throw new ForbiddenException('Teachers can only modify their own timetable entries.');
      }
    }

    const nextDate = dto.date ?? slot.date;
    const nextStart = dto.startTime ?? slot.startTime;
    const nextEnd = dto.endTime ?? slot.endTime;
    const nextClass = dto.className ?? slot.className;
    const nextSubject = dto.subject ?? slot.subject;
    const nextTeacherId = dto.teacherId ?? slot.teacherId;

    this.validateTimeOrder(nextStart, nextEnd);

    const teacher = await this.findTeacherById(nextTeacherId);
    await this.validateTeacherEligibility(teacher, nextClass, nextSubject);
    await this.ensureNoConflicts(
      {
        date: nextDate,
        startTime: nextStart,
        endTime: nextEnd,
        className: nextClass,
        teacherId: nextTeacherId,
      },
      slot._id.toString(),
    );

    slot.date = nextDate;
    slot.startTime = nextStart;
    slot.endTime = nextEnd;
    slot.className = nextClass;
    slot.subject = nextSubject;
    slot.teacherId = nextTeacherId;
    slot.teacherName = teacher.name;

    await slot.save();
    return this.toResponse(slot);
  }

  async remove(id: string, actorRole: UserRole, actorUserId: string) {
    const slot = await this.findSlotById(id);

    if (actorRole === UserRole.TEACHER) {
      const profile = await this.teacherModel.findOne({ userId: actorUserId }).exec();
      if (!profile) {
        throw new NotFoundException('Teacher profile not found.');
      }
      const teacherProfileId = profile._id.toString();

      if (slot.teacherId !== teacherProfileId) {
        throw new ForbiddenException('Teachers can only delete their own timetable entries.');
      }
    }

    await slot.deleteOne();
    return { id };
  }

  private validateTimeOrder(start: string, end: string) {
    const startMinutes = this.toMinutes(start);
    const endMinutes = this.toMinutes(end);
    if (endMinutes <= startMinutes) {
      throw new BadRequestException('End time must be later than start time.');
    }
  }

  private async findTeacherById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Teacher not found.');
    }

    const teacher = await this.teacherModel.findById(id).exec();
    if (!teacher) {
      throw new NotFoundException('Teacher not found.');
    }

    return teacher;
  }

  private async findSlotById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Timetable slot not found.');
    }

    const slot = await this.slotModel.findById(id).exec();
    if (!slot) {
      throw new NotFoundException('Timetable slot not found.');
    }

    return slot;
  }

  private async validateTeacherEligibility(
    teacher: TeacherDocument,
    className: string,
    subject: string,
  ) {
    const assignedClasses = teacher.classes ?? [];
    if (!assignedClasses.includes(className)) {
      throw new BadRequestException(
        'Selected teacher is not assigned to this class.',
      );
    }

    const classSpecificSubjects = this.getTeacherSubjectsForClass(
      teacher,
      className,
    );
    if (!classSpecificSubjects.includes(subject)) {
      throw new BadRequestException(
        'Selected teacher is not assigned this subject for the selected class.',
      );
    }

    const classDoc = await this.classModel
      .findOne({ displayName: className })
      .exec();
    if (classDoc && !classDoc.subjects.includes(subject)) {
      throw new BadRequestException(
        'Selected subject is not configured for this class.',
      );
    }
  }

  private getTeacherSubjectsForClass(
    teacher: TeacherDocument,
    className: string,
  ): string[] {
    const mapValues = teacher.classSubjects as unknown as
      | Record<string, string[]>
      | undefined;
    const classSubjects = Array.isArray(mapValues?.[className])
      ? mapValues?.[className]
      : [];

    if (classSubjects.length > 0) {
      return Array.from(new Set(classSubjects.filter(Boolean)));
    }

    return Array.from(
      new Set(
        (teacher.subject ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  private async ensureNoConflicts(
    slot: {
      date: string;
      startTime: string;
      endTime: string;
      className: string;
      teacherId: string;
    },
    ignoreSlotId?: string,
  ) {
    const classSlots = await this.slotModel
      .find({
        date: slot.date,
        className: slot.className,
        ...(ignoreSlotId ? { _id: { $ne: ignoreSlotId } } : {}),
      })
      .exec();

    const teacherSlots = await this.slotModel
      .find({
        date: slot.date,
        teacherId: slot.teacherId,
        ...(ignoreSlotId ? { _id: { $ne: ignoreSlotId } } : {}),
      })
      .exec();

    const classConflict = classSlots.find((existing) =>
      this.overlaps(
        slot.startTime,
        slot.endTime,
        existing.startTime,
        existing.endTime,
      ),
    );
    if (classConflict) {
      throw new ConflictException(
        'Class timetable conflict: this class already has a slot in the selected time range.',
      );
    }

    const teacherConflict = teacherSlots.find((existing) =>
      this.overlaps(
        slot.startTime,
        slot.endTime,
        existing.startTime,
        existing.endTime,
      ),
    );
    if (teacherConflict) {
      throw new ConflictException(
        'Teacher timetable conflict: this teacher already has a slot in the selected time range.',
      );
    }
  }

  private overlaps(startA: string, endA: string, startB: string, endB: string) {
    const aStart = this.toMinutes(startA);
    const aEnd = this.toMinutes(endA);
    const bStart = this.toMinutes(startB);
    const bEnd = this.toMinutes(endB);
    return aStart < bEnd && bStart < aEnd;
  }

  private toMinutes(value: string) {
    const [hourRaw, minuteRaw] = value.split(':').map((part) => Number(part));
    if (!Number.isFinite(hourRaw) || !Number.isFinite(minuteRaw)) {
      throw new BadRequestException('Invalid time format. Expected HH:mm.');
    }
    return hourRaw * 60 + minuteRaw;
  }

  private toResponse(slot: TimetableSlotDocument) {
    return {
      id: slot._id.toString(),
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      className: slot.className,
      subject: slot.subject,
      teacherId: slot.teacherId,
      teacherName: slot.teacherName,
    };
  }
}
