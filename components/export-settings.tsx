"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface ExportSettingsProps {
  contextOptions: {
    format: "json" | "markdown" | "plain"
    targetLLM: string
    includeMetadata: boolean
    minify: boolean
    includeFullContent: boolean
    maxTokens: number
  }
  setContextOptions: (options: any) => void
  contextContent: string
  onCopy: () => void
  onDownload: () => void
}

export function ExportSettings({
  contextOptions,
  setContextOptions,
  contextContent,
  onCopy,
  onDownload,
}: ExportSettingsProps) {
  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Format Options</CardTitle>
          <CardDescription>Configure how your context is generated and formatted</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select
              value={contextOptions.format}
              onValueChange={(value: "json" | "markdown" | "plain") =>
                setContextOptions({ ...contextOptions, format: value })
              }
            >
              <SelectTrigger id="format" className="w-full">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
                <SelectItem value="plain">Plain Text</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-metadata"
                checked={contextOptions.includeMetadata}
                onCheckedChange={(checked) =>
                  setContextOptions({ ...contextOptions, includeMetadata: checked as boolean })
                }
              />
              <Label htmlFor="include-metadata">Include Metadata</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="minify"
                checked={contextOptions.minify}
                onCheckedChange={(checked) => setContextOptions({ ...contextOptions, minify: checked as boolean })}
              />
              <Label htmlFor="minify">Minify</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-full-content"
                checked={contextOptions.includeFullContent}
                onCheckedChange={(checked) =>
                  setContextOptions({ ...contextOptions, includeFullContent: checked as boolean })
                }
              />
              <Label htmlFor="include-full-content">Include Full Content</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

