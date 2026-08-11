/** Isolate /llm from heavy root layout side-effects; pure client route. */
export const dynamic = 'force-dynamic';

export default function LlmLayout({ children }) {
  return children;
}
