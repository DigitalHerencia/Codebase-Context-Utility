export function generateMarkdown(context: any): string {
  try {
    let markdown = "# Codebase Context\n\n"

    // Add executive summary section
    markdown += "## Executive Summary\n\n"

    if (context.metadata) {
      markdown += `- **Total Files:** ${context.metadata.totalFiles || 0}\n`
      markdown += `- **Languages:** ${(context.metadata.languages || []).join(", ")}\n`
      markdown += `- **Generated:** ${new Date(context.metadata.timestamp || Date.now()).toLocaleString()}\n\n`
    }

    // Add file type summary
    const fileTypes = getFileTypeCounts(context.files || [])
    if (Object.keys(fileTypes).length > 0) {
      markdown += "### File Types\n\n"
      Object.entries(fileTypes)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .forEach(([type, count]) => {
          markdown += `- **${type}:** ${count} files\n`
        })
      markdown += "\n"
    }

    // Add directory structure
    const directoryStructure = getDirectoryStructure(context.files || [])
    if (Object.keys(directoryStructure).length > 0) {
      markdown += "### Directory Structure\n\n"
      Object.entries(directoryStructure)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .forEach(([dir, count]) => {
          markdown += `- **${dir}:** ${count} files\n`
        })
      markdown += "\n"
    }

    // Add architecture overview
    if (context.architecture) {
      markdown += "## Architecture Overview\n\n"
      markdown += context.architecture + "\n\n"
    }

    // Add key dependencies section (more concise)
    if (context.dependencies) {
      markdown += "## Key Dependencies\n\n"

      // Find most important dependencies (most used files)
      const importantDeps = Object.entries(context.dependencies)
        .map(([file, deps]: [string, any]) => ({
          file,
          usedByCount: deps.usedBy?.length || 0,
          imports: deps.imports || [],
        }))
        .sort((a, b) => b.usedByCount - a.usedByCount)
        .slice(0, 5) // Limit to top 5 dependencies

      importantDeps.forEach(({ file, usedByCount, imports }) => {
        markdown += `### ${file}\n\n`
        markdown += `- **Used by:** ${usedByCount} files\n`
        // Keep imports concise
        if (imports.length > 0) {
          markdown += `- **Imports:** ${imports.slice(0, 3).join(", ")}${imports.length > 3 ? "..." : ""}\n`
        }
        markdown += "\n"
      })
    }

    // Add files section (grouped by directory)
    markdown += "## Files by Directory\n\n"

    // Group files by directory
    const filesByDirectory = groupFilesByDirectory(context.files || [])

    Object.entries(filesByDirectory).forEach(([directory, files]) => {
      markdown += `### ${directory}\n\n`
      files.forEach((file: any) => {
        markdown += `- ${file.path} (${file.language})\n` // More concise file listing
      })
      markdown += "\n"
    })

    // Add selected file contents (limited to avoid redundancy)
    markdown += "## Selected File Contents\n\n"

    // Only include a subset of important files
    const selectedFiles = selectImportantFiles(context.files || [], 5) // Limit to 5 files

    selectedFiles.forEach((file: any) => {
      markdown += `### ${file.path}\n\n`
      markdown += "```" + file.language + "\n"
      markdown += file.content
      markdown += "\n```\n\n"
    })

    return markdown
  } catch (error) {
    console.error("Error generating Markdown:", error)
    return "# Error\n\nFailed to generate Markdown output."
  }
}

/**
 * Gets counts of each file type in the codebase
 */
function getFileTypeCounts(files: any[]): Record<string, number> {
  const counts: Record<string, number> = {}

  files.forEach((file) => {
    const extension = file.path.split(".").pop()?.toLowerCase() || "unknown"
    counts[extension] = (counts[extension] || 0) + 1
  })

  return counts
}

/**
 * Generates a directory structure from file paths
 */
function getDirectoryStructure(files: any[]): Record<string, number> {
  const directories: Record<string, number> = {}

  files.forEach((file) => {
    const pathParts = file.path.split("/")
    const directory = pathParts.length > 1 ? pathParts[0] : "root"
    directories[directory] = (directories[directory] || 0) + 1
  })

  return directories
}

/**
 * Groups files by their top-level directory
 */
function groupFilesByDirectory(files: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {}

  files.forEach((file) => {
    const pathParts = file.path.split("/")
    const directory = pathParts.length > 1 ? pathParts[0] : "root"

    if (!groups[directory]) {
      groups[directory] = []
    }

    groups[directory].push(file)
  })

  return groups
}

/**
 * Selects important files from the codebase
 */
function selectImportantFiles(files: any[], limit: number): any[] {
  // Define importance criteria
  const isImportant = (file: any): number => {
    let score = 0

    // Configuration files are important
    if (file.path.includes("config") || file.path.endsWith(".config.js") || file.path.endsWith(".config.ts")) {
      score += 5
    }

    // Main entry points are important
    if (file.path.includes("main") || file.path.includes("index") || file.path.includes("app")) {
      score += 4
    }

    // TypeScript files might be more important than plain JavaScript
    if (file.path.endsWith(".ts") || file.path.endsWith(".tsx")) {
      score += 2
    }

    // Components are important
    if (file.path.includes("component") || file.path.includes("components")) {
      score += 3
    }

    return score
  }

  // Sort files by importance score and take the top ones
  return [...files].sort((a, b) => isImportant(b) - isImportant(a)).slice(0, limit)
}

