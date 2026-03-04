// ==========================================
// ANALISADOR SEMÂNTICO (Type Checker)
// Totalmente independente do VS Code.
// ==========================================

import { Token, TokenType } from '../lexer/lexer';
import { funcoesNativas } from '../builtins/funcoesNativas'; // Assumindo que moveremos para cá
import { CompilerDiagnostic, DiagnosticSeverity, TextRange } from '../diagnostics/compilerDiagnostic';
import { 
    Statement, Expression, BlockStatement, VarDeclaration, FuncDeclaration, 
    IfStatement, WhileStatement, ForStatement, Assignment, ExpressionStatement, 
    BinaryExpr, UnaryExpr, LiteralExpr, IdentifierExpr, CallExpr 
} from '../parser/parser';

export class SemanticAnalyzer {
    private ast: Statement[];
    private diagnostics: CompilerDiagnostic[] = [];
    private openCursors = new Set<string>();
    
    // Tabela de Símbolos
    private variables = new Map<string, { type: string, token: Token, isSystemVariable?: boolean }>();
    private functions = new Map<string, { paramCount: number, token: Token, declared: boolean, implemented: boolean, params: any[] }>();
    private scopes: Array<Map<string, { type: string, token: Token, isSystemVariable?: boolean }>> = [];

    constructor(ast: Statement[]) {
        this.ast = ast;
        this.injectSystemVariables();
    }

    private injectSystemVariables() {
        // Variáveis Globais de Sistema Senior
        const systemVars: Record<string, string> = {
            'ValStr': 'Alfa',
            'ValRet': 'Numero',
            'DatSis': 'Data',
            'HorSis': 'Numero',
            'EmpAtu': 'Numero',
            'CodUsu': 'Numero',
            'NomUsu': 'Alfa',
            'NumEmp': 'Numero',
            'CodFil': 'Numero',
            'EspLevel': 'Numero',
            'Cancel': 'Numero' 
        };

        const globalScope = this.currentScope();
        for (const [name, type] of Object.entries(systemVars)) {
            const dummyToken: Token = { type: TokenType.Identifier, value: name, line: 0, column: 0 };
            const info = { type, token: dummyToken, isSystemVariable: true };
            globalScope.set(name.toLowerCase(), info);
            this.variables.set(name.toLowerCase(), info);
        }
    }

    /**
     * Efetua a análise semântica e devolve os erros encontrados.
     */
    public analyze(): CompilerDiagnostic[] {
        // 1. Primeira passagem: Hoisting (funções globais)
        this.hoistDeclarations(this.ast);

        // 2. Segunda passagem: Type Checking e Verificação de Referências com escopos
        this.checkNodes(this.ast);

        // 3. Verifica cursores abertos sem fechamento explícito
        for (const cursorName of this.openCursors) {
            const info = this.variables.get(cursorName);
            if (info) {
                this.addDiagnostic(
                    info.token,
                    `Cursor '${info.token.value}' foi aberto mas não foi fechado com FecharCursor() ou Destruir().`,
                    DiagnosticSeverity.Warning
                );
            }
        }

        return this.diagnostics;
    }

    public getVariables() {
        return this.variables;
    }

    public getUserFunctions() {
        return this.functions;
    }

    private normalizeType(type: string): string {
        const lower = type.toLowerCase();
        switch (lower) {
            case 'numero': return 'Numero';
            case 'alfa': return 'Alfa';
            case 'data': return 'Data';
            case 'cursor': return 'Cursor';
            case 'tabela': return 'Tabela';
            case 'lista': return 'Lista';
            default: return type;
        }
    }

