export interface FileInfo {
  path: string
  content: string
  language: string
}

export interface CodebaseContext {
  files: FileInfo[]
  metadata: {
    totalFiles: number
    totalSize: number
    languages: string[]
    timestamp: string
  }
}

export interface Dependencies {
  [key: string]: {
    imports: string[]
    usedBy: string[]
  }
}

