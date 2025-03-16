"use client"
import { FileTree } from "@/components/file-tree"

import { CodePreview } from "@/components/code-preview"
import { ContextProvider } from "@/components/context-provider"
import { DropZone } from "@/components/drop-zone"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useFileSystem } from "@/components/file-system-provider"
import { useState, useEffect } from "react"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
        <>
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
              <Tabs defaultValue="preview" className="h-full flex flex-col">
                <div className="flex items-center justify-between p-3">
                  <TabsList>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="context">LLM Context</TabsTrigger>
                  </TabsList>
                  <div className="text-sm text-muted-foreground">
                    {selectedFile ? selectedFile : "No file selected"}
                  </div>
                </div>
                <TabsContent value="preview" className="m-0 flex-1 overflow-auto no-scrollbar">
                  <CodePreview filePath={selectedFile} />
                </TabsContent>
                <TabsContent value="context" className="m-0 flex-1 overflow-auto no-scrollbar">
                  <ContextProvider />
                </TabsContent>
              </Tabs>
            </ResizablePanel>
          </ResizablePanelGroup>
        </>
      )}
    </div>
  )
}

