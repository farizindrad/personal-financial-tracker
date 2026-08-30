import { Injectable, NotFoundException } from '@nestjs/common';
import { Liability } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLiabilityDto } from './dto/create-liability.dto';
import { UpdateLiabilityDto } from './dto/update-liability.dto';

@Injectable()
export class LiabilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = { userId };

    const [data, total] = await Promise.all([
      this.prisma.liability.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.liability.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async create(userId: number, dto: CreateLiabilityDto): Promise<Liability> {
    return this.prisma.liability.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        amount: dto.amount,
        notes: dto.notes,
      },
    });
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateLiabilityDto,
  ): Promise<Liability> {
    await this.ensureLiability(userId, id);

    return this.prisma.liability.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        amount: dto.amount,
        notes: dto.notes,
      },
    });
  }

  async remove(userId: number, id: number): Promise<Liability> {
    await this.ensureLiability(userId, id);

    return this.prisma.liability.delete({ where: { id } });
  }

  private async ensureLiability(
    userId: number,
    id: number,
  ): Promise<Liability> {
    const liability = await this.prisma.liability.findFirst({
      where: { id, userId },
    });
    if (!liability) {
      throw new NotFoundException(`Liability #${id} not found`);
    }
    return liability;
  }
}
