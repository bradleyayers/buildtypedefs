export default function invariant(assertion: boolean, message?: string) {
  if (!assertion) {
    throw new Error(message || 'Invariant violated.');
  }
}
