import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from 'fs';
import path from "path";
import dts from 'vite-plugin-dts';

export default defineConfig(({ mode  }) => {
   const isDevMode = mode  === 'development'; // Check if running in dev mode with 'npm run dev'
   const isLibraryBuild = mode === 'library';

   return {
    base: isDevMode ? './' : '/apps/', // set urls to start with static for server deployment
    mode: 'development', // Ensures React isn't minified
    plugins: [
      react(),
      isLibraryBuild && dts({
        tsconfigPath: './tsconfig.lib.json', // Point to tsconfig.lib.json
        insertTypesEntry: true,
        copyDtsFiles: false,
        rollupTypes: false,
        outDir: './dist' //'../edgeServer/apps/editingClient'
      }),
    ],
    resolve: {
      alias: [
        {
          find: "./runtimeConfig",
          replacement: "./runtimeConfig.browser", // ensures browser compatible version of AWS JS SDK is used
        },
      ],
    },
    optimizeDeps: {
      include: ['@webxr-input-profiles/registry'], // Include this package in optimized dependencies
    },
    server: {
      host: '0.0.0.0',
      port: 4000,
      //Enabling https: Edit key and cert paths to build properly
      https: {
        key: fs.readFileSync(path.resolve(__dirname, '../edgeServer/ssl-key.pem')), 
        cert: fs.readFileSync(path.resolve(__dirname, '../edgeServer/ssl-cert.pem'))    
        // key: fs.readFileSync('E:\democonstruct\python-server\ssl-key.pem'),
        // cert: fs.readFileSync('E:\democonstruct\python-server\ssl-cert.pem'),
      },
      proxy: isDevMode ? {
        "/downloadModel": {
          target: "https://127.0.0.1:8000",
          changeOrigin:true,
          secure: false
        },
        "/loadAsset":{
          target: "https://127.0.0.1:8000",
          changeOrigin:true,
          secure: false
        },
      } : {}
    },
    build: {
      outDir: isLibraryBuild ? './dist' : '../edgeServer/apps/editingClient',
      lib: isLibraryBuild
        ? {
            entry: path.resolve(__dirname, 'src/Exports.ts'),
            name: 'democonstruct-editing',
            formats: ['es', 'umd'],
            fileName: (format) => `democonstruct-editing.${format}.js`,
            sourcemap: true,  // Ensure sourcemaps are generated
          }
        : undefined,
        rollupOptions: isLibraryBuild
        ? {
            external: ['react', 'react-dom', '@babylonjs/core', '@babylonjs/gui', '@babylonjs/loaders', '@babylonjs/materials'],
            output: {
              globals: {
                'react': 'React',
                'react-dom': 'ReactDOM',
                '@babylonjs/core': 'BABYLON',
                '@babylonjs/gui': 'BABYLON.GUI',
                '@babylonjs/loaders': 'BABYLON',
                '@babylonjs/materials': 'BABYLON',
              },
              sourcemap: true, // Ensure sourcemaps are generated for bundled files
            },
          }
        : undefined,
    }
   }
});
