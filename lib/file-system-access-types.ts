// Type definitions for the File System Access API
// Based on https://wicg.github.io/file-system-access/

export {}

declare global {
  interface FileSystemHandle {
    readonly kind: "file" | "directory"
    readonly name: string
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    readonly kind: "file"
    getFile(): Promise<File>
    createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    readonly kind: "directory"
    getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle>
    getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle>
    removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<void>
    resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>
    keys(): AsyncIterableIterator<string>
    values(): AsyncIterableIterator<FileSystemHandle>
  }

  interface FileSystemCreateWritableOptions {
    keepExistingData?: boolean
  }

  interface FileSystemGetDirectoryOptions {
    create?: boolean
  }

  interface FileSystemGetFileOptions {
    create?: boolean
  }

  interface FileSystemRemoveOptions {
    recursive?: boolean
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: FileSystemWriteChunkType): Promise<void>
    seek(position: number): Promise<void>
    truncate(size: number): Promise<void>
  }

  // Extend the Window interface
  interface Window {
    showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
    showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>
    showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>
  }

  interface DirectoryPickerOptions {
    id?: string
    mode?: "read" | "readwrite"
    startIn?: FileSystemHandle | "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos"
  }

  interface OpenFilePickerOptions {
    multiple?: boolean
    excludeAcceptAllOption?: boolean
    types?: FilePickerAcceptType[]
    startIn?: FileSystemHandle | "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos"
  }

  interface SaveFilePickerOptions {
    excludeAcceptAllOption?: boolean
    suggestedName?: string
    types?: FilePickerAcceptType[]
    startIn?: FileSystemHandle | "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos"
  }

  interface FilePickerAcceptType {
    description?: string
    accept: Record<string, string[]>
  }
}

