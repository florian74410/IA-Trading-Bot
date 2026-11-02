import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => ({
 plugins:[react()],
 base:'/',
 build:{outDir:'dist',sourcemap:false,assetsInlineLimit:2048},
 server:{host:'127.0.0.1',port:5173,strictPort:true},
 // Editor flag is compile-time only. Production always builds with VITE_ENABLE_EDITOR unset.
 define:{__ATLAS_EDITOR_ENABLED__:JSON.stringify(mode==='editor' && process.env.VITE_ENABLE_EDITOR==='true')}
}));
