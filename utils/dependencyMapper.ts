interface FileInfo {
  path: string
  content: string
  language: string
}

interface CodebaseContext {
  files: FileInfo[]
  metadata?: {
    totalFiles: number
    totalSize: number
    languages: string[]
    timestamp: string
  }
}

interface Dependencies {
  [key: string]: {
    imports: string[]
    usedBy: string[]
  }
}

export function mapDependencies(context: CodebaseContext): Dependencies {
  const dependencies: Dependencies = {}
  const filePathMap: Record<string, string> = {}

  // Create a map of normalized paths to actual paths
  for (const file of context.files) {
    // Normalize the path for easier matching
    const normalizedPath = normalizePath(file.path)
    filePathMap[normalizedPath] = file.path

    // Initialize dependencies object with empty arrays
    dependencies[file.path] = {
      imports: [],
      usedBy: [],
    }

    // Extract imports based on file type
    if (
      file.language === "typescript" ||
      file.language === "javascript" ||
      file.language === "jsx" ||
      file.language === "tsx"
    ) {
      dependencies[file.path].imports = extractImports(file.content)
    }
  }

  // Populate usedBy relationships
  for (const [filePath, deps] of Object.entries(dependencies)) {
    for (const importPath of deps.imports) {
      // Try to find the actual file that matches this import
      const matchedFile = findMatchingFile(importPath, filePathMap)

      if (matchedFile && dependencies[matchedFile]) {
        if (!dependencies[matchedFile].usedBy.includes(filePath)) {
          dependencies[matchedFile].usedBy.push(filePath)
        }
      }
    }
  }

  return dependencies
}

function normalizePath(path: string): string {
  // Remove file extension and normalize slashes
  return path.replace(/\\/g, "/").replace(/\.(js|jsx|ts|tsx)$/, "")
}

function findMatchingFile(importPath: string, filePathMap: Record<string, string>): string | null {
  // Handle relative imports
  if (importPath.startsWith(".")) {
    // This is a simplified approach - a real implementation would need to resolve the path
    return null
  }

  // Try to match by the end of the path
  for (const [normalizedPath, actualPath] of Object.entries(filePathMap)) {
    if (normalizedPath.endsWith(`/${importPath}`) || normalizedPath === importPath) {
      return actualPath
    }
  }

  return null
}

function extractImports(content: string): string[] {
  const imports: string[] = []

  try {
    // Match ES6 imports
    const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/g
    let match: RegExpExecArray | null

    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) {
        imports.push(match[1])
      }
    }

    // Match CommonJS require statements
    const requireRegex = /require\s*$$\s*['"]([^'"]+)['"]\s*$$/g
    while ((match = requireRegex.exec(content)) !== null) {
      if (match[1]) {
        imports.push(match[1])
      }
    }

    // Match dynamic imports
    const dynamicImportRegex = /import\s*$$\s*['"]([^'"]+)['"]\s*$$/g
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      if (match[1]) {
        imports.push(match[1])
      }
    }
  } catch (error) {
    console.error("Error extracting imports:", error)
  }

  return [...new Set(imports)] // Remove duplicates
}

