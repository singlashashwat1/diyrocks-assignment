import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  MessageEvent,
  Post,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(@Body() dto: CreateEventDto) {
    const result = this.eventsService.addEvent(dto);
    if (!result.accepted) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message:
            'Buffer is full and all are high-priority. No low/normal event can be evicted.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return result.event;
  }

  @Get()
  findAll() {
    return this.eventsService.getAllSorted();
  }

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return this.eventsService.eventStream();
  }
}
