import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { LiabilitiesService } from './liabilities.service';
import { CreateLiabilityDto } from './dto/create-liability.dto';
import { UpdateLiabilityDto } from './dto/update-liability.dto';
import { ListLiabilitiesQueryDto } from './dto/list-liabilities-query.dto';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.decorators';

@Controller('liabilities')
export class LiabilitiesController {
  constructor(private readonly liabilitiesService: LiabilitiesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ListLiabilitiesQueryDto,
  ) {
    return this.liabilitiesService.findAll(
      user.id,
      query.page ?? 1,
      query.limit ?? 50,
    );
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLiabilityDto) {
    return this.liabilitiesService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLiabilityDto,
  ) {
    return this.liabilitiesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.liabilitiesService.remove(user.id, id);
  }
}
