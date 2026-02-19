// Server-only: this module uses Node.js fs/path and must not be imported from client components.
// Import from '@/lib/compliance/agent' for compliance checking functions.

import { promises as fs } from 'fs';
import path from 'path';
import { MLSComplianceConfig } from '@/lib/types';

/**
 * Load compliance documentation markdown files.
 * Returns concatenated content for prompt injection.
 * Handles missing files gracefully.
 *
 * SERVER-ONLY: Do not import this from client components.
 */
export async function loadComplianceDocs(config: MLSComplianceConfig): Promise<string> {
  if (!config.docPaths) return '';

  const allPaths = [
    ...(config.docPaths.federal || []),
    ...(config.docPaths.state || []),
    ...(config.docPaths.industry || []),
  ];

  const contents: string[] = [];

  for (const docPath of allPaths) {
    try {
      const fullPath = path.resolve(process.cwd(), docPath);
      const docsRoot = path.resolve(process.cwd(), 'compliance-docs');

      // Block path traversal: resolved path must be inside docs/
      if (!fullPath.startsWith(docsRoot + path.sep) && fullPath !== docsRoot) {
        console.warn(`Compliance doc path traversal blocked: ${docPath}`);
        continue;
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      contents.push(content);
    } catch {
      // Missing doc file -- log warning but continue
      console.warn(`Compliance doc not found: ${docPath}`);
    }
  }

  return contents.join('\n\n---\n\n');
}
