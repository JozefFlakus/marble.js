import { map } from 'rxjs/operators';
import { ErrorEffect } from '../effects/effects.interface';
import { HttpStatus } from '../http.interface';
import { HttpError, isHttpError } from './error.model';

const defaultHttpError = new HttpError(
  'Internal server error',
  HttpStatus.INTERNAL_SERVER_ERROR,
);

const getStatusCode = (error: HttpError): HttpStatus => isHttpError(error)
  ? error.status
  : HttpStatus.INTERNAL_SERVER_ERROR;

const errorFactory = (message: string, status: HttpStatus, data?: any) => ({
  error: { status, message, data }
});

export const defaultError$: ErrorEffect<HttpError> = (req$, _, error = defaultHttpError) => req$
  .pipe(
    map(() => {
      const { message, data } = error;
      const status = getStatusCode(error);
      const body = errorFactory(message, status, data);
      return { status, body };
    }),
  );
