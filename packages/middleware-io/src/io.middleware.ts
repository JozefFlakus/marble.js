import * as t from 'io-ts';
import { Reporter } from 'io-ts/lib/Reporter';
import { Either } from 'fp-ts/lib/Either';
import { Observable } from 'rxjs';
import { map} from 'rxjs/operators';
import { defaultReporter } from './io.reporter';
import { IOError } from './io.error';

export type Schema = t.Any;

export interface ValidatorOptions {
  reporter?: Reporter<any>;
  context?: string;
}

const validateError =
  (reporter: Reporter<any> = defaultReporter, context?: string) =>
  (result: Either<t.Errors, any>) =>
    result.getOrElseL(() => {
      throw new IOError('Validation error', reporter.report(result), context);
    });

export const validator$ = <U extends Schema, T>
  (schema: U | undefined, options: ValidatorOptions = {}) => (i$: Observable<T>) =>
    !!schema ? i$.pipe(
      map(input => schema.decode(input)),
      map(validateError(options.reporter, options.context)),
      map(input => input as t.TypeOf<typeof schema>),
    ) : i$;

