import { createContext } from 'react';

// Prevent saving or leaving the chapter while a local commitment edit is open.
export const CommitmentEditingContext = createContext<(editing: boolean) => void>(() => {});
