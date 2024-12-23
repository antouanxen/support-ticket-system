import { SetMetadata } from "@nestjs/common";

export const IsPublic = (ifAuth: boolean) => SetMetadata("IsPublic", ifAuth);
