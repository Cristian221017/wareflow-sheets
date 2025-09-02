// Simple error handler for compatibility
export function handleError(error: any) {
  if (import.meta.env.MODE === 'development') {
    console.error('Error:', error);
  }
}

export default { handleError };