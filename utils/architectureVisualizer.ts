interface CodebaseContext {
  files: Array<{
    path: string
    content: string
    language: string
  }>
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

export function generateArchitectureOverview(context: CodebaseContext, dependencies: Dependencies): string {
  let overview = "# Architecture Overview\n\n"

  // Group files by directory
  const filesByDirectory = groupFilesByDirectory(context.files)

  // Generate overview for each directory
  for (const [directory, files] of Object.entries(filesByDirectory)) {
    overview += `## ${directory || "Root"}\n\n`
    for (const file of files) {
      overview += `- ${file.path}\n`
      if (dependencies && dependencies[file.path]) {
        const deps = dependencies[file.path]
        if (deps.imports && deps.imports.length > 0) {
          overview += `  - Imports: ${deps.imports.join(", ")}\n`
        }
        if (deps.usedBy && deps.usedBy.length > 0) {
          overview += `  - Used by: ${deps.usedBy.join(", ")}\n`
        }
      }
    }
    overview += "\n"
  }

  // Add a section for file types summary
  const fileTypes = getFileTypesSummary(context.files)
  if (Object.keys(fileTypes).length > 0) {
    overview += "## File Types Summary\n\n"
    for (const [type, count] of Object.entries(fileTypes)) {
      overview += `- ${type}: ${count} files\n`
    }
    overview += "\n"
  }

  return overview
}

function groupFilesByDirectory(
  files: Array<{ path: string; content: string; language: string }>,
): Record<string, Array<{ path: string; content: string; language: string }>> {
  const groups: Record<string, Array<{ path: string; content: string; language: string }>> = {}

  for (const file of files) {
    const pathParts = file.path.split("/")
    const directory = pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : ""

    if (!groups[directory]) {
      groups[directory] = []
    }
    groups[directory].push(file)
  }

  return groups
}

function getFileTypesSummary(
  files: Array<{ path: string; content: string; language: string }>,
): Record<string, number> {
  const typeCounts: Record<string, number> = {}

  files.forEach((file) => {
    const extension = file.path.split(".").pop()?.toLowerCase() || "unknown"
    typeCounts[extension] = (typeCounts[extension] || 0) + 1
  })

  return typeCounts
}

