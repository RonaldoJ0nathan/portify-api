import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { appConfig, envValidationSchema } from './config';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: (config) => envValidationSchema.parse(config),
    }),
    PrismaModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
