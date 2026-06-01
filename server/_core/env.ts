export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Anthropic LLM
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  // Stability AI image generation
  stabilityApiKey: process.env.STABILITY_API_KEY ?? "",
  // AWS S3 file storage
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION || "us-east-1",
};
