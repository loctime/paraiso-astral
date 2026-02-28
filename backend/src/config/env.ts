import dotenv from 'dotenv';

dotenv.config();

interface Env {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
}

// Validar variables de entorno críticas
const validateRequiredEnvVars = (): void => {
  const requiredEnvVars: (keyof Env)[] = ['DATABASE_URL', 'JWT_SECRET'];
  
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (!value || value.trim() === '') {
      throw new Error(`❌ Missing required environment variable: ${envVar}`);
    }
  }
};

// Validación estricta de PORT
const validatePort = (port: string | undefined): number => {
  const portNum = parseInt(port || '4000', 10);
  
  if (isNaN(portNum)) {
    throw new Error('❌ PORT must be a valid number');
  }
  
  if (portNum < 1 || portNum > 65535) {
    throw new Error('❌ PORT must be between 1 and 65535');
  }
  
  return portNum;
};

// Mejorar validación de DATABASE_URL (simplificada y más robusta)
const validateDatabaseUrl = (url: string): void => {
  if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
    throw new Error('❌ DATABASE_URL must start with "postgres://" or "postgresql://"');
  }
  
  // Dejar que Prisma valide el resto (SSL params, encoded chars, etc.)
};

// Validar JWT_SECRET
const validateJwtSecret = (secret: string, nodeEnv: string): void => {
  if (secret.length < 32) {
    throw new Error('❌ JWT_SECRET must be at least 32 characters long for security');
  }
  
  if (nodeEnv === 'production' && secret.length < 64) {
    throw new Error('❌ JWT_SECRET must be at least 64 characters long in production');
  }
};

// Validar configuración SMTP
const validateSmtpConfig = (host?: string, port?: string, user?: string, pass?: string): {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
} => {
  if (!host) {
    return { host: undefined, port: undefined, user: undefined, pass: undefined };
  }
  
  // Si SMTP_HOST está definido, validar los demás
  if (!user || user.trim() === '') {
    throw new Error('❌ SMTP_USER is required when SMTP_HOST is defined');
  }
  
  if (!pass || pass.trim() === '') {
    throw new Error('❌ SMTP_PASS is required when SMTP_HOST is defined');
  }
  
  const portNum = parseInt(port || '587', 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    throw new Error('❌ SMTP_PORT must be a valid number between 1 and 65535');
  }
  
  return {
    host: host.trim(),
    port: portNum,
    user: user.trim(),
    pass: pass.trim(),
  };
};

// Validar CORS_ORIGIN (preparado para múltiples dominios en el futuro)
const validateCorsOrigin = (origin: string | undefined, nodeEnv: string): string => {
  const defaultOrigin = 'http://localhost:3000';
  const corsOrigin = origin?.trim() || defaultOrigin;
  
  if (nodeEnv === 'production' && corsOrigin === defaultOrigin) {
    console.warn('⚠️ CORS_ORIGIN is set to localhost in production');
  }
  
  // TODO: En el futuro soportar lista separada por coma para múltiples dominios
  // Ej: "https://domain1.com,https://domain2.com,https://*.vercel.app"
  
  return corsOrigin;
};

// Función principal que encapsula toda la lógica de carga y validación
function loadEnv(): Env {
  // Constante NODE_ENV para evitar referencias circulares
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Ejecutar validaciones
  validateRequiredEnvVars();

  const databaseUrl = process.env.DATABASE_URL!;
  validateDatabaseUrl(databaseUrl);

  const jwtSecret = process.env.JWT_SECRET!;
  validateJwtSecret(jwtSecret, nodeEnv);

  const port = validatePort(process.env.PORT);

  const corsOrigin = validateCorsOrigin(process.env.CORS_ORIGIN, nodeEnv);

  const smtpConfig = validateSmtpConfig(
    process.env.SMTP_HOST,
    process.env.SMTP_PORT,
    process.env.SMTP_USER,
    process.env.SMTP_PASS
  );

  return {
    PORT: port,
    NODE_ENV: nodeEnv,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    CORS_ORIGIN: corsOrigin,
    SMTP_HOST: smtpConfig.host,
    SMTP_PORT: smtpConfig.port,
    SMTP_USER: smtpConfig.user,
    SMTP_PASS: smtpConfig.pass,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  };
}

// Exportar el objeto de entorno validado
export const env = loadEnv();
