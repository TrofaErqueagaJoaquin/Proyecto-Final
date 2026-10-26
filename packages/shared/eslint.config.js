import { pureLibraryBoundaries, typescriptConfig } from '@crecer/config/eslint';

export default [...typescriptConfig(import.meta.dirname), pureLibraryBoundaries];
