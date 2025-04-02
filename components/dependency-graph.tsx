"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"
import { Card } from "@/components/ui/card"

interface DependencyGraphProps {
  dependencies: Record<string, { imports: string[]; usedBy: string[] }>
  width?: number
  height?: number
}

export function DependencyGraph({ dependencies, width = 800, height = 600 }: DependencyGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !dependencies || Object.keys(dependencies).length === 0) return

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove()

    // Create nodes and links from dependencies
    const nodes: { id: string; group: number }[] = []
    const links: { source: string; target: string; value: number }[] = []
    const nodeMap = new Map<string, boolean>()

    // Add all files as nodes
    Object.keys(dependencies).forEach((file, index) => {
      if (!nodeMap.has(file)) {
        nodes.push({ id: file, group: 1 })
        nodeMap.set(file, true)
      }

      // Add links for imports
      dependencies[file].imports.forEach((importFile) => {
        // Skip external dependencies
        if (!importFile.startsWith(".") && !importFile.startsWith("@/")) return

        // Normalize import path (very simplified)
        const normalizedImport = importFile.replace(/^@\//, "")

        // Add target node if it doesn't exist
        if (!nodeMap.has(normalizedImport)) {
          nodes.push({ id: normalizedImport, group: 2 })
          nodeMap.set(normalizedImport, true)
        }

        links.push({ source: file, target: normalizedImport, value: 1 })
      })
    })

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        "link",
        d3.forceLink(links).id((d: any) => d.id),
      )
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2))

    // Create SVG elements
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;")

    // Add zoom functionality
    const g = svg.append("g")
    svg.call(
      d3.zoom().on("zoom", (event) => {
        g.attr("transform", event.transform)
      }) as any,
    )

    // Create links
    const link = g
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d) => Math.sqrt(d.value))

    // Create nodes
    const node = g
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 5)
      .attr("fill", (d) => (d.group === 1 ? "#4f46e5" : "#10b981"))
      .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended) as any)

    // Add tooltips
    node.append("title").text((d) => d.id)

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y)
    })

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: any, d: any) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    return () => {
      simulation.stop()
    }
  }, [dependencies, width, height])

  if (!dependencies || Object.keys(dependencies).length === 0) {
    return (
      <Card className="p-4 text-center text-muted-foreground">
        No dependency data available. Generate context first.
      </Card>
    )
  }

  return (
    <div className="overflow-hidden border rounded-md">
      <svg ref={svgRef} className="w-full" style={{ minHeight: "400px" }}></svg>
    </div>
  )
}

