import type { SemanticAdapter } from './source-adapter.js';

export type CloneAdapter = SemanticAdapter & { side: 'clone' };
