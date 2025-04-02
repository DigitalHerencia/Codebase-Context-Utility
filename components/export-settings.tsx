"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"

interface ExportSettingsProps {
  contextOptions: {
    format: "json" | "markdown" | "plain"
    includeMetadata: boolean
    minify: boolean
    includeFullContent: boolean
    maxTokens: number
    includeDependencyGraph?: boolean
    includeExecutiveSummary?: boolean
  }
  setContextOptions: (options: any) => void
}

export function ExportSettings({ contextOptions, setContextOptions }: ExportSettingsProps) {
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
              <Label htmlFor="minify">Minify Output</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content Options</CardTitle>
          <CardDescription>Configure what information to include in the context</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-executive-summary"
                checked={contextOptions.includeExecutiveSummary}
                onCheckedChange={(checked) =>
                  setContextOptions({ ...contextOptions, includeExecutiveSummary: checked as boolean })
                }
              />
              <Label htmlFor="include-executive-summary">Include Executive Summary</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-dependency-graph"
                checked={contextOptions.includeDependencyGraph}
                onCheckedChange={(checked) =>
                  setContextOptions({ ...contextOptions, includeDependencyGraph: checked as boolean })
                }
              />
              <Label htmlFor="include-dependency-graph">Include Dependency Information</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-full-content"
                checked={contextOptions.includeFullContent}
                onCheckedChange={(checked) =>
                  setContextOptions({ ...contextOptions, includeFullContent: checked as boolean })
                }
              />
              <Label htmlFor="include-full-content">Include Full File Content</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Token Limits</CardTitle>
          <CardDescription>Configure maximum token size for context generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="max-tokens" className="mb-2 block">
                Maximum Tokens: {contextOptions.maxTokens.toLocaleString()}
              </Label>
              <Slider
                id="max-tokens"
                min={10000}
                max={128000}
                step={1000}
                value={[contextOptions.maxTokens]}
                onValueChange={(value) => setContextOptions({ ...contextOptions, maxTokens: value[0] })}
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10K</span>
                <span>50K</span>
                <span>128K</span>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                Adjust the maximum token limit based on your LLM's context window. Higher values allow more content but
                may exceed your model's capabilities.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

