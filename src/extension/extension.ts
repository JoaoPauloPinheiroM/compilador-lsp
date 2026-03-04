import * as vscode from 'vscode';
import { DocumentManager } from './documentManager';
import { LspCompletionProvider } from "./providers/completionProvider";
import { LspDefinitionProvider } from "./providers/definitionProvider";
import { LspHoverProvider } from "./providers/hoverProvider";
import { LspSignatureProvider } from "./providers/signatureProvider";
import { LspFormattingProvider } from "./providers/formattingProvider";

export function activate(context: vscode.ExtensionContext) {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('lsp');
  context.subscriptions.push(diagnosticCollection);

  const documentManager = new DocumentManager(diagnosticCollection);

  const analyze = (doc: vscode.TextDocument) => documentManager.updateDocument(doc);

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(analyze),
    vscode.workspace.onDidSaveTextDocument(analyze),
    vscode.workspace.onDidChangeTextDocument(event => analyze(event.document)),
    vscode.workspace.onDidCloseTextDocument(doc => documentManager.removeDocument(doc.uri))
  );

  // Analisa documentos já abertos
  vscode.workspace.textDocuments.forEach(analyze);

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider('lsp', new LspCompletionProvider(documentManager), ' ', '.', '(', ','),
    vscode.languages.registerDefinitionProvider('lsp', new LspDefinitionProvider(documentManager)),
    vscode.languages.registerHoverProvider('lsp', new LspHoverProvider(documentManager)),
    vscode.languages.registerSignatureHelpProvider('lsp', new LspSignatureProvider(documentManager), '(', ','),
    vscode.languages.registerDocumentFormattingEditProvider('lsp', new LspFormattingProvider(documentManager))
  );
}

export function deactivate() {}
