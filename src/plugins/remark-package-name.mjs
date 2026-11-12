import { visit } from 'unist-util-visit'

/** Replaces %PKG% in the docs' text and code with the package name of src/config/site.ts. */
export function remarkPackageName(packageName) {
  return () => (tree) => {
    visit(tree, (node) => {
      if (typeof node.value === 'string' && node.value.includes('%PKG%')) {
        node.value = node.value.replaceAll('%PKG%', packageName)
      }
    })
  }
}
