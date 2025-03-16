"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Download, RefreshCw } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useFileSystem } from "@/components/file-system-provider"
import { ContextSizeEstimator } from "@/components/context-size-estimator"
import { ExportSettings } from "@/components/export-settings"
import { generateArchitectureOverview } from "@/utils/architectureVisualizer"
import { mapDependencies } from "@/utils/dependencyMapper"
import { countTokens, truncateToTokenLimit } from "@/utils/tokenCounter"
import { generateJSON } from "@/utils/jsonFormatter"
import { generateMarkdown } from "@/utils/markdownFormatter"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ContextOptions {
  format: "json" | "markdown" | "plain"
  includeMetadata: boolean
  minify: boolean
  maxTokens: number
  targetLLM: string
  includeFullContent: boolean
}

const LLM_OPTIONS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4.5", label: "GPT-4.5" },
  { value: "o1", label: "o1" },
  { value: "o3-mini", label: "o3 Mini" },
  { value: "o3-mini-high", label: "o3 Mini High" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
] as const

const DEFAULT_MAX_TOKENS = 128000
const TOKEN_SAFETY_MARGIN = 0.9 // Only use 90% of max tokens to allow for safety margin

export function ContextProvider() {
  const { fileTree, readFileContent } = useFileSystem()
  const [contextOptions, setContextOptions] = useState<ContextOptions>({
    format: "json",
    includeMetadata: true,
    minify: false,
    maxTokens: DEFAULT_MAX_TOKENS,
    targetLLM: "gpt-4o",
    includeFullContent: false,
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [contextContent, setContextContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })
  const [customInstructions, setCustomInstructions] = useState("")
  const [isCustomized, setIsCustomized] = useState(false)

  // Memoize the effective max tokens to avoid unnecessary recalculations
  const effectiveMaxTokens = useMemo(() => {
    return Math.floor(contextOptions.maxTokens * TOKEN_SAFETY_MARGIN)
  }, [contextOptions.maxTokens])

  // Reset error when options change
  useEffect(() => {
    setError(null)
  }, [contextOptions])

  // Update custom instructions when model changes
  useEffect(() => {
    const defaultInstructions = getDefaultInstructions()
    // Only update if the user hasn't customized the instructions yet
    if (!isCustomized) {
      setCustomInstructions(defaultInstructions)
    }
  }, [
    contextOptions.targetLLM,
    contextOptions.format,
    contextOptions.includeMetadata,
    contextOptions.includeFullContent,
    isCustomized,
  ])

  const getDefaultInstructions = () => {
    const fileCount = Object.keys(fileTree).length
    const formatName =
      contextOptions.format === "json" ? "JSON" : contextOptions.format === "markdown" ? "Markdown" : "Plain Text"
    const contentType = contextOptions.includeFullContent ? "full content" : "truncated content"

    const basePrompt = `You are an AI assistant analyzing a codebase. The following context contains:

1. ${fileCount > 0 ? `${fileCount} files from the codebase` : "Files from the codebase once loaded"}
2. File structure and organization
3. Code content in ${formatName} format (${contentType})
4. Dependencies between files
5. Architecture overview
${contextOptions.includeMetadata ? "6. Metadata about languages, file sizes, and timestamps" : ""}

Please analyze this codebase context and provide:
- A summary of the overall architecture and structure
- Key components and their relationships
- Potential code quality issues or anti-patterns
- Suggestions for improvements in organization, performance, or maintainability
- Best practices that could be applied`

    // Customize based on the selected model
    switch (contextOptions.targetLLM) {
      case "gpt-4o":
        return `${basePrompt}

Focus on providing actionable insights that would help improve this codebase. If you notice any security vulnerabilities or performance bottlenecks, highlight those as priority items.`
      case "gpt-4.5":
        return `${basePrompt}

Provide a comprehensive analysis with special attention to architectural patterns and code organization. Suggest modern best practices that could enhance maintainability.`
      case "o1":
        return `${basePrompt}

Take your time to analyze the codebase thoroughly. Focus on identifying complex issues and providing detailed, well-reasoned recommendations for improvements.`
      case "o3-mini":
      case "o3-mini-high":
        return `${basePrompt}

Provide a concise but thorough analysis focusing on the most critical aspects of the codebase. Prioritize actionable recommendations.`
      case "gpt-4o-mini":
        return `${basePrompt}

Focus on providing a balanced overview of the codebase with practical, implementable suggestions for improvement.`
      default:
        return basePrompt
    }
  }

  const generateContext = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    setContextContent("")
    setGenerationProgress({ current: 0, total: 0 })

    try {
      if (Object.keys(fileTree).length === 0) {
        throw new Error("No files loaded. Please open a folder or files first.")
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
  }, [fileTree, contextOptions])

  const validateFiles = useCallback((tree: Record<string, any>): boolean => {
    let hasFiles = false
    const maxDepth = 20 // Prevent infinite recursion

    const checkForFiles = (subtree: Record<string, any>, depth = 0) => {
      if (depth > maxDepth) return

      for (const [_, entry] of Object.entries(subtree)) {
        if (hasFiles) return // Early exit if we found files
        if (entry.type === "file") {
          hasFiles = true
          return
        } else if (entry.type === "directory" && entry.children) {
          checkForFiles(entry.children, depth + 1)
        }
      }
    }

    checkForFiles(tree)
    return hasFiles
  }, [])

  const buildContext = async (tree: any, options: ContextOptions): Promise<string> => {
    if (!validateFiles(tree)) {
      throw new Error("No valid files found in the selected directory")
    }

    // Count total files for progress tracking
    let totalFiles = 0
    const countFiles = (subtree: Record<string, any>) => {
      for (const [_, entry] of Object.entries(subtree)) {
        if (entry.type === "file") {
          totalFiles++
        } else if (entry.type === "directory" && entry.children) {
          countFiles(entry.children)
        }
      }
    }
    countFiles(tree)
    setGenerationProgress({ current: 0, total: totalFiles })

    const files = await flattenFileTree(tree, options.includeFullContent)
    if (files.length === 0) {
      throw new Error("No readable files found in the selected directory")
    }

    const context = {
      files,
      metadata: {
        totalFiles: files.length,
        totalSize: files.reduce((acc, file) => acc + file.content.length, 0),
        languages: Array.from(new Set(files.map((file) => file.language))),
        timestamp: new Date().toISOString(),
        targetLLM: options.targetLLM,
      },
    }

    // Generate dependencies and architecture in parallel for performance
    const dependencies = await Promise.resolve(mapDependencies(context))
    const architecture = await Promise.resolve(generateArchitectureOverview(context, dependencies))

    let result: string
    const contextWithExtras = { ...context, dependencies, architecture }

    switch (options.format) {
      case "json":
        result = generateJSON(contextWithExtras, options.minify)
        break
      case "markdown":
        result = generateMarkdown(contextWithExtras)
        break
      case "plain":
        result = generatePlainTextContext(contextWithExtras, options)
        break
      default:
        throw new Error(`Unsupported format: ${options.format}`)
    }

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

  const flattenFileTree = async (
    tree: Record<string, any>,
    includeFullContent = false,
    basePath = "",
  ): Promise<Array<{ path: string; content: string; language: string }>> => {
    const files: Array<{ path: string; content: string; language: string }> = []
    let processedFiles = 0
    const isMounted = true

    // Create a local function to update progress that checks if component is still mounted
    const updateProgress = (current: number) => {
      if (isMounted) {
        setGenerationProgress((prev) => ({ ...prev, current }))
      }
    }

    const processDirectory = async (subtree: Record<string, any>, currentPath = "") => {
      for (const [name, entry] of Object.entries(subtree)) {
        const path = currentPath ? `${currentPath}/${name}` : name

        if (entry.type === "file") {
          try {
            const content = await readFileContent(path)

            // For large files, truncate content unless full content is requested
            const processedContent =
              !includeFullContent && content.length > 5000
                ? content.substring(0, 5000) + "\n\n[Content truncated...]"
                : content

            files.push({
              path,
              content: processedContent,
              language: entry.language || "plaintext",
            })

            processedFiles++
            updateProgress(processedFiles)
          } catch (error) {
            console.warn(`Skipping file ${path}: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        } else if (entry.type === "directory" && entry.children) {
          // Skip common directories that typically contain large amounts of code
          if (["node_modules", ".git", ".next", "dist", "build", ".cache"].includes(name)) {
            console.log(`Skipping directory: ${path}`)
            continue
          }
          await processDirectory(entry.children, path)
        }
      }
    }

    await processDirectory(tree, basePath)
    return files
  }

  const generatePlainTextContext = (context: any, options: ContextOptions): string => {
    let plainText = "Codebase Context\n\n"

    if (options.includeMetadata) {
      plainText += "Metadata:\n"
      plainText += `Total Files: ${context.metadata.totalFiles}\n`
      plainText += `Total Size: ${context.metadata.totalSize} characters\n`
      plainText += `Languages: ${context.metadata.languages.join(", ")}\n\n`
    }

    plainText += "Files:\n\n"
    for (const file of context.files) {
      plainText += `--- ${file.path} ---\n\n`
      plainText += file.content + "\n\n"
    }

    if (context.dependencies) {
      plainText += "Dependencies:\n\n"
      plainText += JSON.stringify(context.dependencies, null, 2) + "\n\n"
    }

    if (context.architecture) {
      plainText += "Architecture:\n\n"
      plainText += context.architecture + "\n"
    }

    return plainText
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(customInstructions)
      toast("Prompt copied to clipboard", {
        duration: 3000,
      })
    } catch (error) {
      console.error("Failed to copy:", error)
      toast("Could not copy prompt to clipboard. Please try again.", {
        duration: 3000,
      })
    }
  }

  const handleDownload = () => {
    const blob = new Blob([contextContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `codebase-context-${contextOptions.targetLLM}-${new Date().toISOString().slice(0, 10)}.${contextOptions.format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast("Context downloaded successfully", {
      duration: 3000,
    })
  }

  const getOutputTokenLimit = (targetLLM: string): string => {
    switch (targetLLM) {
      case "gpt-4o":
        return "Typically limited to 4,096 tokens per response"
      case "gpt-4.5":
        return "Not explicitly specified, but generally aligns with the context window limitations"
      case "o1":
        return "Up to 32,768 tokens"
      case "o3-mini":
        return "Not explicitly specified, but generally aligns with the context window limitations"
      case "o3-mini-high":
        return "Not explicitly specified, but generally aligns with the context window limitations"
      case "gpt-4o-mini":
        return "Up to 16,000 tokens per request"
      default:
        return "Varies by model"
    }
  }

  const getModelDescription = (targetLLM: string): string => {
    switch (targetLLM) {
      case "gpt-4o":
        return 'GPT-4o ("omni") is a multimodal model capable of processing and generating text, images, and audio. It supports over 50 languages and offers rapid, human-like interactions.'
      case "gpt-4.5":
        return 'GPT-4.5, codenamed "Orion," is OpenAI\'s latest large-scale model, offering enhanced pattern recognition, creativity, and user interaction. It maintains the extensive context window of its predecessors.'
      case "o1":
        return "The o1 model is designed to enhance reasoning capabilities by allocating more processing time before generating responses, improving performance in complex tasks such as scientific research and coding."
      case "o3-mini":
        return "o3 Mini is a compact version of the o3 model, optimized for faster and more accurate performance in tasks related to math, coding, and science. It offers advanced reasoning capabilities with reduced latency."
      case "o3-mini-high":
        return "This variant of o3 Mini utilizes increased computational resources to enhance reasoning and accuracy, making it suitable for users requiring superior performance in complex analytical tasks."
      case "gpt-4o-mini":
        return "GPT-4o Mini is a streamlined version of GPT-4o, designed to be more resource-efficient while maintaining multimodal functionalities. It offers a cost-effective solution for users requiring robust AI capabilities."
      default:
        return "Select a model to see its description."
    }
  }

  return (
    <div className="p-4 h-[calc(100vh-12rem)] overflow-auto">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Context Generator</h2>
          <div></div>
        </div>

        <ContextSizeEstimator maxSize={effectiveMaxTokens} targetLLM={contextOptions.targetLLM} />

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
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="export">Export Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 p-0">
            <div className="border rounded-md p-4 h-full overflow-auto bg-muted">
              {contextContent ? (
                <pre className="text-sm whitespace-pre-wrap">{contextContent}</pre>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No context generated yet. Click "Generate Context" to start.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="prompt" className="flex-1 p-0">
            <div className="flex flex-col h-full">
              <div className="space-y-4 p-4 mb-4 border rounded-md">
                {/* Add the Target LLM selection here */}
                <div className="space-y-2">
                  <Label htmlFor="target-llm">Target LLM</Label>
                  <Select
                    value={contextOptions.targetLLM}
                    onValueChange={(value) => setContextOptions({ ...contextOptions, targetLLM: value })}
                  >
                    <SelectTrigger id="target-llm" className="w-full">
                      <SelectValue placeholder="Select LLM" />
                    </SelectTrigger>
                    <SelectContent>
                      {LLM_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Model Information */}
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <h4 className="text-sm font-medium mb-1">Model Information</h4>
                  <div className="text-xs space-y-1">
                    <p>
                      <span className="font-medium">Context Window:</span> 128,000 tokens
                    </p>
                    <p>
                      <span className="font-medium">Input Token Limit:</span> Up to 128,000 tokens
                    </p>
                    <p>
                      <span className="font-medium">Output Token Limit:</span>{" "}
                      {getOutputTokenLimit(contextOptions.targetLLM)}
                    </p>
                    <p className="mt-2 text-muted-foreground">{getModelDescription(contextOptions.targetLLM)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="instructions">Instructions for LLM</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCustomInstructions(getDefaultInstructions())
                        setIsCustomized(false)
                      }}
                      className="text-xs h-7"
                    >
                      Reset to default
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {isCustomized && (
                      <div className="mt-1 text-amber-500 dark:text-amber-400">
                        <em>
                          Note: You've customized these instructions. Changing the model will not update them
                          automatically.
                        </em>
                      </div>
                    )}
                  </div>
                  <Textarea
                    id="instructions"
                    placeholder="Enter custom instructions for the LLM..."
                    value={customInstructions}
                    onChange={(e) => {
                      setCustomInstructions(e.target.value)
                      setIsCustomized(true)
                    }}
                    className="h-32"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="export" className="flex-1 p-0">
            <ExportSettings
              contextOptions={contextOptions}
              setContextOptions={setContextOptions}
              contextContent={contextContent}
              onCopy={handleCopyToClipboard}
              onDownload={handleDownload}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-between space-x-2 mt-4">
          <Button
            onClick={generateContext}
            disabled={isGenerating || Object.keys(fileTree).length === 0}
            className="gap-1"
          >
            {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Generate Context
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleCopyToClipboard} disabled={!customInstructions} className="gap-1">
              <Copy className="h-4 w-4" />
              Copy Prompt
            </Button>
            <Button variant="outline" onClick={handleDownload} disabled={!contextContent} className="gap-1">
              <Download className="h-4 w-4" />
              Download Context
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

