import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AccountType } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsEnum(AccountType)
  @IsOptional()
  type?: AccountType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  @IsOptional()
  initialBalance?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  notes?: string;
}
