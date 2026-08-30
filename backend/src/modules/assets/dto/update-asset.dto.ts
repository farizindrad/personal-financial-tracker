import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssetType } from '@prisma/client';

export class UpdateAssetDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsEnum(AssetType)
  @IsOptional()
  type?: AssetType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  @IsOptional()
  value?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  notes?: string;
}
