import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/prisma';
import { env } from './config/env';

let isShuttingDown = false;

const startServer = async (): Promise<void> => {
  try {
    // Conectar a la base de datos obligatoriamente
    await connectDatabase();

    // Crear aplicación Express
    const app = createApp();

    // Iniciar servidor solo después de conexión exitosa
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
      console.log(`📱 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${env.PORT}/health`);
      console.log(`🔗 Version: http://localhost:${env.PORT}/api/version`);
      console.log(`🌐 CORS origin: ${env.CORS_ORIGIN}`);
    });

    // Graceful shutdown mejorado
    const gracefulShutdown = async (signal: string): Promise<void> => {
      if (isShuttingDown) {
        console.log(`⚠️ Shutdown already in progress, ignoring ${signal}`);
        return;
      }

      isShuttingDown = true;
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Cerrar servidor HTTP primero
        await new Promise<void>((resolve, reject) => {
          server.close((err: Error | undefined) => {
            if (err) {
              reject(err);
            } else {
              console.log('📡 HTTP server closed');
              resolve();
            }
          });
        });

        // Desconectar Prisma
        await disconnectDatabase();
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Manejar señales de shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Manejo correcto de errores fatales
    process.on('uncaughtException', (error: Error) => {
      console.error('💥 Uncaught Exception:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      console.error('💥 Unhandled Rejection:', {
        reason,
        promise: promise.toString(),
        timestamp: new Date().toISOString(),
      });
      
      // Cerrar servidor correctamente en caso de unhandled rejection
      gracefulShutdown('unhandledRejection').catch(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Iniciar el servidor
startServer();
