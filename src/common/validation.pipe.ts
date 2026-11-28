import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export function createValidationPipe(): ValidationPipe {
  const messages = (errors: ValidationError[]): string[] =>
    errors.flatMap((error) => [
      ...Object.entries(error.constraints ?? {}).map(([rule, message]) =>
        rule === 'whitelistValidation'
          ? `El campo ${error.property} no está permitido`
          : message,
      ),
      ...messages(error.children ?? []),
    ]);

  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => new BadRequestException(messages(errors)),
  });
}
