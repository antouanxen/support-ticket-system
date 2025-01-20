import { Prisma } from "@prisma/client";

type DynamicFilters<T> = {
    [P in keyof T]?: T[P] extends string ? Prisma.StringFilter 
    : T[P] extends number ? Prisma.IntFilter 
    : T[P] extends Date ? Prisma.DateTimeFilter
    : T[P]
};

export default DynamicFilters