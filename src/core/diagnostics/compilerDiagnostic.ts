// ==========================================
// SISTEMA DE DIAGNÓSTICO DO COMPILADOR
// Totalmente isolado. Não importa dependências de IDE (como VS Code).
// ==========================================

export enum DiagnosticSeverity {
    Error = 0,
    Warning = 1,
    Information = 2,
    Hint = 3
}

export interface TextRange {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}

export class CompilerDiagnostic {
    constructor(
        public readonly range: TextRange,
        public readonly message: string,
        public readonly severity: DiagnosticSeverity
    ) {}

    /**
     * Facilita a visualização do erro ao fazer debug no terminal (CLI)
     */
    public toString(): string {
        const severityName = DiagnosticSeverity[this.severity].toUpperCase();
        return `[${severityName}] Linha ${this.startLine + 1}, Coluna ${this.startColumn + 1}: ${this.message}`;
    }

    // Getters de conveniência para o CLI
    get startLine(): number { return this.range.startLine; }
    get startColumn(): number { return this.range.startColumn; }
}