import { registerAs } from "@nestjs/config";

export default registerAs("jwt", () => {
  return {
    secret: process.env.JWT_SECRET_KEY,
    audience: process.env.JWT_TOKEN_AUDIENCE,
    issuer: process.env.JWT_TOKEN_ISSUER,
    accessTokenTTL: parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? "86399", 10),
    refreshTokenTTL: parseInt(process.env.JWT_REFRESH_TOKEN_TTL ?? "86400", 10),
  };
});
