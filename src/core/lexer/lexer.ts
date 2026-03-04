// ==========================================
// LEXER DO COMPILADOR LSP
// Independente de plataforma (CLI ou Extensão)
// ==========================================

import { CompilerDiagnostic, DiagnosticSeverity, TextRange } from '../diagnostics/compilerDiagnostic';

export enum TokenType {
    Keyword,
    Type,
    Identifier,
    Number,
    String,
    Symbol,
    EOF,
    Unknown
}

export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
}

const KEYWORDS = new Set([
    'se', 'senao', 'para', 'enquanto', 'inicio', 'fim',
    'definir', 'funcao', 'pare', 'continue', 'cancel', 'retorna',
    'vapara', 'usar', 'regra', 'end'
]);

const TYPES = new Set([
    'numero', 'alfa', 'data', 'cursor', 'tabela', 'lista'
]);

const LOGICAL_OPS = new Set([
    'e', 'ou', 'and', 'or', 'nao', 'not'
]);

export class Lexer {
    private source: string;
    private position: number = 0;
    private line: number = 0;
    private column: number = 0;
    private diagnostics: CompilerDiagnostic[] = [];

    constructor(source: string) {
        this.source = source;
    }

    /**
     * Varre todo o código-fonte e devolve a lista de tokens e os diagnósticos.
     */
    public tokenize(): { tokens: Token[], diagnostics: CompilerDiagnostic[] } {
        const tokens: Token[] = [];
        
        while (this.position < this.source.length) {
            this.skipWhitespaceAndComments();
            if (this.position >= this.source.length) break;

            const char = this.source[this.position];
            const startColumn = this.column;

            // 1. Identificadores, Tipos e Palavras-Chave
            if (/[a-zA-Z_]/.test(char)) {
                let value = '';
                while (this.position < this.source.length && /[a-zA-Z0-9_.]/.test(this.source[this.position])) {
                    value += this.source[this.position];
                    this.advance();
                }
                
                let type = TokenType.Identifier;
                const lowerValue = value.toLowerCase();
                
                if (KEYWORDS.has(lowerValue)) type = TokenType.Keyword;
                else if (TYPES.has(lowerValue)) type = TokenType.Type;
                else if (LOGICAL_OPS.has(lowerValue)) type = TokenType.Symbol;

                tokens.push({ type, value, line: this.line, column: startColumn });
                continue;
            }

            // 2. Números (Inteiros e Decimais)
            if (/[0-9]/.test(char)) {
                let value = '';
                while (this.position < this.source.length && /[0-9.]/.test(this.source[this.position])) {
                    value += this.source[this.position];
                    this.advance();
                }
                tokens.push({ type: TokenType.Number, value, line: this.line, column: startColumn });
                continue;
            }

            // 3. Strings (Aspas duplas ou simples) - armazenamos sem as aspas
            if (char === '"' || char === "'") {
                const quote = char;
                let value = '';
                this.advance();
                
                while (this.position < this.source.length && this.source[this.position] !== quote) {
                    value += this.source[this.position];
                    this.advance();
                }
                
                // Consome a aspa de fecho
                if (this.position < this.source.length) {
                    this.advance();
                }
                
                tokens.push({ type: TokenType.String, value, line: this.line, column: startColumn });
                continue;
            }

            // 4. Símbolos Matemáticos, Atribuição e Pontuação (inclui operadores compostos)
            const twoChar = this.source.substring(this.position, this.position + 2);
            const multiCharOperators = ['>=', '<=', '<>', '!=', '++', '--'];
            if (multiCharOperators.includes(twoChar)) {
                tokens.push({ type: TokenType.Symbol, value: twoChar, line: this.line, column: startColumn });
                this.advance();
                this.advance();
                continue;
            }

            if (/[;{}()=,<>+\-*/\[\]!]/.test(char)) {
                tokens.push({ type: TokenType.Symbol, value: char, line: this.line, column: startColumn });
                this.advance();
                continue;
            }

            // 5. Caracteres Desconhecidos (Tratado pelo Lexer como Erro)
            const unknownToken = { type: TokenType.Unknown, value: char, line: this.line, column: startColumn };
            tokens.push(unknownToken);
            this.error(unknownToken, `Símbolo inesperado ou não reconhecido pela linguagem: '${char}'`);
            this.advance();
        }

        // Marca de Fim de Ficheiro (Crucial para o Parser não entrar em loop infinito)
        tokens.push({ type: TokenType.EOF, value: '', line: this.line, column: this.column });
        
        return { tokens, diagnostics: this.diagnostics };
    }

    private advance(): void {
        if (this.source[this.position] === '\n') {
            this.line++;
            this.column = 0;
        } else {
            this.column++;
        }
        this.position++;
    }

    private skipWhitespaceAndComments(): void {
        while (this.position < this.source.length) {
            const char = this.source[this.position];
            
            // Ignora espaços, tabs, quebras de linha
            if (/\s/.test(char)) {
                this.advance();
                continue;
            }
            
            // Ignora Comentários em linha no formato Senior (@ ... @)
            if (char === '@') {
                this.advance();
                while (this.position < this.source.length && this.source[this.position] !== '@') {
                    this.advance();
                }
                if (this.position < this.source.length) {
                    this.advance(); // Consome o '@' final
                }
                continue;
            }

            // Ignora Comentários em bloco padrão (/* ... */)
            if (char === '/' && this.source[this.position + 1] === '*') {
                this.advance();
                this.advance();
                while (this.position < this.source.length - 1 && !(this.source[this.position] === '*' && this.source[this.position + 1] === '/')) {
                    this.advance();
                }
                // Consome o */ final
                this.advance();
                this.advance();
                continue;
            }
            
            // Se não for espaço nem comentário, para de ignorar.
            break;
        }
    }

    private error(token: Token, message: string): void {
        const range: TextRange = {
            startLine: token.line,
            startColumn: token.column,
            endLine: token.line,
            endColumn: token.column + 1
        };
        this.diagnostics.push(new CompilerDiagnostic(range, `[Erro Léxico]: ${message}`, DiagnosticSeverity.Error));
    }
}