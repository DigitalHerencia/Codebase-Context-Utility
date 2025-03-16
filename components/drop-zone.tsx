"use client"

import type React from "react"

import { useState, useRef, type DragEvent } from "react"
import { useFileSystem } from "@/components/file-system-provider"
import { cn } from "@/lib/utils"
import { FolderOpen, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DropZoneProps {
  className?: string
}

export function DropZone({ className }: DropZoneProps) {
  const { addFiles, isLoading } = useFileSystem()
  const [isDragging, setIsDragging] = useState(false)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Handle drag events
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // Only set isDragging to false if we're leaving the drop zone
    // and not entering a child element
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    // Pass the DataTransfer object directly to addFiles
    await addFiles(e.dataTransfer)
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFolderSelect = () => {
    folderInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files)
    }
  }

  return (
    <div
      ref={dropZoneRef}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors",
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
        isLoading && "opacity-50 cursor-not-allowed",
        className,
      )}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="region"
      aria-label="File drop zone"
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="rounded-full bg-primary/10 p-4">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Drag and drop files or folders</h3>
          <p className="text-sm text-muted-foreground">Drop your files here or click to browse</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleFileSelect} disabled={isLoading}>
            Select Files
          </Button>
          <Button variant="default" onClick={handleFolderSelect} disabled={isLoading}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Select Folder
          </Button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        tabIndex={-1}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        directory=""
        webkitdirectory=""
        className="hidden"
        onChange={handleFileInputChange}
        tabIndex={-1}
      />
    </div>
  )
}

// Add custom attributes for directory selection
declare module "react" {
  interface InputHTMLAttributes<T> {
    directory?: string
    webkitdirectory?: string
  }
}

