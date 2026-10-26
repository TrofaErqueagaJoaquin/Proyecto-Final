// En el commit solo se formatea; ESLint, tipos y tests corren en pre-push y en CI,
// porque cada paquete tiene su propia configuración de ESLint (la app usa la de Expo).
export default {
  '*.{ts,tsx,js,mjs,cjs,json,md,yml,yaml}': 'prettier --write',
};
