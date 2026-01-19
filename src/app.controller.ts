import { Controller, Get } from '@nestjs/common';

@Controller({ path: '', version: '1' })
export class AppController {
  @Get()
  getRoot() {
    const response = {
      name: 'Portify API',
      status: 'running',
      version: 'v1',
      documentation: '/docs',
      health: '/health',
    };

    if (process.env.NODE_ENV === 'development') {
      return {
        ...response,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        port: process.env.PORT || 3000,
      };
    }

    return response;
  }
}
