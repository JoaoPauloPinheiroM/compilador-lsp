import * as vscode from 'vscode';
import { DocumentManager } from '../documentManager';
import { TokenType } from '../../core/lexer/lexer';
import { funcoesNativas } from '../../core/builtins/funcoesNativas';

const KEYWORDS = [
  'funcao', 'fimfuncao', 'retorne', 'se', 'senao', 'enquanto', 'para', 'ate', 'passo',
  'var', 'const', 'cursor', 'alfa', 'numero', 'verdadeiro', 'falso', 'e', 'ou', 'nao'
];

const SYSTEM_VARS = [
  'ValStr', 'ValRet', 'DatSis', 'HorSis', 'EmpAtu', 'CodUsu', 'NomUsu', 'NumEmp', 'CodFil', 'EspLevel', 'Cancel'
];

const CURSOR_METHODS = ['Sql', 'AbrirCursor', 'FecharCursor', 'Achou', 'NaoAchou', 'Proximo', 'EOF', 'Destruir'];

export class LspCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private readonly docs: DocumentManager) {}

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.CompletionItem[]> {
    const items: vscode.CompletionItem[] = [];

    KEYWORDS.forEach(k => items.push(new vscode.CompletionItem(k, vscode.CompletionItemKind.Keyword)));
    SYSTEM_VARS.forEach(v => {
      const item = new vscode.CompletionItem(v, vscode.CompletionItemKind.Variable);
      item.detail = 'Variável de sistema';
      items.push(item);
    });

    Object.keys(funcoesNativas).forEach(name => {
      const def = funcoesNativas[name];
      const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function);
      item.detail = def.descricao;
      items.push(item);
    });

    CURSOR_METHODS.forEach(m => {
      const item = new vscode.CompletionItem(`.${m}`, vscode.CompletionItemKind.Method);
      item.insertText = m;
      item.detail = 'Método de Cursor';
      items.push(item);
    });

    const compiled = this.docs.getCompiledDocument(document.uri);
    if (compiled) {
      const identifiers = new Set<string>();
      for (const token of compiled.tokens) {
        if (token.type === TokenType.Identifier) identifiers.add(token.value);
      }
      identifiers.forEach(name => {
        items.push(new vscode.CompletionItem(name, vscode.CompletionItemKind.Variable));
      });
    }

    return items;
  }
}
