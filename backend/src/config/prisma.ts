import { PrismaClient } from '@prisma/client';
import { env } from './env';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Singleton pattern para PrismaClient en desarrollo
export const prisma = globalThis.__prisma || new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
  // Logs condicionales: solo en desarrollo y solo errores en producción
  log: env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
  // Configuración adicional para producción
  ...(env.NODE_ENV === 'production' && {
    errorFormat: 'minimal',
  }),
});

if (env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Función para verificar conexión a la base de datos
export const connectDatabase = async (): Promise<void> => {
  try {
    // Timeout de 10 segundos para la conexión
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Database connection timeout after 10 seconds'));
      }, 10000);
    });

    const connectPromise = prisma.$connect();
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    console.log('✅ Database connected successfully');
    
    // Verificación adicional con una query simple
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection verified');
    
  } catch (error) {
    console.error('❌ Database connection failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

// Función para desconectarse de la base de datos
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Database disconnection failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};
