import { vi } from 'vitest';

type QueryResult = { data: unknown; error: unknown; count?: number | null };

export function createQueryMock(result: QueryResult) {
  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'gte', 'lte', 'order'];
  const mock: Record<string, unknown> = {};

  chainMethods.forEach((method) => {
    mock[method] = vi.fn().mockReturnValue(mock);
  });

  mock.single = vi.fn().mockResolvedValue(result);
  mock.then = (resolve: (value: QueryResult) => unknown) => resolve(result);

  return mock;
}
