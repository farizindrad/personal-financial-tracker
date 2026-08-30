import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LiabilityType } from '@prisma/client';

export class CreateLiabilityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(LiabilityType)
  @IsOptional()
  type?: LiabilityType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  amount: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  notes?: string;
}