    // ==========================================
    // HOISTING (Mapeamento Prévio)
    // ==========================================
    private hoistDeclarations(nodes: Statement[]) {
        for (const node of nodes) {
            if (node.type === 'FuncDecl') {
                const decl = node as FuncDeclaration;
                const name = decl.name.toLowerCase();
                const funcToken: Token = { ...decl.token, value: decl.name };
                const currentInfo = this.functions.get(name);
                const paramCount = decl.params.length;
                const params = decl.params;

                if (decl.isImplementation) {
                    // Implementação antes da declaração não é permitida
                    if (!currentInfo) {
                        this.addDiagnostic(decl.token, `Função '${decl.name}' deve ser declarada (Definir Funcao) antes de ser implementada.`, DiagnosticSeverity.Error);
                        this.functions.set(name, { paramCount, token: funcToken, declared: false, implemented: true, params });
                        continue;
                    }

                    if (currentInfo.implemented) {
                        this.addDiagnostic(decl.token, `Função '${decl.name}' já foi implementada.`, DiagnosticSeverity.Error);
                    }

                    if (currentInfo.declared && currentInfo.paramCount !== paramCount) {
                        this.addDiagnostic(decl.token, `Implementação da função '${decl.name}' não corresponde à declaração: esperado ${currentInfo.paramCount} parâmetro(s).`, DiagnosticSeverity.Error);
                    }

                    this.functions.set(name, {
                        paramCount: currentInfo.paramCount,
                        token: currentInfo.token,
                        declared: currentInfo.declared,
                        implemented: true,
                        params: currentInfo.params
                    });
                } else {
                    if (currentInfo?.declared) {
                        this.addDiagnostic(decl.token, `Função '${decl.name}' já foi declarada.`, DiagnosticSeverity.Error);
                    }

                    if (currentInfo && currentInfo.implemented && !currentInfo.declared) {
                        this.addDiagnostic(decl.token, `Função '${decl.name}' foi implementada antes de ser declarada.`, DiagnosticSeverity.Error);
                    }

                    if (currentInfo && currentInfo.implemented && currentInfo.paramCount !== paramCount) {
                        this.addDiagnostic(decl.token, `Declaração da função '${decl.name}' não corresponde à implementação: esperado ${currentInfo.paramCount} parâmetro(s).`, DiagnosticSeverity.Error);
                    }

                    this.functions.set(name, {
                        paramCount,
                        token: funcToken,
                        declared: true,
                        implemented: currentInfo?.implemented ?? false,
                        params
                    });
                }
            }
        }
    }

    // ==========================================
    // TYPE CHECKING E VALIDAÇÕES
    // ==========================================
    private checkNodes(nodes: Statement[]) {
        for (const node of nodes) {
            this.checkStatement(node);
        }
    }

    private checkStatement(node: Statement) {
        switch (node.type) {
            case 'Block': {
                this.pushScope();
                this.checkNodes((node as BlockStatement).statements);
                this.popScope();
                break;
            }
            case 'VarDecl': {
                const decl = node as any as { initializer?: Expression } & VarDeclaration;
                const normalized = this.normalizeType(decl.varType);
                const declared = this.declareVariable(decl.identifier, normalized, decl.token);
                if (decl.initializer) {
                    const initType = this.checkExpression(decl.initializer);
                    if (declared && initType !== 'Unknown' && normalized !== 'Unknown' && initType !== normalized) {
                        const isEmptyString = decl.initializer.type === 'Literal' && (decl.initializer as LiteralExpr).value === "";
                        if (!isEmptyString) {
                            this.addDiagnostic(decl.token, `Incompatibilidade de tipos: variável '${decl.identifier}' é '${normalized}' mas inicializador é '${initType}'.`, DiagnosticSeverity.Error);
                        }
                    }
                }
                break;
            }
            case 'ExprStmt':
                this.checkExpression((node as ExpressionStatement).expression);
                break;
            case 'If':
                this.checkExpression((node as IfStatement).condition);
                this.checkStatement((node as IfStatement).thenBranch);
                if ((node as IfStatement).elseBranch) {
                    this.checkStatement((node as IfStatement).elseBranch!);
                }
                break;
            case 'While':
                this.checkExpression((node as WhileStatement).condition);
                this.checkStatement((node as WhileStatement).body);
                break;
            case 'For': {
                const forNode = node as ForStatement;
                this.pushScope();
                if (forNode.initializer) this.checkStatement(forNode.initializer);
                if (forNode.condition) this.checkExpression(forNode.condition);
                if (forNode.increment) this.checkExpression(forNode.increment);
                this.checkStatement(forNode.body);
                this.popScope();
                break;
            }
            case 'FuncDecl': {
                const func = node as FuncDeclaration;
                if (func.body) {
                    this.pushScope();
                    // parâmetros em escopo local
                    func.params.forEach(p => this.declareVariable(p.name, p.varType ? this.normalizeType(p.varType) : 'Unknown', p.token));
                    // ValRet é comum
                    const valRetToken: Token = { ...func.token, value: 'ValRet' };
                    this.declareVariable('ValRet', 'Numero', valRetToken);
                    this.checkNodes(func.body.statements);
                    this.popScope();
                }
                break;
            }
            case 'Return': {
                const ret = node as any as { value?: Expression };
                if (ret.value) {
                    const retType = this.checkExpression(ret.value);
                    if (retType !== 'Unknown' && retType !== 'Numero') {
                        this.addDiagnostic((node as any).token, `Tipo de retorno '${retType}' não corresponde ao esperado 'Numero' (ValRet).`, DiagnosticSeverity.Warning);
                    }
                }
                break;
            }
            case 'Break':
            case 'Continue':
                break;
        }
    }

