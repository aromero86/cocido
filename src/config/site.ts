/**
 * cocido's packages: the CLI (`cocido`), the starter (`create-cocido`, so `bun create cocido`), and the
 * scope of the rest (`@cocido/core`, `@cocido/plan`, `@cocido/review`). The docs write %PKG% for the scope.
 */
export const PACKAGE = '@cocido'

/** null while the repository is private: every GitHub link renders disabled. */
export const GITHUB: string | null = null

/** The install command, written once for the landing and the docs: create-cocido's starter. */
export const CREATE_COMMAND = 'bun create cocido my-app'
