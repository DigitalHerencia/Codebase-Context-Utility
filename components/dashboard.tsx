"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable"
import { Alert,  AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useFileSystem } from "@/lib/use-file-system"
import { DropZone } from "@/components/drop-zone"
import { FileTree } from "@/components/file-tree"
import { CodePreview } from "@/components/code-preview"
import { ContextProvider } from "@/components/context-provider"
import { AlertCircle } from "lucide-react"

export function Dashboard() {
  const { fileTree, selectedFile, isLoading } = useFileSystem()
  const [hasFiles, setHasFiles] = useState(false)

  // Check if there are files in the fileTree
  useEffect(() => {
    setHasFiles(Object.keys(fileTree).length > 0)
  }, [fileTree])

  return (
    <div className="container py-4 h-[calc(100vh-3.5rem)] overflow-hidden">
      {!hasFiles ? (
        <DropZone className="h-[calc(100vh-6rem)]" />
      ) : (
        <Tabs defaultValue="preview" className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="context">LLM Context</TabsTrigger>
            </TabsList>
            <div className="text-sm text-muted-foreground">{selectedFile ? selectedFile : "No file selected"}</div>
          </div>

          {Object.keys(fileTree).length === 0 ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error loading files</AlertTitle>
              <AlertDescription>
                No files could be loaded. Try refreshing or opening a different folder.
              </AlertDescription>
            </Alert>
          ) : null}

          <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-10rem)] rounded-lg border">
            <ResizablePanel defaultSize={25} minSize={20}>
              <div className="flex h-full flex-col">
                <div className="p-3 font-medium">File Explorer</div>
                <div className="flex-1 overflow-auto no-scrollbar">
                  <FileTree />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={75}>
              <div className="h-full flex flex-col">
                <TabsContent value="preview" className="m-0 flex-1 overflow-auto no-scrollbar h-full">
                  <CodePreview filePath={selectedFile} />
                </TabsContent>
                <TabsContent value="context" className="m-0 flex-1 overflow-auto no-scrollbar h-full">
                  <ContextProvider />
                </TabsContent>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </Tabs>
      )}
    </div>
  )
}