    private checkAssignment(node: Assignment): string {
        const idToken: Token = { ...node.token, value: node.identifier };
        
        const leftType = this.resolveVariable(idToken);
        const rightType = this.checkExpression(node.value);

        if (leftType !== 'Unknown' && rightType !== 'Unknown' && leftType !== 'Banco/Sistema' && rightType !== 'Banco/Sistema') {
            const numericToDate = (leftType === 'Data' && rightType === 'Numero') || (leftType === 'Numero' && rightType === 'Data');
            if (leftType !== rightType && !numericToDate) {
                const isRightEmptyString = node.value.type === 'Literal' && (node.value as LiteralExpr).value === "";
                
                if (!isRightEmptyString) {
                    this.addDiagnostic(
                        node.value.token, 
                        `Incompatibilidade de tipos: Não é possível atribuir um valor do tipo '${rightType}' à variável '${node.identifier}' que é do tipo '${leftType}'.`, 
                        DiagnosticSeverity.Error
                    );
                }
            }
        }
        
        return leftType;
    }

    private checkExpression(expr: Expression): string {
        switch (expr.type) {
            case 'Assignment':
                return this.checkAssignment(expr as Assignment);
            case 'Literal':
                return this.inferLiteralType((expr as LiteralExpr).value);
            case 'Unary':
                return this.checkExpression((expr as UnaryExpr).right);
            case 'Identifier':
                return this.resolveVariable((expr as IdentifierExpr).token);
            case 'Binary': {
                const leftT = this.checkExpression((expr as BinaryExpr).left);
                const rightT = this.checkExpression((expr as BinaryExpr).right);
                const op = (expr as BinaryExpr).operator;
                if (op === '+' && (leftT === 'Alfa' || rightT === 'Alfa')) {
                    return 'Alfa';
                }
                return 'Numero';
            }
            case 'Call':
                return this.checkFunctionCall(expr as CallExpr);
            default:
                return 'Unknown';
        }
    }

    private inferLiteralType(value: any): string {
        if (typeof value === 'number') return 'Numero';
        if (typeof value === 'string') return 'Alfa';
        return 'Unknown';
    }

    private resolveVariable(token: Token): string {
        const lowerName = token.value.toLowerCase();
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            const scope = this.scopes[i];
            if (scope.has(lowerName)) return scope.get(lowerName)!.type;
        }

        if (token.value.includes('.')) {
            return 'Unknown';
        }

        if (this.isSeniorImplicitVariable(token.value)) {
            return 'Banco/Sistema';
        }

