"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useFileSystem } from "@/components/file-system-provider"
import Prism from "prismjs"
import "prismjs/themes/prism-tomorrow.css"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-tsx"
import "prismjs/components/prism-css"
import "prismjs/components/prism-json"
import { useToast } from "@/hooks/use-toast"

interface CodePreviewProps {
  filePath: string | null
}

export function CodePreview({ filePath }: CodePreviewProps) {
  const { readFileContent } = useFileSystem()
  const { toast } = useToast()
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!filePath) {
      setCode(null)
      return
    }

    const loadFileContent = async () => {
      setLoading(true)
      try {
        const content = await readFileContent(filePath)
        setCode(content)
      } catch (error: any) {
        console.error("Error loading file content:", error)
        setCode(`// Error loading file: ${error.message || "Unknown error"}`)

        // Show toast notification for better user feedback
        toast({
          title: "Error loading file",
          description: error.message || "Unknown error",
          variant: "destructive",
          duration: 3000,
        })
      } finally {
        setLoading(false)
      }
    }

    loadFileContent()
  }, [filePath, readFileContent])

  useEffect(() => {
    if (code && filePath) {
      // Get language from file extension
      const extension = filePath.split(".").pop()?.toLowerCase() || ""
      const languageMap: Record<string, string> = {
        js: "javascript",
        jsx: "jsx",
        ts: "typescript",
        tsx: "tsx",
        css: "css",
        json: "json",
        // Add more mappings as needed
      }

      const language = languageMap[extension] || "plaintext"

      // Highlight the code
      setTimeout(() => {
        Prism.highlightAll()
      }, 0)
    }
  }, [code, filePath])

  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)] text-muted-foreground">
        Select a file to preview its content
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const getLanguageFromExtension = (filePath: string): string => {
    const extension = filePath.split(".").pop()?.toLowerCase() || ""
    const languageMap: Record<string, string> = {
      js: "javascript",
      jsx: "jsx",
      ts: "typescript",
      tsx: "tsx",
      css: "css",
      json: "json",
    }
    return languageMap[extension] || "plaintext"
  }

  return (
    <div className="p-4 h-[calc(100vh-12rem)] overflow-auto">
      <pre className="p-4 rounded-lg overflow-x-auto">
        <code className={`language-${getLanguageFromExtension(filePath || "")}`}>{code}</code>
      </pre>
    </div>
  )
}

