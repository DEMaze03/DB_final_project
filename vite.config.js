import { defineConfig } from "vite";
import { spawn } from "child_process";

let serverProcess;

export default defineConfig({
    plugins: [
        {
            name: "run-server",
            configureServer(server) {
                // Start the Express server when Vite starts
                serverProcess = spawn("node", ["server.js"], {
                    stdio: "inherit",
                    shell: true
                });

                // Wait for server to be ready before opening browser
                const originalHttpServer = server.httpServer;
                if (originalHttpServer) {
                    const originalListen = originalHttpServer.listen.bind(originalHttpServer);
                    originalHttpServer.listen = function(...args) {
                        // Give Express server time to start (2 seconds)
                        setTimeout(() => {
                            originalListen(...args);
                        }, 2000);
                    };
                }
            },
            closeBundle() {
                // Kill server when Vite closes
                if (serverProcess) {
                    serverProcess.kill();
                }
            }
        }
    ],
    server: {
        open: false, // Disable auto-open to prevent timing issues
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            }
        }
    }
});