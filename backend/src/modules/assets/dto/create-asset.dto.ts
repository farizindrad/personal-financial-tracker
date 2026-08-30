import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssetType } from '@prisma/client';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(AssetType)
  @IsOptional()
  type?: AssetType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  value: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  notes?: string;
}
