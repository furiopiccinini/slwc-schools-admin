import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Per deploy statico
  trailingSlash: true,
  images: {
    unoptimized: true // Necessario per export statico
  },
  // Configurazione per il dominio di produzione
  env: {
    NEXTAUTH_URL: process.env.NODE_ENV === 'production' 
      ? 'https://tuodominio.com' // Sostituisci con il tuo dominio
      : 'http://localhost:3000'
  }
};

export default nextConfig;





