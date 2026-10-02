import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AuditLogEntry } from './policy.types';

@Injectable()
export class AuditLogger {
  private readonly logger = new Logger(AuditLogger.name);
  private readonly auditFilePath: string;
  private memoryLogs: AuditLogEntry[] = [];
  private readonly maxMemoryLogs = 100;

  constructor() {
    this.auditFilePath = path.resolve(process.cwd(), 'audit.log');
    this.loadRecentLogs();
  }

  private loadRecentLogs(): void {
    try {
      if (fs.existsSync(this.auditFilePath)) {
        const content = fs.readFileSync(this.auditFilePath, 'utf8');
        const lines = content.trim().split('\n').filter(Boolean);
        const recent = lines.slice(-this.maxMemoryLogs);
        this.memoryLogs = recent
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
      }
    } catch (error) {
      this.logger.warn(`Could not load historical audit logs: ${(error as Error).message}`);
    }
  }

  public record(entry: AuditLogEntry): void {
    this.memoryLogs.push(entry);
    if (this.memoryLogs.length > this.maxMemoryLogs) {
      this.memoryLogs.shift();
    }

    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.auditFilePath, line, { encoding: 'utf8' });
    } catch (error) {
      this.logger.error(`Failed to append to audit.log: ${(error as Error).message}`);
    }
  }

  public getRecentLogs(limit: number = 20): AuditLogEntry[] {
    return [...this.memoryLogs].reverse().slice(0, Math.min(limit, 100));
  }
}
