export interface PaginationOptions {
  skip: number;
  take: number;
  page?: number;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
  page: number;
  totalPages: number;
}

export function getPaginationOptions(query: any): PaginationOptions {
  const page = Number(query.page) || 1;
  const take = Number(query.take) || 50;
  const skip = page > 1 ? (page - 1) * take : Number(query.skip) || 0;
  return { skip, take, page };
}

export function createPaginationResult<T>(data: T[], total: number, options: PaginationOptions): PaginationResult<T> {
  const { skip, take, page = 1 } = options;
  const totalPages = Math.ceil(total / take);
  return {
    data,
    total,
    skip,
    take,
    page,
    totalPages,
  };
}