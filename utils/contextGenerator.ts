import { analyzeCode } from "./codeAnalyzer"
import type { CodebaseContext, FileInfo } from "@/types/codebase"

interface EnhancedFileInfo extends FileInfo {
  analysis: ReturnType<typeof analyzeCode>
}

export function generateEnhancedContext(context: CodebaseContext): string {
  let enhancedContext = "# Codebase Analysis\n\n"

  // Add metadata section
  enhancedContext += "## Project Metadata\n\n"
  enhancedContext += `- Total Files: ${context.metadata.totalFiles}\n`
  enhancedContext += `- Languages: ${context.metadata.languages.join(", ")}\n`
  enhancedContext += `- Generated: ${new Date(context.metadata.timestamp).toLocaleString()}\n\n`

  // Analyze each file
  const analyzedFiles: EnhancedFileInfo[] = context.files.map((file) => ({
    ...file,
    analysis: analyzeCode(file.content, file.path),
  }))

  // Generate dependency graph
  enhancedContext += "## Dependency Graph\n\n"
  const dependencies = new Map<string, Set<string>>()
  analyzedFiles.forEach((file) => {
    const imports = file.analysis.imports.map((imp) => imp.source)
    dependencies.set(file.path, new Set(imports))
  })

  dependencies.forEach((imports, file) => {
    enhancedContext += `### ${file}\n`
    enhancedContext += "Depends on:\n"
    imports.forEach((imp) => (enhancedContext += `- ${imp}\n`))
    enhancedContext += "\n"
  })

  // List all endpoints
  enhancedContext += "## API Endpoints\n\n"
  analyzedFiles
    .filter((file) => file.analysis.endpoints && file.analysis.endpoints.length > 0)
    .forEach((file) => {
      file.analysis.endpoints?.forEach((endpoint) => {
        enhancedContext += `- ${endpoint.method} ${endpoint.path}\n`
      })
    })
  enhancedContext += "\n"

  // Document components and their props
  enhancedContext += "## Components\n\n"
  analyzedFiles
    .filter((file) => file.path.includes("components"))
    .forEach((file) => {
      enhancedContext += `### ${file.path}\n\n`

      // List interfaces (props)
      file.analysis.interfaces.forEach((int) => {
        enhancedContext += `#### ${int.name}\n\n`
        int.properties.forEach((prop) => {
          enhancedContext += `- ${prop.name}${prop.optional ? "?" : ""}: ${prop.type}\n`
        })
        enhancedContext += "\n"
      })

      // List exported functions/components
      file.analysis.exports.forEach((exp) => {
        enhancedContext += `#### ${exp.name}\n`
        const func = file.analysis.functions.find((f) => f.name === exp.name)
        if (func) {
          enhancedContext += `Parameters: ${func.params.join(", ")}\n`
        }
        enhancedContext += "\n"
      })
    })

  // Document utilities and hooks
  enhancedContext += "## Utilities and Hooks\n\n"
  analyzedFiles
    .filter((file) => file.path.includes("utils") || file.path.includes("hooks"))
    .forEach((file) => {
      enhancedContext += `### ${file.path}\n\n`

      file.analysis.functions.forEach((func) => {
        enhancedContext += `#### ${func.name}\n`
        enhancedContext += `- Parameters: ${func.params.join(", ")}\n`
        enhancedContext += `- Async: ${func.async}\n\n`
      })
    })

  // Document configuration
  enhancedContext += "## Configuration\n\n"
  analyzedFiles
    .filter((file) => file.path.endsWith(".config.js") || file.path.endsWith(".config.ts"))
    .forEach((file) => {
      enhancedContext += `### ${file.path}\n\n`
      file.analysis.exports.forEach((exp) => {
        enhancedContext += `- Exports ${exp.name} (${exp.type})\n`
      })
      enhancedContext += "\n"
    })

  return enhancedContext
}

