import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { appConfig, envValidationSchema } from './config';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: (config) => envValidationSchema.parse(config),
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
