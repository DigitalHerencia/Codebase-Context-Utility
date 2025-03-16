"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function ExampleUsage() {
  return (
    <Button
      onClick={() =>
        toast("Hello World", {
          description: "This is a toast message",
        })
      }
    >
      Show Toast
    </Button>
  )
}

