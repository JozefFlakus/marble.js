export type EventCreator<T, Payload> = { type: T; raw?: any } & ((...args: any[]) => { type: T; payload: Payload; raw?: any });

// No args
export function createEvent<T extends string, Payload>(
  type: T, creator?: () => Payload,
): { type: T } & (() => { type: T; payload: Payload; raw?: any });

// 1 arg, 1 maybe
export function createEvent<T extends string, Payload, Arg1>(
  type: T, creator: (arg1?: Arg1) => Payload,
): { type: T } & ((arg1?: Arg1) => { type: T; payload: Payload; raw?: any });
// 1 arg
export function createEvent<T extends string, Payload, Arg1>(
  type: T, creator: (arg1: Arg1) => Payload,
): { type: T } & ((arg1: Arg1) => { type: T; payload: Payload; raw?: any });

// 2 args, 2 maybe
export function createEvent<T extends string, Payload, Arg1, Arg2>(
  type: T, creator: (arg1?: Arg1, arg2?: Arg2) => Payload,
): { type: T } & ((arg1?: Arg1, arg2?: Arg2) => { type: T; payload: Payload; raw?: any });
// 2 args, 1 maybe
export function createEvent<T extends string, Payload, Arg1, Arg2>(
  type: T, creator: (arg1: Arg1, arg2?: Arg2) => Payload,
): { type: T } & ((arg1: Arg1, arg2?: Arg2) => { type: T; payload: Payload; raw?: any });
// 2 args
export function createEvent<T extends string, Payload, Arg1, Arg2>(
  type: T, creator: (arg1: Arg1, arg2: Arg2) => Payload,
): { type: T } & ((arg1: Arg1, arg2: Arg2) => { type: T; payload: Payload; raw?: any });

// 3 args, 3 maybe
export function createEvent<T extends string, Payload, Arg1, Arg2, Arg3>(
  type: T, creator: (arg1?: Arg1, arg2?: Arg2, arg3?: Arg3) => Payload,
): { type: T } & ((arg1?: Arg1, arg2?: Arg2, arg3?: Arg3) => { type: T; payload: Payload; raw?: any });
// 3 args, 2 maybe
export function createEvent<T extends string, Payload, Arg1, Arg2, Arg3>(
  type: T, creator: (arg1: Arg1, arg2?: Arg2, arg3?: Arg3) => Payload,
): { type: T } & ((arg1: Arg1, arg2?: Arg2, arg3?: Arg3) => { type: T; payload: Payload; raw?: any });
// 3 args, 1 maybe
export function createEvent<T extends string, Payload, Arg1, Arg2, Arg3>(
  type: T, creator: (arg1: Arg1, arg2: Arg2, arg3?: Arg3) => Payload,
): { type: T } & ((arg1: Arg1, arg2: Arg2, arg3?: Arg3) => { type: T; payload: Payload; raw?: any });
// 3 args
export function createEvent<T extends string, Payload, Arg1, Arg2, Arg3>(
  type: T, creator: (arg1: Arg1, arg2: Arg2, arg3: Arg3) => Payload,
): { type: T } & ((arg1: Arg1, arg2: Arg2, arg3: Arg3) => { type: T; payload: Payload; raw?: any });

// 4 args, 4 maybe
export function createEvent<T extends string, Payload, Arg1, Arg2, Arg3, Arg4>(
  type: T, creator: (arg1?: Arg1, arg2?: Arg2, arg3?: Arg3, arg4?: Arg4) => Payload,
): { type: T } & ((arg1?: Arg1, arg2?: Arg2, arg3?: Arg3, arg4?: Arg4) => { type: T; payload: Payload; raw?: any });
// 4 args, 3 maybe
export function createEvent<T extends string, Payload, Arg1, Arg2, Arg3, Arg4>(
  type: T, creator: (arg1: Arg1, arg2?: Arg2, arg3?: Arg3, arg4?: Arg4) => Payload,
): { type: T } & ((arg1: Arg1, arg2?: Arg2, arg3?: Arg3, arg4?: Arg4) => { type: T; payload: Payload; raw?: any });
// 4 args, 2 maybe
export function createEvent<T extends string, Payload, Arg1, Arg2, Arg3, Arg4>(
  type: T, creator: (arg1: Arg1, arg2: Arg2, arg3?: Arg3, arg4?: Arg4) => Payload,
): { type: T } & ((arg1: Arg1, arg2: Arg2, arg3?: Arg3, arg4?: Arg4) => { type: T; payload: Payload; raw?: any });
// 4 args, 1 maybe
export function createEvent<T extends string, Payload, Arg1, Arg2, Arg3, Arg4>(
  type: T, creator: (arg1: Arg1, arg2: Arg2, arg3: Arg3, arg4?: Arg4) => Payload,
): { type: T } & ((arg1: Arg1, arg2: Arg2, arg3: Arg3, arg4?: Arg4) => { type: T; payload: Payload; raw?: any });
// 4 args
export function createEvent<T extends string, Payload, Arg1, Arg2, Arg3, Arg4>(
  type: T, creator: (arg1: Arg1, arg2: Arg2, arg3: Arg3, arg4: Arg4) => Payload,
): { type: T } & ((arg1: Arg1, arg2: Arg2, arg3: Arg3, arg4: Arg4) => { type: T; payload: Payload; raw?: any });

// Any args & basic definition
export function createEvent<T extends string, Payload extends {}>(
  type: T, eventPayloadCreator?: (...args: any[]) => Payload,
) {
  const creator = (...args: any[]) => ({
    type,
    payload: eventPayloadCreator ? eventPayloadCreator(...args) : {},
  });
  creator.type = type;
  return creator as EventCreator<T, Payload>;
}
