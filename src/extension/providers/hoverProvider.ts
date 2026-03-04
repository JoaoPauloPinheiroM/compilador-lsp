import * as vscode from 'vscode';
import { DocumentManager } from '../documentManager';

export class LspHoverProvider implements vscode.HoverProvider {
  constructor(private readonly docs: DocumentManager) {}

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
    const range = document.getWordRangeAtPosition(position);
    if (!range) return null;
    const word = document.getText(range);

    const compiled = this.docs.getCompiledDocument(document.uri);
    if (!compiled) return new vscode.Hover(word, range);

    const diag = compiled.diagnostics.find(d => d.message.includes(word));
    if (diag) {
      return new vscode.Hover(`${word}\n\n${diag.message}`, range);
    }

    return new vscode.Hover(word, range);
  }
}
