import { IsIn, IsString, MinLength } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MinLength(1)
  type!: string;

  @IsString()
  @MinLength(1)
  message!: string;

  @IsIn(['low', 'normal', 'high'])
  priority!: 'low' | 'normal' | 'high';
}
