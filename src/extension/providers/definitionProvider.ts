import * as vscode from 'vscode';
import { DocumentManager } from '../documentManager';
import { TokenType } from '../../core/lexer/lexer';

export class LspDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private readonly docs: DocumentManager) {}

  provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition> {
    const compiled = this.docs.getCompiledDocument(document.uri);
    if (!compiled) return null;

    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) return null;
    const word = document.getText(wordRange);

    // naive lookup: first occurrence of identifier in tokens
    const token = compiled.tokens.find(t => t.type === TokenType.Identifier && t.value === word);
    if (!token) return null;

    const targetPos = new vscode.Position(token.line, token.column);
    return new vscode.Location(document.uri, targetPos);
  }
}
