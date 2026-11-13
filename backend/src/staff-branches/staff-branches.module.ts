import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffBranchesController } from './staff-branches.controller';
import { StaffBranchesService } from './staff-branches.service';

@Module({
  imports: [AuthModule],
  controllers: [StaffBranchesController],
  providers: [StaffBranchesService],
})
export class StaffBranchesModule {}
