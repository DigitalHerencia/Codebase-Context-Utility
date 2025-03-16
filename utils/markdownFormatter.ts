/**
 * Generates a Markdown representation of the codebase context
 *
 * @param context The codebase context data
 * @returns Markdown string representation
 */
export function generateMarkdown(context: any): string {
  try {
    let markdown = "# Codebase Context\n\n"

    // Add metadata section
    if (context.metadata) {
      markdown += "## Metadata\n\n"
      markdown += `- **Total Files:** ${context.metadata.totalFiles || 0}\n`
      markdown += `- **Languages:** ${(context.metadata.languages || []).join(", ")}\n`
      markdown += `- **Generated:** ${new Date(context.metadata.timestamp || Date.now()).toLocaleString()}\n\n`
    }

    // Add architecture overview
    if (context.architecture) {
      markdown += context.architecture + "\n\n"
    }

    // Add dependencies section
    if (context.dependencies) {
      markdown += "## Dependencies\n\n"

      const significantDependencies = Object.entries(context.dependencies)
        .filter(
          ([_, deps]: [string, any]) =>
            (deps.imports && deps.imports.length > 0) || (deps.usedBy && deps.usedBy.length > 0),
        )
        .slice(0, 20) // Limit to most significant dependencies

      if (significantDependencies.length > 0) {
        significantDependencies.forEach(([file, deps]: [string, any]) => {
          markdown += `### ${file}\n\n`

          if (deps.imports && deps.imports.length > 0) {
            markdown += "**Imports:**\n"
            deps.imports.forEach((imp: string) => {
              markdown += `- \`${imp}\`\n`
            })
            markdown += "\n"
          }

          if (deps.usedBy && deps.usedBy.length > 0) {
            markdown += "**Used by:**\n"
            deps.usedBy.forEach((user: string) => {
              markdown += `- \`${user}\`\n`
            })
            markdown += "\n"
          }
        })
      } else {
        markdown += "*No significant dependencies found*\n\n"
      }
    }

    // Add files section
    if (context.files && context.files.length > 0) {
      markdown += "## Files\n\n"

      // Sort files by path for better organization
      const sortedFiles = [...context.files].sort((a, b) => a.path.localeCompare(b.path))

      sortedFiles.forEach((file: any) => {
        markdown += `### ${file.path}\n\n`
        markdown += `**Language:** ${file.language}\n`
        markdown += `**Size:** ${file.content.length} characters\n\n`

        // Add code snippet with syntax highlighting
        markdown += "```" + (file.language || "text") + "\n"
        // Limit content size in markdown to avoid massive outputs
        markdown += file.content.substring(0, 500) + (file.content.length > 500 ? "...\n" : "\n")
        markdown += "```\n\n"
      })
    }

    return markdown
  } catch (error) {
    console.error("Error generating Markdown:", error)
    return "# Error\n\nFailed to generate Markdown output."
  }
}

