import { LoggerService, Injectable } from '@nestjs/common';

/**
 * Custom NestJS Logger that directs all output to process.stderr.
 * This is CRITICAL for MCP servers running over stdio, because process.stdout
 * is strictly reserved for JSON-RPC communication between the MCP client and server.
 */
@Injectable()
export class StderrLogger implements LoggerService {
  log(message: any, ...optionalParams: any[]) {
    this.write('LOG', message, optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.write('ERROR', message, optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.write('WARN', message, optionalParams);
  }

  debug?(message: any, ...optionalParams: any[]) {
    this.write('DEBUG', message, optionalParams);
  }

  verbose?(message: any, ...optionalParams: any[]) {
    this.write('VERBOSE', message, optionalParams);
  }

  private write(level: string, message: any, optionalParams: any[]) {
    const timestamp = new Date().toISOString();
    const context = optionalParams.length > 0 && typeof optionalParams[optionalParams.length - 1] === 'string'
      ? `[${optionalParams[optionalParams.length - 1]}] `
      : '';
    const formatted = typeof message === 'object' ? JSON.stringify(message) : message;
    process.stderr.write(`[${timestamp}] [${level}] ${context}${formatted}\n`);
  }
}
