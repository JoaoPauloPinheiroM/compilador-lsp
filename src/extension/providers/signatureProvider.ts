import * as vscode from 'vscode';
import { DocumentManager } from '../documentManager';

export class LspSignatureProvider implements vscode.SignatureHelpProvider {
  constructor(private readonly docs: DocumentManager) {}

  provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.SignatureHelp> {
    const compiled = this.docs.getCompiledDocument(document.uri);
    if (!compiled) return null;

    const wordRange = document.getWordRangeAtPosition(position);
    const word = wordRange ? document.getText(wordRange) : '';
    if (!word) return null;

    const help = new vscode.SignatureHelp();
    const signature = new vscode.SignatureInformation(`${word}(...)`);
    help.signatures = [signature];
    help.activeSignature = 0;
    help.activeParameter = 0;
    return help;
  }
}
