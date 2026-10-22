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
    jest.resetAllMocks();
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

  it('rejects moving a parent that already has children under another root', async () => {
    prisma.category.findFirst
      .mockResolvedValueOnce({
        id: 1,
        parentId: null,
        type: CategoryType.expense,
      })
      .mockResolvedValueOnce({
        id: 3,
        parentId: null,
        type: CategoryType.expense,
      });
    prisma.category.count.mockResolvedValue(1);
    prisma.category.findMany.mockResolvedValue([{ id: 2, parentId: 1 }]);
    await expect(service.update(1, 1, { parentId: 3 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.category.update).not.toHaveBeenCalled();
  });

  it('allows a leaf category to move to an owned root', async () => {
    prisma.category.findFirst
      .mockResolvedValueOnce({ id: 2, parentId: 1, type: CategoryType.expense })
      .mockResolvedValueOnce({
        id: 3,
        parentId: null,
        type: CategoryType.expense,
      });
    prisma.category.count.mockResolvedValue(0);
    prisma.category.update.mockResolvedValue({ id: 2, parentId: 3 });
    prisma.category.findMany.mockResolvedValue([]);
    await expect(service.update(1, 2, { parentId: 3 })).resolves.toEqual({
      id: 2,
      parentId: 3,
      children: [],
    });
  });

  it('rejects a cycle through an existing child', async () => {
    prisma.category.findFirst
      .mockResolvedValueOnce({
        id: 1,
        parentId: null,
        type: CategoryType.expense,
      })
      .mockResolvedValueOnce({
        id: 2,
        parentId: 1,
        type: CategoryType.expense,
      });
    prisma.category.count.mockResolvedValue(1);
    await expect(service.update(1, 1, { parentId: 2 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.category.update).not.toHaveBeenCalled();
  });

  it('rejects a parent not owned by the requester', async () => {
    prisma.category.findFirst
      .mockResolvedValueOnce({
        id: 1,
        parentId: null,
        type: CategoryType.expense,
      })
      .mockResolvedValueOnce(null);
    prisma.category.count.mockResolvedValue(0);
    await expect(service.update(1, 1, { parentId: 99 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.category.findFirst).toHaveBeenLastCalledWith({
      where: { id: 99, userId: 1, isActive: true },
    });
    expect(prisma.category.update).not.toHaveBeenCalled();
  });
});
