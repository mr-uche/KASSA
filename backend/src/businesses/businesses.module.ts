import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { BusinessExportService } from './business-export.service';

@Module({
  imports: [AuthModule],
  controllers: [BusinessesController],
  providers: [BusinessesService, BusinessExportService],
})
export class BusinessesModule {}
