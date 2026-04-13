/// <reference types="vite/client" />

// Vite ?inline CSS imports — returns CSS as a raw string
declare module "*.css?inline" {
  const css: string;
  export default css;
}
