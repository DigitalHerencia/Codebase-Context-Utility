"use client"

import type React from "react"

import { useState, useRef, type DragEvent } from "react"
import { useFileSystem } from "@/components/file-system-provider"
import { cn } from "@/lib/utils"
import { Upload } from "lucide-react"

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
          <p className="text-sm text-muted-foreground">Drop your files here to analyze</p>
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
        accept=".js,.jsx,.ts,.tsx,.css,.scss,.html,.json,.md,.txt"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        directory=""
        webkitdirectory=""
        className="hidden"
        onChange={(e) => {
          // Filter out unwanted files and folders before processing
          if (e.target.files) {
            const filteredFiles = Array.from(e.target.files).filter((file) => {
              const path = file.webkitRelativePath || file.name
              // Skip node_modules, .git, .next folders and binary/image files
              return (
                !path.includes("node_modules/") &&
                !path.includes(".git/") &&
                !path.includes(".next/") &&
                !path.includes("dist/") &&
                !path.includes("build/") &&
                !path.match(
                  /\.(jpg|jpeg|png|gif|bmp|ico|webp|mp3|mp4|mov|pdf|zip|tar|gz|exe|dll|woff|woff2|eot|ttf)$/i,
                ) &&
                !path.includes("package-lock.json") &&
                !path.includes("yarn.lock") &&
                file.size < 1024 * 1024
              ) // Skip files larger than 1MB (likely binary)
            })

            // Create a new FileList-like object with filtered files
            const dataTransfer = new DataTransfer()
            filteredFiles.forEach((file) => dataTransfer.items.add(file))

            // Call the original handler with filtered files
            handleFileInputChange({
              ...e,
              target: {
                ...e.target,
                files: dataTransfer.files,
              },
            })
          }
        }}
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

