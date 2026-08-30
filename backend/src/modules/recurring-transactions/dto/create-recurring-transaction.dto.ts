import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CategoryType, RecurringFrequency } from '@prisma/client';

export class CreateRecurringTransactionDto {
  @Type(() => Number)
  @IsInt()
  accountId: number;

  @Type(() => Number)
  @IsInt()
  categoryId: number;

  @IsEnum(CategoryType)
  type: CategoryType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsEnum(RecurringFrequency)
  frequency: RecurringFrequency;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  nextRunDate?: string;
}
