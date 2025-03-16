export function summarizeClass(classDeclaration: any): any {
  return {
    name: classDeclaration.name,
    methods: classDeclaration.methods.map((method: any) => ({
      name: method.name,
      parameters: method.parameters.map((param: any) => param.name),
      returnType: method.returnType,
    })),
    properties: classDeclaration.properties.map((prop: any) => ({
      name: prop.name,
      type: prop.type,
    })),
  }
}

export function summarizeFunction(functionDeclaration: any): any {
  return {
    name: functionDeclaration.name,
    parameters: functionDeclaration.parameters.map((param: any) => ({
      name: param.name,
      type: param.type,
    })),
    returnType: functionDeclaration.returnType,
  }
}

