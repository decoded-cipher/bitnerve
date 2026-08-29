export function formatModelName(modelName: string): string {
  return modelName.replace(/[\/-]/g, ' ').trim().toUpperCase()
}
