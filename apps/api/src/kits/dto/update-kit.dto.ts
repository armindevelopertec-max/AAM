import { PartialType } from '@nestjs/mapped-types';
import { CreateKitDto } from './create-kit.dto';

export class UpdateKitDto extends PartialType(CreateKitDto) {}
