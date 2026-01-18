import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * ZodValidationPipe
 *
 * Pipe NestJS pour valider les données entrantes avec Zod.
 * Utilise un schema Zod pour valider et transformer les données.
 *
 * Exemple d'utilisation :
 * @Post()
 * async create(@Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUserInput) {
 *   // dto est validé et typé
 * }
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        // Formater les erreurs Zod pour un message plus clair
        const messages = error.errors.map((err) => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        throw new BadRequestException({
          message: 'Validation failed',
          errors: messages,
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
