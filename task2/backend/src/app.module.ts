import { Module } from '@nestjs/common';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    EventsModule,
    ServeStaticModule.forRoot({
      // dist/ is backend/dist → ../.. is task2 → frontend holds the AngularJS app
      rootPath: join(__dirname, '..', '..', 'frontend'),
      serveRoot: '/',
    }),
  ],
})
export class AppModule {}
