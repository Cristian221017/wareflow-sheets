// Simple system diagnostic for compatibility
export function runSystemDiagnostic() {
  return {
    status: 'OK',
    message: 'System diagnostic disabled',
    timestamp: new Date().toISOString()
  };
}

export default { runSystemDiagnostic };