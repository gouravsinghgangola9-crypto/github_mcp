import { Module } from '@nestjs/common';
import { PolicyEngine } from './policy.engine';
import { AuditLogger } from './audit.logger';
import { PolicyGateway } from './policy.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [PolicyEngine, AuditLogger, PolicyGateway],
  exports: [PolicyEngine, AuditLogger, PolicyGateway],
})
export class PolicyModule {}
