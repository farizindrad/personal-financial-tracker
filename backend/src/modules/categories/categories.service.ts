import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category, CategoryType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

export type CategoryWithChildren = Category & { children: Category[] };

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: number,
    page = 1,
    limit = 50,
    type?: CategoryType,
  ): Promise<{
    data: CategoryWithChildren[];
    meta: { total: number; page: number; limit: number };
  }> {
    const skip = (page - 1) * limit;
    const where: Prisma.CategoryWhereInput = {
      userId,
      parentId: null,
      isActive: true,
      ...(type ? { type } : {}),
    };

    // Satu query + include children — anti N+1
    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        include: {
          children: {
            where: { userId, isActive: true },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.category.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async create(
    userId: number,
    dto: CreateCategoryDto,
  ): Promise<CategoryWithChildren> {
    if (dto.parentId != null) {
      await this.assertValidParent(userId, dto.parentId, dto.type);
    }

    try {
      const created = await this.prisma.category.create({
        data: {
          userId,
          name: dto.name,
          type: dto.type,
          parentId: dto.parentId,
          icon: dto.icon,
          color: dto.color,
        },
      });
      return { ...created, children: [] };
    } catch (error) {
      this.rethrowUniqueConflict(error);
    }
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateCategoryDto,
  ): Promise<CategoryWithChildren> {
    const existing = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }
      await this.assertValidParent(userId, dto.parentId, existing.type);
    }

    try {
      const updated = await this.prisma.category.update({
        where: { id },
        data: {
          name: dto.name,
          parentId: dto.parentId,
          icon: dto.icon,
          color: dto.color,
          isActive: dto.isActive,
        },
      });
      const children = await this.prisma.category.findMany({
        where: { userId, parentId: id, isActive: true },
        orderBy: { name: 'asc' },
      });
      return { ...updated, children };
    } catch (error) {
      this.rethrowUniqueConflict(error);
    }
  }

  private async assertValidParent(
    userId: number,
    parentId: number,
    childType: CategoryType,
  ): Promise<void> {
    const parent = await this.prisma.category.findFirst({
      where: { id: parentId, userId, isActive: true },
    });
    if (!parent) {
      throw new BadRequestException(`Parent category #${parentId} not found`);
    }
    if (parent.parentId != null) {
      throw new BadRequestException(
        'Sub-category cannot nest under another sub-category',
      );
    }
    if (parent.type !== childType) {
      throw new BadRequestException('Sub-category type must match parent type');
    }
  }

  private rethrowUniqueConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Category name already exists for this type');
    }
    throw error;
  }
}
