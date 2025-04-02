"use client"

import { useState, useEffect } from "react"
import { useFileSystem } from "@/components/file-system-provider"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { countTokens } from "@/utils/tokenCounter"

interface ContextSizeEstimatorProps {
  maxTokens: number
}

export function ContextSizeEstimator({ maxTokens }: ContextSizeEstimatorProps) {
  const { fileTree } = useFileSystem()
  const [estimatedSize, setEstimatedSize] = useState(0)
  const [isCalculating, setIsCalculating] = useState(false)

  useEffect(() => {
    const calculateSize = async () => {
      setIsCalculating(true)

      let totalChars = 0
      let totalFiles = 0

      const processEntry = async (entry: any) => {
        if (entry.type === "file") {
          totalFiles++
          if (entry.content) {
            totalChars += entry.content.length
          } else if (entry.size) {
            totalChars += entry.size
          }
        } else if (entry.type === "directory" && entry.children) {
          for (const child of Object.values(entry.children)) {
            await processEntry(child)
          }
        }
      }

      for (const entry of Object.values(fileTree)) {
        await processEntry(entry)
      }

      // More accurate token estimation based on character count and file count
      // We use a more conservative estimate that accounts for code structure
      const estimatedTokens = Math.ceil(countTokens(`Files: ${totalFiles}\nTotal characters: ${totalChars}`))

      // Add overhead for metadata, structure, and formatting
      const overhead = Math.min(10000, totalFiles * 100) // Cap overhead at 10k tokens

      setEstimatedSize(estimatedTokens + overhead)
      setIsCalculating(false)
    }

    if (Object.keys(fileTree).length > 0) {
      calculateSize()
    } else {
      setEstimatedSize(0)
    }
  }, [fileTree])

  const percentOfMax = (estimatedSize / maxTokens) * 100
  const isOverLimit = estimatedSize > maxTokens

  return (
    <div className="space-y-2 mb-4">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">Estimated Context Size</div>
        <div className="text-sm">
          {isCalculating
            ? "Calculating..."
            : `${estimatedSize.toLocaleString()} / ${maxTokens.toLocaleString()} tokens`}
        </div>
      </div>

      <Progress value={Math.min(percentOfMax, 100)} className={isOverLimit ? "text-destructive" : ""} />

      {isOverLimit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Context Size Warning</AlertTitle>
          <AlertDescription>
            The estimated context size exceeds the maximum limit. Consider filtering files or reducing the scope.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

