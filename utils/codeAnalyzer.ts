import * as parser from "@babel/parser"
import traverse from "@babel/traverse"
import * as t from "@babel/types"

interface CodeAnalysis {
  imports: Array<{
    source: string
    specifiers: string[]
  }>
  exports: Array<{
    name: string
    type: string
  }>
  functions: Array<{
    name: string
    params: string[]
    async: boolean
    generator: boolean
    returnType?: string
  }>
  classes: Array<{
    name: string
    methods: Array<{
      name: string
      params: string[]
      async: boolean
      visibility?: string
    }>
    properties: Array<{
      name: string
      type?: string
      visibility?: string
    }>
  }>
  interfaces: Array<{
    name: string
    properties: Array<{
      name: string
      type: string
      optional: boolean
    }>
  }>
  variables: Array<{
    name: string
    type: string
    kind: "const" | "let" | "var" | "using" | "await using"
    value?: string
  }>
  endpoints?: Array<{
    path: string
    method: string
    handler: string
  }>
}

export function analyzeCode(code: string, filename: string): CodeAnalysis {
  const analysis: CodeAnalysis = {
    imports: [],
    exports: [],
    functions: [],
    classes: [],
    interfaces: [],
    variables: [],
    endpoints: [],
  }

  try {
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "decorators-legacy"],
    })

    traverse(ast, {
      ImportDeclaration(path) {
        analysis.imports.push({
          source: path.node.source.value,
          specifiers: path.node.specifiers.map((spec) => {
            if (t.isImportDefaultSpecifier(spec)) {
              return spec.local.name
            }
            return spec.local.name
          }),
        })
      },

      ExportNamedDeclaration(path) {
        if (path.node.declaration) {
          if (t.isFunctionDeclaration(path.node.declaration)) {
            analysis.exports.push({
              name: path.node.declaration.id?.name || "anonymous",
              type: "function",
            })
          } else if (t.isClassDeclaration(path.node.declaration)) {
            analysis.exports.push({
              name: path.node.declaration.id?.name || "anonymous",
              type: "class",
            })
          }
        }
      },

      FunctionDeclaration(path) {
        analysis.functions.push({
          name: path.node.id?.name || "anonymous",
          params: path.node.params.map((param) => {
            if (t.isIdentifier(param)) {
              return param.name
            }
            return "unknown"
          }),
          async: path.node.async,
          generator: path.node.generator,
        })
      },

      ClassDeclaration(path) {
        const methods: any[] = []
        const properties: any[] = []

        path.node.body.body.forEach((member) => {
          if (t.isClassMethod(member)) {
            methods.push({
              name: (member.key as any).name,
              params: member.params.map((param) => {
                if (t.isIdentifier(param)) {
                  return param.name
                }
                return "unknown"
              }),
              async: member.async,
              visibility: member.accessibility,
            })
          } else if (t.isClassProperty(member)) {
            properties.push({
              name: (member.key as any).name,
              visibility: member.accessibility,
            })
          }
        })

        analysis.classes.push({
          name: path.node.id?.name || "anonymous",
          methods,
          properties,
        })
      },

      TSInterfaceDeclaration(path) {
        const properties = path.node.body.body
          .map((prop) => {
            if (t.isTSPropertySignature(prop)) {
              return {
                name: (prop.key as any).name,
                type: prop.typeAnnotation ? (prop.typeAnnotation as any).typeAnnotation.type : "unknown",
                optional: prop.optional || false,
              }
            }
            return null
          })
          .filter(Boolean)

        analysis.interfaces.push({
          name: path.node.id.name,
          properties: properties as any,
        })
      },

      VariableDeclaration(path) {
        path.node.declarations.forEach((decl) => {
          if (t.isIdentifier(decl.id)) {
            analysis.variables.push({
              name: decl.id.name,
              kind: path.node.kind,
              type: decl.id.typeAnnotation ? (decl.id.typeAnnotation as any).typeAnnotation.type : "unknown",
              value: decl.init ? (decl.init as any).value : undefined,
            })
          }
        })
      },
    })

    // Detect API endpoints (Next.js App Router)
    if (filename.includes("app") && filename.includes("route.ts")) {
      const routeParts = filename.split("app")[1].split("route.ts")[0]
      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"]

      methods.forEach((method) => {
        if (code.includes(`export async function ${method}`)) {
          analysis.endpoints?.push({
            path: routeParts,
            method,
            handler: `${method} handler`,
          })
        }
      })
    }
  } catch (error) {
    console.warn(`Error analyzing code for ${filename}:`, error)
  }

  return analysis
}

