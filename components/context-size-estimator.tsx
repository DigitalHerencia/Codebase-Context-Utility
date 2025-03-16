"use client"

import { useState, useEffect } from "react"
import { useFileSystem } from "@/components/file-system-provider"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface ContextSizeEstimatorProps {
  maxSize: number // in tokens
  targetLLM: string
}

function getTokenLimitForLLM(_llm: string): number {
  // All models now have the same context window of 128,000 tokens
  return 128000
}

export function ContextSizeEstimator({ targetLLM }: ContextSizeEstimatorProps) {
  const { fileTree } = useFileSystem()
  const [estimatedSize, setEstimatedSize] = useState(0)
  const [isCalculating, setIsCalculating] = useState(false)

  // Get the token limit for the selected LLM
  const tokenLimit = getTokenLimitForLLM(targetLLM)

  useEffect(() => {
    const calculateSize = async () => {
      setIsCalculating(true)

      let totalChars = 0

      const processEntry = async (entry: any) => {
        if (entry.type === "file") {
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

      // Estimate tokens (roughly 4 chars per token)
      const estimatedTokens = Math.ceil(totalChars / 4)
      setEstimatedSize(estimatedTokens)
      setIsCalculating(false)
    }

    if (Object.keys(fileTree).length > 0) {
      calculateSize()
    } else {
      setEstimatedSize(0)
    }
  }, [fileTree])

  const percentOfMax = (estimatedSize / tokenLimit) * 100
  const isOverLimit = estimatedSize > tokenLimit

  return (
    <div className="space-y-2 mb-4">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">Estimated Context Size</div>
        <div className="text-sm">
          {isCalculating
            ? "Calculating..."
            : `${estimatedSize.toLocaleString()} / ${tokenLimit.toLocaleString()} tokens`}
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

