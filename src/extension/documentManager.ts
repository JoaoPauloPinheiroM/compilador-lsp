import * as vscode from 'vscode';
import { Lexer } from '../core/lexer/lexer';
import { Parser } from '../core/parser/parser';
import { SemanticAnalyzer } from '../core/analyzer/analyzer';
import { CompilerDiagnostic, DiagnosticSeverity as CompilerSeverity } from '../core/diagnostics/compilerDiagnostic';

export interface CompiledDocument {
	tokens: ReturnType<Lexer['tokenize']>['tokens'];
	ast: ReturnType<Parser['getAST']>['ast'];
	analyzer: SemanticAnalyzer;
	diagnostics: CompilerDiagnostic[];
}

export class DocumentManager {
	private readonly cache = new Map<string, CompiledDocument>();
	private readonly diagnostics: vscode.DiagnosticCollection;

	constructor(diagnosticCollection: vscode.DiagnosticCollection) {
		this.diagnostics = diagnosticCollection;
	}

	public updateDocument(document: vscode.TextDocument): void {
		if (document.languageId !== 'lsp') return;

		const uriKey = document.uri.toString();
		const source = document.getText();

		const lexer = new Lexer(source);
		const { tokens, diagnostics: lexDiag } = lexer.tokenize();

		const parser = new Parser(tokens);
		const { ast, diagnostics: parseDiag } = parser.getAST();

		const analyzer = new SemanticAnalyzer(ast);
		const semDiag = analyzer.analyze();

		const allDiagnostics = [...lexDiag, ...parseDiag, ...semDiag];
		this.diagnostics.set(document.uri, allDiagnostics.map(diag => this.toVsDiagnostic(diag)));

		this.cache.set(uriKey, { tokens, ast, analyzer, diagnostics: allDiagnostics });
	}

	public getCompiledDocument(uri: vscode.Uri): CompiledDocument | undefined {
		return this.cache.get(uri.toString());
	}

	public removeDocument(uri: vscode.Uri): void {
		this.cache.delete(uri.toString());
		this.diagnostics.delete(uri);
	}

	private toVsDiagnostic(diag: CompilerDiagnostic): vscode.Diagnostic {
		const range = new vscode.Range(
			diag.range.startLine,
			diag.range.startColumn,
			diag.range.endLine,
			diag.range.endColumn
		);
		return new vscode.Diagnostic(range, diag.message, this.toVsSeverity(diag.severity));
	}

	private toVsSeverity(sev: CompilerSeverity): vscode.DiagnosticSeverity {
		switch (sev) {
			case CompilerSeverity.Error: return vscode.DiagnosticSeverity.Error;
			case CompilerSeverity.Warning: return vscode.DiagnosticSeverity.Warning;
			case CompilerSeverity.Information: return vscode.DiagnosticSeverity.Information;
			default: return vscode.DiagnosticSeverity.Hint;
		}
	}
}
