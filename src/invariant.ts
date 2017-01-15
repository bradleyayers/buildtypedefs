export default function invariant(assertion: boolean, message?: string) {
  if (!assertion) {
    debugger;
    throw new Error(message || 'Invariant violated.');
  }
}
