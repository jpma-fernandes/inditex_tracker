import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  //isto faz com que o next use uma pasta de build diferente quando estamos a usar a base de dados dummy
  //assim podemos correr as duas versões em paralelo sem conflitos
  distDir: process.env.USE_DUMMY_DB === 'true' ? '.next-dummy' : '.next',
};

export default nextConfig;
