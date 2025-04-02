"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ExecutiveSummaryProps {
  metadata: {
    totalFiles: number
    totalSize: number
    languages: string[]
    timestamp: string
  }
  fileTypes: Record<string, number>
  dependencies?: Record<string, { imports: string[]; usedBy: string[] }>
}

export function ExecutiveSummary({ metadata, fileTypes, dependencies }: ExecutiveSummaryProps) {
  // Calculate key metrics
  const totalDependencies = dependencies ? Object.keys(dependencies).length : 0
  const mostImportedFiles = dependencies
    ? Object.entries(dependencies)
        .map(([file, deps]) => ({ file, count: deps.usedBy?.length || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    : []

  // Group files by directory
  const directoryStructure: Record<string, number> = {}
  if (dependencies) {
    Object.keys(dependencies).forEach((file) => {
      const directory = file.split("/")[0]
      directoryStructure[directory] = (directoryStructure[directory] || 0) + 1
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Codebase Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Files</h3>
              <p className="text-2xl font-bold">{metadata.totalFiles}</p>
              <p className="text-sm text-muted-foreground">Total size: {formatBytes(metadata.totalSize)}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Languages</h3>
              <div className="flex flex-wrap gap-1">
                {metadata.languages.map((lang) => (
                  <Badge key={lang} variant="outline">
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Generated</h3>
              <p className="text-sm">{new Date(metadata.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>File Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(fileTypes)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm font-medium">.{type}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Directory Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(directoryStructure)
                .sort((a, b) => b[1] - a[1])
                .map(([dir, count]) => (
                  <div key={dir} className="flex justify-between items-center">
                    <span className="text-sm font-medium">/{dir}</span>
                    <Badge variant="secondary">{count} files</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {mostImportedFiles.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Most Used Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mostImportedFiles.map(({ file, count }) => (
                <div key={file} className="flex justify-between items-center">
                  <span className="text-sm font-medium truncate">{file}</span>
                  <Badge variant="secondary">Used by {count} files</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

