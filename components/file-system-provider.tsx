"use client"

import type {} from "@/lib/file-system-access-types"
import { createContext, useContext, useState, type ReactNode } from "react"

// Define types for our file system
export interface FileEntry {
  name: string
  type: "file" | "directory"
  path: string
  handle?: FileSystemHandle // Change this line
  language?: string
  children?: Record<string, FileEntry>
  content?: string
  size?: number
  lastModified?: number
  error?: string // Add error property
}

export interface FileSystemContextType {
  fileTree: Record<string, FileEntry>
  selectedFile: string | null
  setSelectedFile: (path: string | null) => void
  openDirectory: () => Promise<void>
  openFile: () => Promise<void>
  readFileContent: (path: string) => Promise<string>
  isLoading: boolean
  addFiles: (files: FileList | File[] | DataTransfer) => Promise<void>
  rootDirectoryHandle: FileSystemDirectoryHandle | null
  refreshFileTree: () => Promise<void> // Add this line
}

const FileSystemContext = createContext<FileSystemContextType | null>(null)

/**
 * Custom hook to access the file system context.
 *
 * @returns {FileSystemContextType} The file system context
 * @throws {Error} If used outside of a FileSystemProvider
 * @example
 * \`\`\`tsx
 * const { fileTree, selectedFile, openDirectory } = useFileSystem();
 * \`\`\`
 */
export function useFileSystem() {
  const context = useContext(FileSystemContext)
  if (!context) {
    throw new Error("useFileSystem must be used within a FileSystemProvider")
  }
  return context
}

interface FileSystemProviderProps {
  children: ReactNode
}

/**
 * FileSystemProvider component that provides file system functionality to the application.
 * This component uses the File System Access API to interact with the user's file system.
 *
 * @component
 * @example
 * \`\`\`tsx
 * <FileSystemProvider>
 *   <App />
 * </FileSystemProvider>
 * \`\`\`
 */