        // Variável implícita no escopo atual
        const info = { type: 'Numero', token };
        this.currentScope().set(lowerName, info);
        this.variables.set(lowerName, info);
        return 'Numero';
    }

    private checkFunctionCall(node: CallExpr): string {
        const funcName = node.callee.toLowerCase();
        
        const nativeFuncKey = Object.keys(funcoesNativas).find(k => k.toLowerCase() === funcName);
        
        if (nativeFuncKey) {
            const nativeDef = funcoesNativas[nativeFuncKey];
            if (node.args.length !== nativeDef.parametros.length) {
                this.addDiagnostic(node.token, `A função '${nativeFuncKey}' espera ${nativeDef.parametros.length} parâmetros, mas recebeu ${node.args.length}.`, DiagnosticSeverity.Error);
            }
            nativeDef.parametros.forEach((param, idx) => {
                if (param.byRef) {
                    const arg = node.args[idx];
                    if (!arg || arg.type !== 'Identifier') {
                        this.addDiagnostic(node.token, `Parâmetro '${param.nome}' deve ser passado por referência (variável).`, DiagnosticSeverity.Error);
                    }
                }
            });
            return 'FuncaoNativa';
        }

        if (this.functions.has(funcName)) {
            const userFunc = this.functions.get(funcName)!;
            if (node.args.length !== userFunc.paramCount) {
                this.addDiagnostic(node.token, `A função '${node.callee}' espera ${userFunc.paramCount} parâmetros.`, DiagnosticSeverity.Error);
            }
            userFunc.params.forEach((param, idx) => {
                if (param.byRef && node.args[idx] && node.args[idx].type !== 'Identifier') {
                    this.addDiagnostic(node.token, `Parâmetro '${param.name}' da função '${node.callee}' deve ser uma variável (by ref).`, DiagnosticSeverity.Error);
                }
            });
            return 'FuncaoUtilizador';
        }

        if (funcName.includes('.')) {
            const [objNameRaw, methodRaw] = funcName.split('.', 2);
            const objName = objNameRaw.toLowerCase();
            const method = methodRaw?.toLowerCase();
            const objType = this.variables.get(objName)?.type;

            if (objType === 'Cursor' && method) {
                if (method === 'abrircursor') {
                    this.openCursors.add(objName);
                }
                if (method === 'fecharcursor' || method === 'destruir') {
                    this.openCursors.delete(objName);
                }
            }

            if (method && objType && objType !== 'Cursor' && this.isCursorMethod(method)) {
                this.addDiagnostic(node.token, `Método de cursor '${methodRaw}' usado em variável '${objNameRaw}' que não é Cursor (${objType}).`, DiagnosticSeverity.Warning);
            }

            return 'MetodoObjeto';
        }

        this.addDiagnostic(node.token, `Função não reconhecida: '${node.callee}'.`, DiagnosticSeverity.Warning);
        return 'Unknown';
    }

    private isSeniorImplicitVariable(name: string): boolean {
        if (/^(USU_T[A-Za-z0-9_]+|[A-Za-z][0-9]{3}[A-Za-z]{3})\.[A-Za-z0-9_]+$/i.test(name)) return true;
        if (/^VS[A-Za-z0-9_]+$/i.test(name)) return true;
        if (/\.(SQL|AbrirCursor|FecharCursor|Achou|NaoAchou|Proximo|EOF|Destruir|Primeiro|FDA)$/i.test(name)) return true;

        return false;
    }

    private addDiagnostic(token: Token, message: string, severity: DiagnosticSeverity) {
        const range: TextRange = {
            startLine: token.line,
            startColumn: token.column,
            endLine: token.line,
            endColumn: token.column + Math.max(1, token.value.length)
        };
        this.diagnostics.push(new CompilerDiagnostic(range, message, severity));
    }

    private isCursorMethod(method: string): boolean {
        const m = method.toLowerCase();
        return ['sql','abrircursor','fecharcursor','achou','naoachou','proximo','eof','destruir'].includes(m);
    }

    // ==========================================
    // ESCOPO
    // ==========================================
    private currentScope(): Map<string, { type: string, token: Token, isSystemVariable?: boolean }> {
        if (this.scopes.length === 0) {
            this.scopes.push(new Map());
        }
        return this.scopes[this.scopes.length - 1];
    }

    private pushScope(): void {
        this.scopes.push(new Map());
    }

    private popScope(): void {
        if (this.scopes.length > 0) {
            this.scopes.pop();
        }
    }

    private declareVariable(name: string, type: string, token: Token): boolean {
        const lower = name.toLowerCase();
        const scope = this.currentScope();
        if (scope.has(lower) && !scope.get(lower)!.isSystemVariable) {
            this.addDiagnostic(token, `Variável '${name}' já declarada neste escopo.`, DiagnosticSeverity.Error);
            return false;
        }
        const info = { type, token };
        scope.set(lower, info);
        this.variables.set(lower, info);
        return true;
    }
}