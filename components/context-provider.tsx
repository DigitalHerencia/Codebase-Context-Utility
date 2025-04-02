"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Download, RefreshCw, Search } from "lucide-react"
import { toast } from "sonner"
import { useFileSystem } from "@/components/file-system-provider"
import { ContextSizeEstimator } from "@/components/context-size-estimator"
import { generateArchitectureOverview } from "@/utils/architectureVisualizer"
import { mapDependencies } from "@/utils/dependencyMapper"
import { countTokens, truncateToTokenLimit } from "@/utils/tokenCounter"
import { generateMarkdown } from "@/utils/markdownFormatter"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DependencyGraph } from "@/components/dependency-graph"
import { ExecutiveSummary } from "@/components/executive-summary"

interface ContextOptions {
  format: "json" | "markdown" | "plain"
  includeMetadata: boolean
  minify: boolean
  maxTokens: number
  includeFullContent: boolean
  includeDependencyGraph: boolean
  includeExecutiveSummary: boolean
}

const TOKEN_SAFETY_MARGIN = 0.9 // Only use 90% of max tokens to allow for safety margin

export function ContextProvider() {
  const { fileTree, readFileContent, getSelectedFiles, selectedFilesForContext } = useFileSystem()
  // Hardcoded context options as per requirements
  const [contextOptions] = useState<ContextOptions>({
    format: "markdown",
    includeMetadata: true,
    minify: true,
    maxTokens: 128000,
    includeFullContent: true,
    includeDependencyGraph: true,
    includeExecutiveSummary: true,
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [contextContent, setContextContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })
  const [searchTerm, setSearchTerm] = useState("")
  const [parsedContext, setParsedContext] = useState<any>(null)

  // Memoize the effective max tokens to avoid unnecessary recalculations
  const effectiveMaxTokens = useMemo(() => {
    return Math.floor(contextOptions.maxTokens * TOKEN_SAFETY_MARGIN)
  }, [contextOptions.maxTokens])

  // Reset error when options change
  useEffect(() => {
    setError(null)
  }, [contextOptions])

  // Parse context content when it changes
  useEffect(() => {
    if (!contextContent) {
      setParsedContext(null)
      return
    }

    try {
      if (contextOptions.format === "json") {
        setParsedContext(JSON.parse(contextContent))
      } else {
        // For non-JSON formats, we'll just set a basic structure
        setParsedContext({
          content: contextContent,
          metadata: {
            format: contextOptions.format,
            timestamp: new Date().toISOString(),
          },
        })
      }
    } catch (error) {
      console.error("Error parsing context content:", error)
      setParsedContext(null)
    }
  }, [contextContent, contextOptions.format])

  const generateContext = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    setContextContent("")
    setGenerationProgress({ current: 0, total: 0 })

    try {
      if (Object.keys(fileTree).length === 0) {
        throw new Error("No files loaded. Please open a folder or files first.")
      }

      if (selectedFilesForContext.size === 0) {
        throw new Error("No files selected for context. Please select files using the checkboxes.")
      }

      const context = await buildContext(fileTree, contextOptions)
      setContextContent(context)
      toast("Context generated successfully", {
        duration: 3000,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(errorMessage)
      toast(errorMessage, {
        duration: 3000,
      })

      if (error instanceof Error && "partialContext" in error && typeof error.partialContext === "string") {
        setContextContent(error.partialContext)
        toast("Showing partial context due to size limitations", {
          duration: 3000,
        })
      }
    } finally {
      setIsGenerating(false)
      setGenerationProgress({ current: 0, total: 0 })
    }
  }, [fileTree, contextOptions, selectedFilesForContext])

  const validateFiles = useCallback(
    (selectedFiles: Array<{ path: string; content: string; language: string }>): boolean => {
      return selectedFiles.length > 0
    },
    [],
  )

  const buildContext = async (tree: any, options: ContextOptions): Promise<string> => {
    // Get only the selected files
    const files = await getSelectedFiles()

    if (!validateFiles(files)) {
      throw new Error("No valid files selected for context generation")
    }

    setGenerationProgress({ current: 0, total: files.length })

    // Update progress as we process
    for (let i = 0; i < files.length; i++) {
      setGenerationProgress({ current: i + 1, total: files.length })
    }

    // Calculate file type counts for the executive summary
    const fileTypes: Record<string, number> = {}
    files.forEach((file) => {
      const extension = file.path.split(".").pop() || "unknown"
      fileTypes[extension] = (fileTypes[extension] || 0) + 1
    })

  const context: any = {
    files,
    metadata: {
      totalFiles: files.length,
      totalSize: files.reduce((acc, file) => acc + file.content.length, 0),
      languages: Array.from(new Set(files.map((file) => file.language))),
      timestamp: new Date().toISOString(),
      fileTypes,
    },
  };

    // Generate dependencies and architecture in parallel for performance
    const dependencies = await Promise.resolve(mapDependencies(context))
    const architecture = await Promise.resolve(generateArchitectureOverview(context, dependencies))

    let result: string
    const contextWithExtras = { ...context, dependencies, architecture }

    // Always use markdown format as per requirements
    result = generateMarkdown(contextWithExtras)

    const tokenCount = countTokens(result)
    if (tokenCount > effectiveMaxTokens) {
      const error: any = new Error(
        `Generated context exceeds maximum token limit (${tokenCount} > ${effectiveMaxTokens})`,
      )
      error.partialContext = truncateToTokenLimit(result, effectiveMaxTokens)
      throw error
    }

    return result
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(contextContent)
      toast("Context copied to clipboard", {
        duration: 3000,
      })
    } catch (error) {
      console.error("Failed to copy:", error)
      toast("Could not copy context to clipboard. Please try again.", {
        duration: 3000,
      })
    }
  }

  const handleDownload = () => {
    const blob = new Blob([contextContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `codebase-context-${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast("Context downloaded successfully", {
      duration: 3000,
    })
  }

  // Filter context content based on search term
  const filteredContextContent = useMemo(() => {
    if (!searchTerm || !contextContent) return contextContent

    // For JSON format, we need to parse and filter
    if (contextOptions.format === "json" && parsedContext) {
      try {
        // Deep clone the parsed context to avoid modifying the original
        const filtered = JSON.parse(JSON.stringify(parsedContext))

        // Filter files based on search term
        if (filtered.files) {
          filtered.files = filtered.files.filter(
            (file: any) =>
              file.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
              file.content.toLowerCase().includes(searchTerm.toLowerCase()),
          )

          // Update metadata
          if (filtered.metadata) {
            filtered.metadata.totalFiles = filtered.files.length
            filtered.metadata.totalSize = filtered.files.reduce(
              (acc: number, file: any) => acc + file.content.length,
              0,
            )
          }
        }

        return JSON.stringify(filtered, null, contextOptions.minify ? 0 : 2)
      } catch (error) {
        console.error("Error filtering JSON content:", error)
        return contextContent
      }
    }

    // For other formats, we'll do a simple text search
    const lines = contextContent.split("\n")
    const filteredLines = lines.filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase()))

    return filteredLines.join("\n")
  }, [contextContent, searchTerm, contextOptions.format, contextOptions.minify, parsedContext])

  return (
    <div className="p-4 h-[calc(100vh-12rem)] overflow-auto">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Context Generator</h2>
          <div className="flex space-x-2">
            <Button
              onClick={generateContext}
              disabled={isGenerating || Object.keys(fileTree).length === 0 || selectedFilesForContext.size === 0}
              className="gap-1"
            >
              {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Generate Context
            </Button>
          </div>
        </div>

        <ContextSizeEstimator maxTokens={effectiveMaxTokens} />

        {isGenerating && generationProgress.total > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Processing files...</span>
              <span>
                {generationProgress.current} / {generationProgress.total}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (generationProgress.current / generationProgress.total) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error generating context</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="preview" className="flex-1 flex flex-col">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="visualization">Visualization</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 p-0">
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search in context..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setSearchTerm("")} disabled={!searchTerm}>
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyToClipboard}
                disabled={!contextContent}
                className="gap-1"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={!contextContent} className="gap-1">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>

            <div className="border rounded-md p-4 h-full overflow-auto bg-muted">
              {contextContent ? (
                <pre className="text-sm whitespace-pre-wrap">{filteredContextContent}</pre>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No context generated yet. Click "Generate Context" to start.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="summary" className="flex-1 p-0">
            {parsedContext ? (
              <ExecutiveSummary
                metadata={parsedContext.metadata}
                fileTypes={parsedContext.metadata?.fileTypes || {}}
                dependencies={parsedContext.dependencies}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No context generated yet. Click "Generate Context" to start.
              </div>
            )}
          </TabsContent>

          <TabsContent value="visualization" className="flex-1 p-0">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Dependency Graph</CardTitle>
                <CardDescription>Visualize relationships between files in your codebase</CardDescription>
              </CardHeader>
              <CardContent>
                {parsedContext?.dependencies ? (
                  <DependencyGraph dependencies={parsedContext.dependencies} />
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    No dependency data available. Generate context first.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

