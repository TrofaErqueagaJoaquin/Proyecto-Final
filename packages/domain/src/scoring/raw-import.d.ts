// Solo para los tests: Vitest carga archivos como texto con el sufijo ?raw.
declare module '*?raw' {
  const content: string;
  export default content;
}
