export function generateJSON(context: any, minify = false): string {
  try {
    // Create a clean output structure with executive summary
    const output = {
      metadata: context.metadata || {},
      summary: {
        totalFiles: context.files?.length || 0,
        fileTypes: getFileTypeCounts(context.files || []),
        totalSize: getTotalSize(context.files || []),
        directoryStructure: getDirectoryStructure(context.files || []),
      },
      architecture: context.architecture || "",
      dependencies: context.dependencies || {},
      files: (context.files || []).map((file: any) => ({
        path: file.path,
        language: file.language,
        size: file.content?.length || 0,
        // Limit content size in JSON to avoid massive outputs
        content: file.content?.substring(0, 500) + (file.content?.length > 500 ? "..." : ""),
      })),
    }

    // Return formatted or minified JSON
    return JSON.stringify(output, null, minify ? 0 : 2)
  } catch (error) {
    console.error("Error generating JSON:", error)
    return JSON.stringify({ error: "Failed to generate JSON output" })
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
 * Calculates the total size of all files
 */
function getTotalSize(files: any[]): number {
  return files.reduce((total, file) => total + (file.content?.length || 0), 0)
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

