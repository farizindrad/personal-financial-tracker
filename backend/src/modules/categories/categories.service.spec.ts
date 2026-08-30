import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  const prisma = {
    category: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CategoriesService);
  });

  it('findAll loads children via include in a single findMany', async () => {
    prisma.category.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Makanan',
        type: CategoryType.expense,
        parentId: null,
        children: [{ id: 2, name: 'Makan di luar', parentId: 1 }],
      },
    ]);
    prisma.category.count.mockResolvedValue(1);

    const result = await service.findAll(1, 1, 50);

    expect(prisma.category.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { parentId: null, isActive: true, userId: 1 },
        include: {
          children: {
            where: { isActive: true, userId: 1 },
            orderBy: { name: 'asc' },
          },
        },
      }),
    );
    expect(result.data[0].children).toHaveLength(1);
  });

  it('create rejects nested parent (sub under sub)', async () => {
    prisma.category.findFirst.mockResolvedValue({
      id: 2,
      name: 'Makan di luar',
      type: CategoryType.expense,
      parentId: 1,
      isActive: true,
    });

    await expect(
      service.create(1, {
        name: 'Too deep',
        type: CategoryType.expense,
        parentId: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