export function FileSystemProvider({ children }: FileSystemProviderProps) {
  const [fileTree, setFileTree] = useState<Record<string, FileEntry>>({})
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [rootDirectoryHandle, setRootDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null)

  // Check if File System Access API is supported and allowed
  const isFileSystemAccessSupported = () => {
    return "showDirectoryPicker" in window && "showOpenFilePicker" in window
  }

  // Get file language from extension
  const getLanguageFromExtension = (filename: string): string => {
    const extension = filename.split(".").pop()?.toLowerCase() || ""
    const extensionMap: Record<string, string> = {
      js: "javascript",
      jsx: "jsx",
      ts: "typescript",
      tsx: "tsx",
      html: "html",
      css: "css",
      scss: "scss",
      json: "json",
      md: "markdown",
      py: "python",
      rb: "ruby",
      go: "go",
      java: "java",
      php: "php",
      c: "c",
      cpp: "cpp",
      cs: "csharp",
      swift: "swift",
      kt: "kotlin",
      rs: "rust",
    }
    return extensionMap[extension] || "plaintext"
  }

  // Utility function for file size formatting
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB"
  }

  // More comprehensive binary file detection
  const isBinary = (fileName: string, fileSize: number): boolean => {
    // Check common binary extensions
    if (/\.(jpg|jpeg|png|gif|bmp|ico|webp|mp3|mp4|mov|pdf|zip|tar|gz|exe|dll|woff|woff2|eot|ttf)$/i.test(fileName)) {
      return true
    }

    // Large files over 1MB might be binary
    if (fileSize > 1024 * 1024) {
      return true
    }

    return false
  }

  /**
   * Process a directory and build a file tree structure.
   *
   * @param {FileSystemDirectoryHandle} dirHandle - The directory handle to process
   * @param {string} path - The current path (used for recursion)
   * @returns {Promise<FileEntry>} A promise that resolves to the file entry
   */
  const processDirectory = async (dirHandle: FileSystemDirectoryHandle, path = ""): Promise<FileEntry> => {
    try {
      const entry: FileEntry = {
        name: dirHandle.name,
        type: "directory",
        path: path || dirHandle.name,
        handle: dirHandle,
        children: {},
      }

      // Skip certain directories that are likely to cause issues
      if (["node_modules", ".git", ".next", "dist", "build"].includes(dirHandle.name)) {
        console.log(`Skipping directory: ${dirHandle.name}`)
        return entry
      }

      for await (const [name, handle] of dirHandle.entries()) {
        try {
          const childPath = path ? `${path}/${name}` : name

          if (handle.kind === "file") {
            try {
              const file = await (handle as FileSystemFileHandle).getFile()
              entry.children![name] = {
                name,
                type: "file",
                path: childPath,
                handle,
                language: getLanguageFromExtension(name),
                size: file.size,
                lastModified: file.lastModified,
              }
            } catch (fileError: any) {
              console.warn(`Error processing file ${name}:`, fileError)
              // Add entry with error information
              entry.children![name] = {
                name,
                type: "file",
                path: childPath,
                handle,
                language: getLanguageFromExtension(name),
                error: `Failed to process: ${fileError.message || "Unknown error"}`,
              }
            }
          } else if (handle.kind === "directory") {
            try {
              entry.children![name] = await processDirectory(handle as FileSystemDirectoryHandle, childPath)
            } catch (dirError: any) {
              console.warn(`Error processing directory ${name}:`, dirError)
              // Add entry with error information
              entry.children![name] = {
                name,
                type: "directory",
                path: childPath,
                handle,
                children: {},
                error: `Failed to process: ${dirError.message || "Unknown error"}`,
              }
            }
          }
        } catch (entryError) {
          console.warn(`Error processing entry ${name}:`, entryError)
          // Skip this entry and continue with others
        }
      }

      return entry
    } catch (error: any) {
      console.error(`Error processing directory ${path || dirHandle.name}:`, error)
      // Return a partial entry with error information
      return {
        name: dirHandle.name,
        type: "directory",
        path: path || dirHandle.name,
        handle: dirHandle,
        children: {},
        error: `Failed to process: ${error.message || "Unknown error"}`,
      }
    }
  }

  const refreshFileTree = async () => {
    setIsLoading(true)
    try {
      if (rootDirectoryHandle) {
        const rootEntry = await processDirectory(rootDirectoryHandle)
        setFileTree({ [rootEntry.name]: rootEntry })
      }
    } catch (error) {
      console.error("Error refreshing file tree:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Modified openDirectory function
  const openDirectory = async () => {
    if (!isFileSystemAccessSupported()) {
      console.warn("File System Access API is not supported or allowed in this context. Using fallback method.")
      // Trigger the fallback file input
      const fileInput = document.createElement("input")
      fileInput.type = "file"
      fileInput.webkitdirectory = true
      fileInput.multiple = true
      fileInput.style.display = "none"
      document.body.appendChild(fileInput)

      fileInput.onchange = async (event) => {
        const files = (event.target as HTMLInputElement).files
        if (files) {
          await addFiles(files)
        }
        document.body.removeChild(fileInput)
      }

      fileInput.click()
      return
    }

    try {
      setIsLoading(true)

      // Show directory picker
      const dirHandle = await window.showDirectoryPicker()
      setRootDirectoryHandle(dirHandle)

      // Process the directory
      const rootEntry = await processDirectory(dirHandle)

      // Update file tree
      setFileTree({ [rootEntry.name]: rootEntry })
      setSelectedFile(null)
    } catch (error) {
      console.error("Error opening directory:", error)
      // User cancelled or error occurred
    } finally {
      setIsLoading(false)
    }
  }

  // Modified openFile function
  const openFile = async () => {
    if (!isFileSystemAccessSupported()) {
      console.warn("File System Access API is not supported or allowed in this context. Using fallback method.")
      // Trigger the fallback file input
      const fileInput = document.createElement("input")
      fileInput.type = "file"
      fileInput.style.display = "none"
      document.body.appendChild(fileInput)

      fileInput.onchange = async (event) => {
        const files = (event.target as HTMLInputElement).files
        if (files) {
          await addFiles(files)
        }
        document.body.removeChild(fileInput)
      }

      fileInput.click()
      return
    }

    try {
      setIsLoading(true)

      // Show file picker
      const [fileHandle] = await window.showOpenFilePicker({
        multiple: false,
      })

      const file = await fileHandle.getFile()
      const fileName = file.name

      // Add file to tree
      const newFileTree = { ...fileTree }
      newFileTree[fileName] = {
        name: fileName,
        type: "file",
        path: fileName,
        handle: fileHandle,
        language: getLanguageFromExtension(fileName),
        size: file.size,
        lastModified: file.lastModified,
      }

      setFileTree(newFileTree)
      setSelectedFile(fileName)
    } catch (error) {
      console.error("Error opening file:", error)
      // User cancelled or error occurred
    } finally {
      setIsLoading(false)
    }
  }

  // Read file content with better error handling
  const readFileContent = async (path: string): Promise<string> => {
    // Find the file in the tree
    const pathParts = path.split("/")
    let current = fileTree

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i]
      if (current[part] && current[part].children) {
        current = current[part].children!
      } else {
        throw new Error(`Path not found: ${path}`)
      }
    }

    const fileName = pathParts[pathParts.length - 1]
    const fileEntry = current[fileName]

    if (!fileEntry || fileEntry.type !== "file") {
      throw new Error(`File not found: ${path}`)
    }

    try {
      // If we have a handle (File System Access API)
      if (fileEntry.handle) {
        const fileHandle = fileEntry.handle as FileSystemFileHandle
        const file = await fileHandle.getFile()

        if (isBinary(file.name, file.size)) {
          return `[Binary file: ${file.name}, ${formatFileSize(file.size)}]`
        }

        return await file.text()
      }
      // If we have content already stored (drag and drop)
      else if (fileEntry.content) {
        return fileEntry.content
      }
      // No way to read the file
      else {
        throw new Error(`Cannot read file: ${path} - No file handle or content available`)
      }
    } catch (error: any) {
      console.error(`Error reading file ${path}:`, error)
      throw new Error(`Failed to read file: ${error.message || "Unknown error"}`)
    }
  }

  // Process dropped files
  const processDroppedFile = async (file: File, basePath = ""): Promise<FileEntry> => {
    const path = basePath ? `${basePath}/${file.name}` : file.name

    return {
      name: file.name,
      type: "file",
      path,
      language: getLanguageFromExtension(file.name),
      size: file.size,
      lastModified: file.lastModified,
      content: await file.text(),
    }
  }

  // Process dropped directory (using FileSystemDirectoryEntry)
  const processDroppedDirectory = async (entry: FileSystemEntry, basePath = ""): Promise<FileEntry | null> => {
    if (!entry.isDirectory) return null

    const dirReader = (entry as FileSystemDirectoryEntry).createReader()
    const path = basePath ? `${basePath}/${entry.name}` : entry.name

    const dirEntry: FileEntry = {
      name: entry.name,
      type: "directory",
      path,
      children: {},
    }

    // Read all entries in the directory
    const readEntries = (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        dirReader.readEntries(resolve, reject)
      })
    }

    let entries: FileSystemEntry[] = []
    let batch: FileSystemEntry[] = []

    // Directory reader may not return all entries in a single call, so we need to keep calling until empty
    do {
      batch = await readEntries()
      entries = entries.concat(batch)
    } while (batch.length > 0)

    // Process all entries
    for (const childEntry of entries) {
      if (childEntry.isFile) {
        const fileEntry = childEntry as FileSystemFileEntry
        const file = await new Promise<File>((resolve, reject) => {
          fileEntry.file(resolve, reject)
        })

        dirEntry.children![childEntry.name] = await processDroppedFile(file, path)
      } else if (childEntry.isDirectory) {
        const childDirEntry = await processDroppedDirectory(childEntry, path)
        if (childDirEntry) {
          dirEntry.children![childEntry.name] = childDirEntry
        }
      }
    }

    return dirEntry
  }

  // Add files to the tree (for drag and drop)
  const addFiles = async (fileList: FileList | File[] | DataTransfer) => {
    setIsLoading(true)

    try {
      const newFileTree = { ...fileTree }

      // Handle DataTransfer object
      if (fileList instanceof DataTransfer) {
        const items = fileList.items

        for (let i = 0; i < items.length; i++) {
          const item = items[i]

          if (item.kind === "file") {
            const entry = item.webkitGetAsEntry()

            if (entry) {
              if (entry.isDirectory) {
                const dirEntry = await processDroppedDirectory(entry)
                if (dirEntry) {
                  newFileTree[dirEntry.name] = dirEntry
                }
              } else if (entry.isFile) {
                const file = item.getAsFile()
                if (file) {
                  newFileTree[file.name] = await processDroppedFile(file)
                }
              }
            }
          }
        }
      } else {
        // Handle FileList or File[]
        const files = Array.from(fileList)

        for (const file of files) {
          newFileTree[file.name] = await processDroppedFile(file)
        }
      }

      setFileTree(newFileTree)
    } catch (error) {
      console.error("Error processing dropped files:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const value: FileSystemContextType = {
    fileTree,
    selectedFile,
    setSelectedFile,
    openDirectory,
    openFile,
    readFileContent,
    isLoading,
    addFiles,
    rootDirectoryHandle,
    refreshFileTree, // Add this line
  }

  return <FileSystemContext.Provider value={value}>{children}</FileSystemContext.Provider>
}

