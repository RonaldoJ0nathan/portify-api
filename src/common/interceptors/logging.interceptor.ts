import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

interface LogMetadata {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  ip: string;
  userAgent: string;
  timestamp: string;
}

declare module 'express' {
  interface Request {
    requestId?: string;
  }
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly excludedRoutes = ['/health', '/metrics', '/favicon.ico'];

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, headers } = request;

    if (this.shouldSkipLogging(url)) {
      return next.handle();
    }

    const requestId = randomUUID();
    request.requestId = requestId;
    response.setHeader('X-Request-ID', requestId);

    const ip = request.ip ?? 'unknown';
    const userAgent = headers['user-agent'] || 'Unknown';
    const startTime = Date.now();

    // Log de entrada apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`→ [${requestId}] ${method} ${url} - ${ip}`);
    }

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        const { statusCode } = response;

        const metadata: LogMetadata = {
          requestId,
          method,
          url,
          statusCode,
          responseTime,
          ip,
          userAgent,
          timestamp: new Date().toISOString(),
        };

        this.logResponse(metadata);
      }),
      catchError((error: unknown) => {
        const responseTime = Date.now() - startTime;

        // Type guard para verificar se error tem propriedade status
        const statusCode =
          error && typeof error === 'object' && 'status' in error
            ? (error.status as number)
            : 500;

        const metadata: LogMetadata = {
          requestId,
          method,
          url,
          statusCode,
          responseTime,
          ip,
          userAgent,
          timestamp: new Date().toISOString(),
        };

        const stack = error instanceof Error ? error.stack : String(error);

        this.logError(metadata, stack);

        return throwError(() => error);
      }),
    );
  }

  private shouldSkipLogging(url: string): boolean {
    return this.excludedRoutes.some((route) => url.startsWith(route));
  }

  private logResponse(metadata: LogMetadata): void {
    const { statusCode } = metadata;

    if (process.env.NODE_ENV === 'production') {
      this.logger.log(JSON.stringify(metadata));
    } else {
      const logMessage = this.formatLog(metadata);

      if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }
    }
  }

  private logError(metadata: LogMetadata, stack: string | undefined): void {
    if (process.env.NODE_ENV === 'production') {
      this.logger.error(JSON.stringify({ ...metadata, stack }));
    } else {
      this.logger.error(this.formatLog(metadata), stack);
    }
  }

  private formatLog(metadata: LogMetadata): string {
    const { requestId, method, url, statusCode, responseTime } = metadata;
    const emoji = this.getStatusEmoji(statusCode);
    return `${emoji} [${requestId.slice(0, 8)}] ${method} ${url} ${statusCode} - ${responseTime}ms`;
  }

  private getStatusEmoji(statusCode: number): string {
    if (statusCode >= 500) return '✗';
    if (statusCode >= 400) return '⚠';
    if (statusCode >= 300) return '↻';
    if (statusCode >= 200) return '✓';
    return '→';
  }
}
