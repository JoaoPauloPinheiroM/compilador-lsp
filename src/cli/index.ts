import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from '../core/lexer/lexer';
import { Parser } from '../core/parser/parser';
import { SemanticAnalyzer } from '../core/analyzer/analyzer';
import { Interpreter } from '../core/interpreter/interpreter';
import { Transpiler } from '../core/transpiler/transpiler';
import { DiagnosticSeverity } from '../core/diagnostics/compilerDiagnostic';

function main() {
    // Apanha os argumentos passados no terminal (ignora o 'node' e o nome do script)
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.error("Uso: node out/cli/index.js <arquivo.lsp> [--out saida.js] [--no-run]");
        process.exit(1);
    }

    const filePath = path.resolve(process.cwd(), args[0]);
    const outFlagIndex = args.indexOf('--out');
    let outFile: string | undefined;
    if (outFlagIndex >= 0) {
        if (outFlagIndex + 1 >= args.length) {
            console.error("Erro: '--out' requer um caminho de saída.");
            process.exit(1);
        }
        outFile = path.resolve(process.cwd(), args[outFlagIndex + 1]);
    }
    const shouldRun = !args.includes('--no-run');
    
    if (!fs.existsSync(filePath)) {
        console.error(`Erro: Ficheiro não encontrado em '${filePath}'`);
        process.exit(1);
    }

    // Lê o código fonte da regra LSP
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    console.log(`\n⚙️ A compilar: ${path.basename(filePath)}...\n`);

    // ==========================================
    // 1. ANÁLISE LÉXICA
    // ==========================================
    const lexer = new Lexer(sourceCode);
    const { tokens, diagnostics: lexerDiagnostics } = lexer.tokenize();

    // ==========================================
    // 2. ANÁLISE SINTÁTICA (AST)
    // ==========================================
    const parser = new Parser(tokens);
    const { ast, diagnostics: parserDiagnostics } = parser.getAST();

    // ==========================================
    // 3. ANÁLISE SEMÂNTICA (Type Checking)
    // ==========================================
    const analyzer = new SemanticAnalyzer(ast);
    const semanticDiagnostics = analyzer.analyze();

    // ==========================================
    // CONSOLIDAÇÃO DE DIAGNÓSTICOS
    // ==========================================
    const allDiagnostics = [...lexerDiagnostics, ...parserDiagnostics, ...semanticDiagnostics];
    const errors = allDiagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
    const warnings = allDiagnostics.filter(d => d.severity === DiagnosticSeverity.Warning);

    // Se houver Erros, aborta a compilação
    if (errors.length > 0) {
        console.error("❌ Falha na compilação. Foram encontrados os seguintes erros:");
        errors.forEach(err => console.error(`   ${err.toString()}`));
        process.exit(1);
    }

    // Apenas emite avisos se houver
    if (warnings.length > 0) {
        console.warn("⚠️ Avisos de compilação:");
        warnings.forEach(warn => console.warn(`   ${warn.toString()}`));
    }

    // ==========================================
    // 4. TRANSPILAÇÃO OPCIONAL PARA JS
    // ==========================================
    if (outFile) {
        const transpiler = new Transpiler(ast);
        const { code } = transpiler.transpile();
        fs.writeFileSync(outFile, code, 'utf-8');
        console.log(`📦 Código JS gerado em: ${outFile}`);
    }

    if (!shouldRun) {
        console.log('✅ Compilação concluída (execução pulada por --no-run).');
        return;
    }

    console.log("✅ Compilação bem-sucedida! A iniciar execução...\n");
    console.log("-------------------------------------------------");

    // ==========================================
    // 5. EXECUÇÃO (INTERPRETADOR / VM)
    // ==========================================
    const interpreter = new Interpreter();
    
    try {
        interpreter.interpret(ast);
        console.log("-------------------------------------------------");
        console.log("🏁 Execução concluída com sucesso.");
        
        // Imprime a memória final para debug
        interpreter.printMemory();
    } catch (runtimeError: any) {
        console.log("-------------------------------------------------");
        console.error(`💥 Erro em Tempo de Execução (Runtime Error):`);
        console.error(`   ${runtimeError.message}`);
        process.exit(1);
    }
}

// Inicia a aplicação
main();