import { Injectable, NotFoundException } from '@nestjs/common';
import { Asset } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = { userId };

    const [data, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async create(userId: number, dto: CreateAssetDto): Promise<Asset> {
    return this.prisma.asset.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        value: dto.value,
        notes: dto.notes,
      },
    });
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateAssetDto,
  ): Promise<Asset> {
    await this.ensureAsset(userId, id);

    return this.prisma.asset.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        value: dto.value,
        notes: dto.notes,
      },
    });
  }

  async remove(userId: number, id: number): Promise<Asset> {
    await this.ensureAsset(userId, id);

    return this.prisma.asset.delete({ where: { id } });
  }

  private async ensureAsset(userId: number, id: number): Promise<Asset> {
    const asset = await this.prisma.asset.findFirst({
      where: { id, userId },
    });
    if (!asset) {
      throw new NotFoundException(`Asset #${id} not found`);
    }
    return asset;
  }
}
