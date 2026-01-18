import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface HttpExceptionResponse {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    // Type guard para verificar se é HttpExceptionResponse
    const isHttpExceptionResponse = (
      res: string | object,
    ): res is HttpExceptionResponse => {
      return typeof res === 'object' && 'message' in res;
    };

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : isHttpExceptionResponse(exceptionResponse)
          ? exceptionResponse.message
          : 'An error occurred';

    const details =
      typeof exceptionResponse === 'object' && 'message' in exceptionResponse
        ? exceptionResponse
        : undefined;

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    if (exception instanceof Error) {
      errorResponse.error = exception.name;
    }

    if (details && typeof details === 'object') {
      errorResponse.details = details;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : exception,
      );
    } else {
      const messageStr = Array.isArray(message) ? message.join(', ') : message;
      this.logger.warn(
        `${request.method} ${request.url} - ${status}: ${messageStr}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
