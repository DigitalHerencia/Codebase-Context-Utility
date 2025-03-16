"use client"

import { useState } from "react"
import { useFileSystem, type FileEntry } from "@/components/file-system-provider"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ContextFormat = "json" | "markdown" | "plain"

export function ContextGenerator() {
  const { fileTree, readFileContent } = useFileSystem()
  const [contextFormat, setContextFormat] = useState<ContextFormat>("json")
  const [generatedContext, setGeneratedContext] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)

  const generateContext = async () => {
    setIsGenerating(true)
    try {
      const context = await buildContext(fileTree, contextFormat)
      setGeneratedContext(context)
    } catch (error) {
      console.error("Error generating context:", error)
      setGeneratedContext("Error generating context")
    }
    setIsGenerating(false)
  }

  const buildContext = async (tree: Record<string, FileEntry>, format: ContextFormat): Promise<string> => {
    const files = await flattenFileTree(tree)

    switch (format) {
      case "json":
        return JSON.stringify(files, null, 2)
      case "markdown":
        return files.map((file) => `## ${file.path}\n\`\`\`${file.language}\n${file.content}\n\`\`\``).join("\n\n")
      case "plain":
        return files.map((file) => `--- ${file.path} ---\n\n${file.content}\n`).join("\n\n")
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  const flattenFileTree = async (
    tree: Record<string, FileEntry>,
    basePath = "",
  ): Promise<Array<{ path: string; content: string; language: string }>> => {
    let files: Array<{ path: string; content: string; language: string }> = []

    for (const [name, entry] of Object.entries(tree)) {
      const path = basePath ? `${basePath}/${name}` : name

      if (entry.type === "file") {
        const content = await readFileContent(path)
        files.push({
          path,
          content,
          language: entry.language || "plaintext",
        })
      } else if (entry.type === "directory" && entry.children) {
        files = files.concat(await flattenFileTree(entry.children, path))
      }
    }

    return files
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Select value={contextFormat} onValueChange={(value: ContextFormat) => setContextFormat(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="markdown">Markdown</SelectItem>
            <SelectItem value="plain">Plain Text</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={generateContext} disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Generate Context"}
        </Button>
      </div>
      <Textarea value={generatedContext} readOnly className="h-[400px] font-mono text-sm" />
    </div>
  )
}

