"use client"

import type React from "react"

import { useState, useCallback, useMemo } from "react"
import { FixedSizeList as List } from "react-window"
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFileSystem, type FileEntry } from "@/components/file-system-provider"

interface FlattenedFileEntry extends FileEntry {
  depth: number
  path: string
}

function flattenFileTree(tree: Record<string, FileEntry>, depth = 0, path = ""): FlattenedFileEntry[] {
  let flattened: FlattenedFileEntry[] = []

  for (const [name, entry] of Object.entries(tree)) {
    const entryPath = path ? `${path}/${name}` : name
    flattened.push({ ...entry, name, depth, path: entryPath })

    if (entry.type === "directory" && entry.children) {
      flattened = flattened.concat(flattenFileTree(entry.children, depth + 1, entryPath))
    }
  }

  return flattened
}

export function VirtualizedFileTree({ searchTerm = "" }) {
  const { fileTree, selectedFile, setSelectedFile } = useFileSystem()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // Flatten and filter the tree based on search term
  const flattenedTree = useMemo(() => {
    const flattened = flattenFileTree(fileTree)
    if (!searchTerm) return flattened

    return flattened.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [fileTree, searchTerm])

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = flattenedTree[index]
    const isExpanded = expandedFolders.has(item.path)
    const isSelected = selectedFile === item.path

    return (
      <div
        style={{
          ...style,
          paddingLeft: `${item.depth * 20 + 8}px`,
        }}
        className={cn("flex items-center py-1 px-2 cursor-pointer hover:bg-muted", isSelected && "bg-muted")}
        onClick={() => (item.type === "directory" ? toggleFolder(item.path) : setSelectedFile(item.path))}
      >
        {item.type === "directory" ? (
          <>
            <span className="mr-1">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500 mr-2" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500 mr-2" />
            )}
          </>
        ) : (
          <File className="h-4 w-4 text-gray-500 mr-2" />
        )}
        <span className="truncate">{item.name}</span>
      </div>
    )
  }

  return (
    <List height={600} itemCount={flattenedTree.length} itemSize={24} width="100%">
      {Row}
    </List>
  )
}

