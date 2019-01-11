import { Event, EventError, ValidatedEvent } from '@marblejs/core';
import { Observable, of, throwError } from 'rxjs';
import { mergeMap, map, catchError } from 'rxjs/operators';
import { Schema, ValidatorOptions, validator$ } from './io.middleware';
import { IOError } from './io.error';

export const eventValidator$ = <U extends Schema, T extends Event>
  (schema: U, options?: ValidatorOptions) => {
    const eventValidator$ = validator$(schema, options);

    return (event$: Observable<T>) =>
      event$.pipe(
        mergeMap(event => eventValidator$(of(event.payload as any)).pipe(
          map(payload => event as ValidatedEvent<typeof payload>),
          catchError((error: IOError) => throwError(
            new EventError(event as any, error.message, error.data),
          )),
        )),
      );
  };
