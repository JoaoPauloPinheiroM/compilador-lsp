import * as vscode from 'vscode';
import { DocumentManager } from '../documentManager';

export class LspFormattingProvider implements vscode.DocumentFormattingEditProvider {
  constructor(private readonly docs: DocumentManager) {}

  provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.ProviderResult<vscode.TextEdit[]> {
    // simple identity formatter: trims trailing whitespace
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    );
    const cleaned = document.getText().split('\n').map(line => line.replace(/\s+$/g, '')).join('\n');
    return [vscode.TextEdit.replace(fullRange, cleaned)];
  }
}
