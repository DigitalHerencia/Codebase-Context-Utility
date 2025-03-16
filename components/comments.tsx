"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Comment {
  id: number
  text: string
  timestamp: Date
}

export function Comments() {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")

  const addComment = () => {
    if (newComment.trim()) {
      setComments([...comments, { id: Date.now(), text: newComment, timestamp: new Date() }])
      setNewComment("")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." />
        <Button onClick={addComment}>Add</Button>
      </div>
      <div className="space-y-2">
        {comments.map((comment) => (
          <div key={comment.id} className="bg-muted p-2 rounded">
            <p>{comment.text}</p>
            <p className="text-xs text-muted-foreground">{comment.timestamp.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

