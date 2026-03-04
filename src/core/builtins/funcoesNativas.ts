export type NativeType = 'Numero' | 'Alfa' | 'Data' | 'Cursor' | 'Tabela' | 'Lista' | 'Any';

export interface NativeParam {
	nome: string;
	tipo: NativeType;
	byRef?: boolean;
}

export interface NativeCallArg {
	value: any;
	ref?: { get(): any; set: (value: any) => void };
}

export interface FuncaoNativa {
	parametros: NativeParam[];
	descricao: string;
	execute: (args: NativeCallArg[]) => any;
}

const stub = (parametros: NativeParam[], descricao: string): FuncaoNativa => ({ parametros, descricao, execute: () => undefined });

// Conjunto mínimo de funções nativas suportadas pela VM.
export const funcoesNativas: Record<string, FuncaoNativa> = {
	Mensagem: {
		parametros: [
			{ nome: 'tipo', tipo: 'Alfa' },
			{ nome: 'mensagem', tipo: 'Alfa' }
		],
		descricao: 'Apresenta mensagem no terminal (Retorna/Erro/Info).',
		execute: (args) => {
			const [tipo, msg] = args.map(a => a.value);
			// Saída simples para o console; em ambiente ERP seria um popup.
			console.log(`\n💬 [MENSAGEM - ${tipo}]: ${msg}`);
			return undefined;
		}
	},

	IntParaAlfa: {
		parametros: [
			{ nome: 'origem', tipo: 'Numero' },
			{ nome: 'destino', tipo: 'Alfa', byRef: true }
		],
		descricao: 'Converte número para texto, gravando no parâmetro de saída.',
		execute: (args) => {
			const valorTexto = String(args[0]?.value ?? '');
			if (args[1]?.ref) {
				args[1].ref.set(valorTexto);
			}
			return valorTexto;
		}
	},

	LimpaEspacos: {
		parametros: [
			{ nome: 'texto', tipo: 'Alfa', byRef: true }
		],
		descricao: 'Remove espaços em branco no início e fim da string (trim).',
		execute: (args) => {
			const atual = String(args[0]?.ref ? args[0].ref.get() : args[0]?.value ?? '');
			const limpo = atual.trim();
			if (args[0]?.ref) args[0].ref.set(limpo);
			return limpo;
		}
	},

	TamanhoAlfa: {
		parametros: [
			{ nome: 'texto', tipo: 'Alfa' }
		],
		descricao: 'Retorna o comprimento da string.',
		execute: (args) => {
			const texto = String(args[0]?.value ?? '');
			return texto.length;
		}
	},

	ConverteMascara: {
		parametros: [
			{ nome: 'tipo', tipo: 'Numero' },
			{ nome: 'origem', tipo: 'Numero' },
			{ nome: 'destino', tipo: 'Alfa', byRef: true },
			{ nome: 'mascara', tipo: 'Alfa' }
		],
		descricao: 'Converte um valor numérico aplicando máscara e grava no destino.',
		execute: (args) => {
			const valor = args[1]?.value ?? 0;
			const mascara = args[3]?.value ?? '';
			// Implementação simplificada: apenas concatena valor e máscara
			const resultado = `${valor}${mascara ? ' ' + mascara : ''}`;
			if (args[2]?.ref) {
				args[2].ref.set(resultado);
			}
			return resultado;
		}
	},

	// -------- Funções de Banco de Dados, SQL e Cursores --------
	CriaView: stub([
		{ nome: 'SQL', tipo: 'Alfa' },
		{ nome: 'NomeView', tipo: 'Alfa', byRef: true }
	], 'Cria uma View temporária no banco para otimizar execução de relatórios.'),
	DateToDB: stub([
		{ nome: 'Date', tipo: 'Numero' },
		{ nome: 'Native', tipo: 'Numero' },
		{ nome: 'DateAlfa', tipo: 'Alfa', byRef: true }
	], 'Converte data para formato alfa compatível com o banco.'),
	ExecutarComandoSQL: stub([
		{ nome: 'pComando', tipo: 'Alfa' },
		{ nome: 'pParalela', tipo: 'Alfa' },
		{ nome: 'pLinhasAfetadas', tipo: 'Numero', byRef: true },
		{ nome: 'pResultado', tipo: 'Alfa', byRef: true }
	], 'Executa comando INSERT/UPDATE direto no banco.'),
	RetornaCampoAlfaTabela: stub([
		{ nome: 'NomeCampo', tipo: 'Alfa' },
		{ nome: 'NomeTabelaView', tipo: 'Alfa' },
		{ nome: 'OpcionalWhere', tipo: 'Alfa' },
		{ nome: 'pRetorno', tipo: 'Alfa', byRef: true },
		{ nome: 'pAchou', tipo: 'Numero', byRef: true }
	], 'Busca campo alfa em view temporária.'),
	RetornaCampoNumeroTabela: stub([
		{ nome: 'NomeCampo', tipo: 'Alfa' },
		{ nome: 'NomeTabelaView', tipo: 'Alfa' },
		{ nome: 'OpcionalWhere', tipo: 'Alfa' },
		{ nome: 'pRetorno', tipo: 'Numero', byRef: true },
		{ nome: 'pAchou', tipo: 'Numero', byRef: true }
	], 'Busca campo numérico em view temporária.'),
	RowNum: stub([
		{ nome: 'pLinhas', tipo: 'Numero' },
		{ nome: 'pPosicao', tipo: 'Alfa' },
		{ nome: 'pInsAnd', tipo: 'Alfa' },
		{ nome: 'pCmdRet', tipo: 'Alfa', byRef: true }
	], 'Retorna trecho SQL para limitar linhas conforme o banco.'),
	SelecaoTabelas: stub([
		{ nome: 'pSqlSel', tipo: 'Alfa' },
		{ nome: 'pCpoRet', tipo: 'Alfa', byRef: true },
		{ nome: 'pTemMas', tipo: 'Alfa', byRef: true }
	], 'Executa SELECT complexo e retorna em variável Alfa.'),
	SetarFiltroSql: stub([
		{ nome: 'aTabela', tipo: 'Alfa' },
		{ nome: 'aCampo', tipo: 'Alfa' },
		{ nome: 'aFiltro', tipo: 'Alfa' }
	], 'Define filtro SQL personalizado em tabelas.'),

	// -------- Gerador de Relatórios --------
	AdicionaDadosGrade: stub([
		{ nome: 'ControlName', tipo: 'Alfa' },
		{ nome: 'Linha', tipo: 'Numero' },
		{ nome: 'Coluna', tipo: 'Numero' },
		{ nome: 'Texto', tipo: 'Alfa' }
	], 'Seta texto em posição de grade do relatório.'),
	AlteraControle: stub([
		{ nome: 'NomeControle', tipo: 'Alfa' },
		{ nome: 'Propriedade', tipo: 'Alfa' },
		{ nome: 'Parametro', tipo: 'Alfa' }
	], 'Altera propriedades visuais de controle de relatório.'),
	AlteraValorFormula: stub([
		{ nome: 'NomeFormula', tipo: 'Alfa' },
		{ nome: 'Valor', tipo: 'Numero' }
	], 'Altera valor de fórmula (variável de regra).'),
	CancelarRelatorio: stub([], 'Cancela a geração do relatório em execução.'),
	CarregaImagemControle: stub([
		{ nome: 'NomeControle', tipo: 'Alfa' },
		{ nome: 'ArquivoOuBanco', tipo: 'Numero' },
		{ nome: 'CaminhoOuCampo', tipo: 'Alfa' },
		{ nome: 'SQL', tipo: 'Alfa' }
	], 'Carrega imagem BMP/JPG em controle de relatório.'),
	CarregaImgControle: stub([
		{ nome: 'NomeControleImagem', tipo: 'Alfa' },
		{ nome: 'Origem', tipo: 'Numero' },
		{ nome: 'CaminhoCampoNome', tipo: 'Alfa' },
		{ nome: 'SQL', tipo: 'Alfa' },
		{ nome: 'SqlSenior2', tipo: 'Numero' }
	], 'Carrega imagem de banco/arquivo/variável em controle de imagem.'),
	CarregaImgVetorialControle: stub([
		{ nome: 'NomeControleImagem', tipo: 'Alfa' },
		{ nome: 'Caminho', tipo: 'Alfa' },
		{ nome: 'Xms', tipo: 'Numero' },
		{ nome: 'Xmx', tipo: 'Numero' }
	], 'Carrega imagem vetorial DXF em controle.'),
	CodigoEspNivel: stub([
		{ nome: 'Nivel', tipo: 'Numero' },
		{ nome: 'CodigoNivel', tipo: 'Alfa', byRef: true }
	], 'Retorna código especial do nível de quebra.'),
	ConfiguraPontoGrafico: stub([
		{ nome: 'ControlName', tipo: 'Alfa' },
		{ nome: 'Caractere', tipo: 'Alfa' },
		{ nome: 'TipoPonto', tipo: 'Numero' },
		{ nome: 'IndiceFigura', tipo: 'Numero' },
		{ nome: 'Interrompido', tipo: 'Numero' }
	], 'Configura ponto em gráfico de linhas.'),
	DataInicialFinal: stub([
		{ nome: 'pDatAtu', tipo: 'Data' },
		{ nome: 'pTipDat', tipo: 'Numero' },
		{ nome: 'pDatRef', tipo: 'Data' },
		{ nome: 'pDatIni', tipo: 'Data', byRef: true },
		{ nome: 'pDatFim', tipo: 'Data', byRef: true }
	], 'Calcula data início/fim de período.'),
	DeleteFieldSQL: stub([
		{ nome: 'SectionName', tipo: 'Alfa' },
		{ nome: 'TableFieldName', tipo: 'Alfa' }
	], 'Remove campo incluído no SELECT da seção.'),
	DesCamLista: stub([
		{ nome: 'TabelaCampo', tipo: 'Alfa' },
		{ nome: 'Item', tipo: 'Alfa' },
		{ nome: 'Descricao', tipo: 'Alfa', byRef: true }
	], 'Retorna descrição de campo lista.'),
	DetPrimConector: stub([
		{ nome: 'Secao', tipo: 'Alfa' },
		{ nome: 'Operador', tipo: 'Alfa' }
	], 'Define primeiro conector lógico do WHERE.'),
	InsClauSQLCampoDireto: stub([
		{ nome: 'SectionName', tipo: 'Alfa' },
		{ nome: 'Campo', tipo: 'Alfa' }
	], 'Inclui campo/expressão direta no SELECT.'),
	InsClauSQLField: stub([
		{ nome: 'SecaoDetalhe', tipo: 'Alfa' },
		{ nome: 'Variavel', tipo: 'Alfa' }
	], 'Inclui campos extras no SELECT da seção.'),
	InsClauSQLFrom: stub([
		{ nome: 'SecaoDetalhe', tipo: 'Alfa' },
		{ nome: 'Variavel', tipo: 'Alfa' }
	], 'Inclui tabela extra no FROM.'),
	InsClauSQLGroupBy: stub([
		{ nome: 'SectionName', tipo: 'Alfa' },
		{ nome: 'GroupByClau', tipo: 'Alfa' }
	], 'Insere GROUP BY customizado.'),
	InsClauSQLOrderBy: stub([
		{ nome: 'SecaoDetalhe', tipo: 'Alfa' },
		{ nome: 'Variavel', tipo: 'Alfa' }
	], 'Insere ORDER BY customizado.'),
	InsClauSQLWhere: stub([
		{ nome: 'SecaoDetalhe', tipo: 'Alfa' },
		{ nome: 'Variavel', tipo: 'Alfa' }
	], 'Insere WHERE adicionando tabelas necessárias.'),
	InsEspAlinhDireita: stub([
		{ nome: 'Valor', tipo: 'Numero' }
	], 'Insere espaços à direita no alinhamento de texto.'),
	InsSQLWhereSimples: stub([
		{ nome: 'SecaoDetalhe', tipo: 'Alfa' },
		{ nome: 'Variavel', tipo: 'Alfa' }
	], 'Insere WHERE simples sem alterar FROM.'),
	LimpaDadosGrade: stub([
		{ nome: 'ControlName', tipo: 'Alfa' }
	], 'Limpa grade (linhas/colunas/dados).'),
	LimpaDadosGrafico: stub([
		{ nome: 'ControlName', tipo: 'Alfa' }
	], 'Limpa dados de gráfico.'),
	ListaSecao: stub([
		{ nome: 'Secao', tipo: 'Alfa' }
	], 'Força listagem/impressão de seção adicional.'),
	MontarSQLHisCampo: stub([
		{ nome: 'NomeTabela', tipo: 'Alfa' },
		{ nome: 'CampoTabela', tipo: 'Alfa' },
		{ nome: 'SQLMontado', tipo: 'Alfa', byRef: true }
	], 'Monta SQL para tabelas de histórico sem sequência.'),
	MontarSQLHisCampoSeq: stub([
		{ nome: 'Tabela', tipo: 'Alfa' },
		{ nome: 'Campo', tipo: 'Alfa' },
		{ nome: 'SQLMontado', tipo: 'Alfa', byRef: true }
	], 'Monta SQL para histórico com sequência.'),
	MontarSQLHistorico: stub([
		{ nome: 'Tabela', tipo: 'Alfa' },
		{ nome: 'Data', tipo: 'Data' },
		{ nome: 'xretorno', tipo: 'Alfa', byRef: true }
	], 'Cria restrição SQL padrão para tabelas de histórico.'),
	OrdenacaoSelecionada: stub([
		{ nome: 'SelectionName', tipo: 'Alfa' },
		{ nome: 'Ordenacao', tipo: 'Alfa', byRef: true }
	], 'Retorna ordenação escolhida pelo usuário.'),
	PreenchePagina: stub([
		{ nome: 'Formato', tipo: 'Numero' },
		{ nome: 'FormatoDaLinha', tipo: 'Numero' },
		{ nome: 'GrossuraDaLinha', tipo: 'Numero' },
		{ nome: 'CorDaLinha', tipo: 'Alfa' },
		{ nome: 'CorDaTextura', tipo: 'Alfa' }
	], 'Preenche área em branco da página com rasuras/linhas.'),
	ProximaPagina: stub([
		{ nome: 'Secao', tipo: 'Alfa' },
		{ nome: 'Retorno', tipo: 'Numero', byRef: true }
	], 'Verifica antecipadamente quebra de página.'),
	SaltarPagina: stub([], 'Força um salto de página manual.'),
	SelecionaImpressora: stub([
		{ nome: 'pNomeImp', tipo: 'Alfa' }
	], 'Define impressora padrão/substituta.'),
	SubstituiFrom: stub([
		{ nome: 'SectionName', tipo: 'Alfa' },
		{ nome: 'NovaClausula', tipo: 'Alfa' },
		{ nome: 'TabelaSubstituida', tipo: 'Alfa' }
	], 'Substitui JOIN ou FROM gerado automaticamente.'),
	TruncaDadosGrade: stub([
		{ nome: 'ControlName', tipo: 'Alfa' },
		{ nome: 'Linha', tipo: 'Numero' },
		{ nome: 'Coluna', tipo: 'Numero' }
	], 'Trunca texto de célula em grade.'),
	UltimoRegistro: stub([
		{ nome: 'SecaoDetalhe', tipo: 'Alfa' },
		{ nome: 'Retorno', tipo: 'Numero', byRef: true }
	], 'Verifica se registro atual é o último da seção.'),

	// -------- ListaRegra (listas em memória) --------
	ListaRegraAddProcurarAlfa: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aColuna', tipo: 'Alfa' },
		{ nome: 'aValor', tipo: 'Alfa' },
		{ nome: 'aExecutou', tipo: 'Alfa', byRef: true }
	], 'Adiciona critério de busca (alfa) em lista em memória.'),
	ListaRegraAddProcurarData: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aColuna', tipo: 'Alfa' },
		{ nome: 'aValor', tipo: 'Data' },
		{ nome: 'aExecutou', tipo: 'Alfa', byRef: true }
	], 'Adiciona critério de busca (data) em lista.'),
	ListaRegraAddProcurarNumero: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aColuna', tipo: 'Alfa' },
		{ nome: 'aValor', tipo: 'Numero' },
		{ nome: 'aExecutou', tipo: 'Alfa', byRef: true }
	], 'Adiciona critério de busca (número) em lista.'),
	ListaRegraAddValorLinhaAlfa: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aColuna', tipo: 'Alfa' },
		{ nome: 'aValor', tipo: 'Alfa' },
		{ nome: 'aExecutou', tipo: 'Alfa', byRef: true }
	], 'Adiciona valor alfa na linha/coluna atual.'),
	ListaRegraAlterarLinhaData: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aColuna', tipo: 'Alfa' },
		{ nome: 'aValor', tipo: 'Data' },
		{ nome: 'aExecutou', tipo: 'Alfa', byRef: true }
	], 'Altera valor data na linha atual.'),
	ListaRegraAlterarLinhaNumero: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aColuna', tipo: 'Alfa' },
		{ nome: 'aValor', tipo: 'Numero' },
		{ nome: 'aExecutou', tipo: 'Alfa', byRef: true }
	], 'Altera valor numérico na linha atual.'),
	ListaRegraCarregarJson: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aJson', tipo: 'Alfa' },
		{ nome: 'aGrupo', tipo: 'Alfa' },
		{ nome: 'aCampos', tipo: 'Alfa' }
	], 'Carrega JSON para lista em memória.'),
	ListaRegraCriarLista: stub([
		{ nome: 'aLista', tipo: 'Numero', byRef: true }
	], 'Cria nova lista em memória.'),
	ListaRegraInicializarProcurar: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aExecutou', tipo: 'Alfa', byRef: true }
	], 'Reseta parâmetros de busca de lista.'),
	ListaRegraLiberarLista: stub([], 'Libera recursos da lista em memória.'),
	ListaRegraObterValorAlfa: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aColuna', tipo: 'Alfa' },
		{ nome: 'aValor', tipo: 'Alfa', byRef: true },
		{ nome: 'aObteve', tipo: 'Alfa', byRef: true }
	], 'Obtém valor alfa da posição atual.'),
	ListaRegraObterValorData: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aColuna', tipo: 'Alfa' },
		{ nome: 'aValor', tipo: 'Data', byRef: true },
		{ nome: 'aObteve', tipo: 'Alfa', byRef: true }
	], 'Obtém valor data da posição atual.'),
	ListaRegraObterValorNumero: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aColuna', tipo: 'Alfa' },
		{ nome: 'aValor', tipo: 'Numero', byRef: true },
		{ nome: 'aObteve', tipo: 'Alfa', byRef: true }
	], 'Obtém valor numérico da posição atual.'),
	ListaRegraPodeExcluir: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aPermite', tipo: 'Alfa', byRef: true }
	], 'Valida permissão para excluir linha atual.'),
	ListaRegraPosicaoAtual: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aPosicao', tipo: 'Numero', byRef: true }
	], 'Retorna índice atual da lista.'),
	ListaRegraProcurarAlfa: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aColuna', tipo: 'Alfa' },
		{ nome: 'aValor', tipo: 'Alfa' },
		{ nome: 'aExisteRegistro', tipo: 'Alfa', byRef: true }
	], 'Busca por valor alfa na lista.'),
	ListaRegraProcurarAnterior: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aExisteRegistro', tipo: 'Alfa', byRef: true }
	], 'Move ponteiro para ocorrência anterior.'),
	ListaRegraProcurarData: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aColuna', tipo: 'Alfa' },
		{ nome: 'aValor', tipo: 'Data' },
		{ nome: 'aExisteRegistro', tipo: 'Alfa', byRef: true }
	], 'Busca por valor data na lista.'),
	ListaRegraProcurarNumero: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aColuna', tipo: 'Alfa' },
		{ nome: 'aValor', tipo: 'Numero' },
		{ nome: 'aExisteRegistro', tipo: 'Alfa', byRef: true }
	], 'Busca por valor numérico na lista.'),
	ListaRegraProcurarProximo: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aExisteRegistro', tipo: 'Alfa', byRef: true }
	], 'Move ponteiro para próxima ocorrência.'),
	ListaRegraProximo: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aExecutou', tipo: 'Alfa', byRef: true }
	], 'Avança cursor da lista.'),
	ListaRegraTotalLinhas: stub([
		{ nome: 'aLista', tipo: 'Numero' },
		{ nome: 'aTotal', tipo: 'Numero', byRef: true }
	], 'Retorna total de linhas carregadas na lista.'),

	// -------- Lançamentos Contábeis / Lotes --------
	ConsistirLctoAContabilizar: stub([
		{ nome: 'xCodEmp', tipo: 'Numero' },
		{ nome: 'xAbrFil', tipo: 'Alfa' },
		{ nome: 'xDatIni', tipo: 'Data' },
		{ nome: 'xDatFim', tipo: 'Data' },
		{ nome: 'xCtaAbr', tipo: 'Alfa' },
		{ nome: 'xQtdReg', tipo: 'Numero', byRef: true }
	], 'Retorna lançamentos a contabilizar.'),
	LimpaRatOrcCtb: stub([], 'Inicializa lista interna de rateios orçamentários.'),
	LoteLctoAdicionaAuxiliar: stub([
		{ nome: 'pCtaRed', tipo: 'Numero' },
		{ nome: 'pCtaAux', tipo: 'Numero' },
		{ nome: 'pVlrLct', tipo: 'Numero' },
		{ nome: 'pCodHpd', tipo: 'Numero' },
		{ nome: 'pCplLct', tipo: 'Alfa' },
		{ nome: 'pDocLct', tipo: 'Alfa' }
	], 'Insere lançamento auxiliar (sem retorno de erro).'),
	LoteLctoAdicionaAuxiliarRet: stub([
		{ nome: 'pCtaRed', tipo: 'Numero' },
		{ nome: 'pCtaAux', tipo: 'Numero' },
		{ nome: 'pVlrLct', tipo: 'Numero' },
		{ nome: 'pCodHpd', tipo: 'Numero' },
		{ nome: 'pCplLct', tipo: 'Alfa' },
		{ nome: 'pDocLct', tipo: 'Alfa' },
		{ nome: 'pResult', tipo: 'Alfa', byRef: true }
	], 'Insere lançamento auxiliar retornando status.'),
	LoteLctoAdicionaLcto: stub([
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pDatLct', tipo: 'Numero' },
		{ nome: 'pCtaDeb', tipo: 'Numero' },
		{ nome: 'pCtaCre', tipo: 'Numero' },
		{ nome: 'pVlrLct', tipo: 'Numero' },
		{ nome: 'pCodHpd', tipo: 'Numero' },
		{ nome: 'pCplLct', tipo: 'Alfa' },
		{ nome: 'pNumFtc', tipo: 'Numero' }
	], 'Adiciona débito/crédito em memória.'),
	LoteLctoAdicionaLctoCgc: stub([
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pDatLct', tipo: 'Numero' },
		{ nome: 'pCtaDeb', tipo: 'Numero' },
		{ nome: 'pCtaCre', tipo: 'Numero' },
		{ nome: 'pVlrLct', tipo: 'Numero' },
		{ nome: 'pCodHpd', tipo: 'Numero' },
		{ nome: 'pCplLct', tipo: 'Alfa' },
		{ nome: 'pDocLct', tipo: 'Alfa' },
		{ nome: 'pObsCpl', tipo: 'Alfa' },
		{ nome: 'pCgcCpf', tipo: 'Numero' },
		{ nome: 'pCgcCre', tipo: 'Numero' },
		{ nome: 'pResult', tipo: 'Alfa', byRef: true }
	], 'Adiciona lançamento com CNPJ/CPF validado.'),
	LoteLctoAdicionaLctoDoc: stub([
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pDatLct', tipo: 'Numero' },
		{ nome: 'pCtaDeb', tipo: 'Numero' },
		{ nome: 'pCtaCre', tipo: 'Numero' },
		{ nome: 'pVlrLct', tipo: 'Numero' },
		{ nome: 'pCodHpd', tipo: 'Numero' },
		{ nome: 'pCplLct', tipo: 'Alfa' },
		{ nome: 'pDocLct', tipo: 'Alfa' }
	], 'Adiciona lançamento com número de documento.'),
	LoteLctoAdicionaLctoObs: stub([
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pDatLct', tipo: 'Numero' },
		{ nome: 'pCtaDeb', tipo: 'Numero' },
		{ nome: 'pCtaCre', tipo: 'Numero' },
		{ nome: 'pVlrLct', tipo: 'Numero' },
		{ nome: 'pCodHpd', tipo: 'Numero' },
		{ nome: 'pCplLct', tipo: 'Alfa' },
		{ nome: 'pDocLct', tipo: 'Alfa' },
		{ nome: 'pObsCpl', tipo: 'Alfa' }
	], 'Adiciona lançamento com observações.'),
	LoteLctoAdicionaLctoRet: stub([
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pDatLct', tipo: 'Numero' },
		{ nome: 'pCtaDeb', tipo: 'Numero' },
		{ nome: 'pCtaCre', tipo: 'Numero' },
		{ nome: 'pVlrLct', tipo: 'Numero' },
		{ nome: 'pCodHpd', tipo: 'Numero' },
		{ nome: 'pCplLct', tipo: 'Alfa' },
		{ nome: 'pDocLct', tipo: 'Alfa' },
		{ nome: 'pResult', tipo: 'Alfa', byRef: true }
	], 'Adiciona lançamento retornando status OK/erro.'),
	LoteLctoAdicionaRateio: stub([
		{ nome: 'vCtaRed', tipo: 'Numero' },
		{ nome: 'vCodCcu', tipo: 'Alfa' },
		{ nome: 'vPerRat', tipo: 'Numero' },
		{ nome: 'vVlrAux', tipo: 'Numero' }
	], 'Adiciona rateio em lote.'),
	LoteLctoAdicionaRateioFin: stub([
		{ nome: 'pCtaRed', tipo: 'Numero' },
		{ nome: 'pCodCcu', tipo: 'Alfa' },
		{ nome: 'pPerRat', tipo: 'Numero' },
		{ nome: 'pVlrRat', tipo: 'Numero' },
		{ nome: 'pCtaFin', tipo: 'Numero' }
	], 'Adiciona rateio com conta financeira.'),
	LoteLctoAdicionaRateioRet: stub([
		{ nome: 'pCtaRed', tipo: 'Numero' },
		{ nome: 'pCodCcu', tipo: 'Alfa' },
		{ nome: 'pPerRat', tipo: 'Numero' },
		{ nome: 'pVlrRat', tipo: 'Numero' },
		{ nome: 'pResult', tipo: 'Alfa', byRef: true }
	], 'Adiciona rateio retornando status.'),
	LoteLctoGeraLoteRet: stub([
		{ nome: 'pResult', tipo: 'Alfa', byRef: true }
	], 'Efetiva inclusões do lote no banco.'),
	LoteLctoInicializa: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pDatLot', tipo: 'Numero' },
		{ nome: 'pViaExe', tipo: 'Alfa' }
	], 'Inicializa lote contábil.'),
	LoteLctoInicializaCon: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pDatLot', tipo: 'Data' },
		{ nome: 'pViaExe', tipo: 'Alfa' }
	], 'Inicializa lote contábil com data nativa.'),
	LoteLctoInicializaDes: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pDatLot', tipo: 'Numero' },
		{ nome: 'pViaExe', tipo: 'Alfa' },
		{ nome: 'pDesLot', tipo: 'Alfa' }
	], 'Inicializa lote contábil com descrição.'),
	MontaNumLancamento: stub([
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pDatLct', tipo: 'Data' },
		{ nome: 'pIndLct', tipo: 'Numero' },
		{ nome: 'pNumLct', tipo: 'Numero', byRef: true }
	], 'Retorna próximo número sequencial de lançamento.'),
	RateioIntegracao: stub([
		{ nome: 'pOpcao', tipo: 'Alfa' },
		{ nome: 'pPosicao', tipo: 'Numero', byRef: true },
		{ nome: 'pCodCcu', tipo: 'Alfa' },
		{ nome: 'pPerRat', tipo: 'Numero' },
		{ nome: 'pVlrRat', tipo: 'Numero' }
	], 'Manipula matriz de rateios durante integração contábil.'),
	RateioIntegracaoFin: stub([
		{ nome: 'pOpcao', tipo: 'Alfa' },
		{ nome: 'pPosicao', tipo: 'Numero', byRef: true },
		{ nome: 'pCodCcu', tipo: 'Alfa' },
		{ nome: 'pPerRat', tipo: 'Numero' },
		{ nome: 'pVlrRat', tipo: 'Numero' },
		{ nome: 'pCtaFin', tipo: 'Numero' }
	], 'Manipula rateios considerando conta financeira.'),

	// -------- Saldos Contábeis / Financeiros / Rateio --------
	BuscaFiltroRateioFin: stub([
		{ nome: 'pTipoFiltro', tipo: 'Alfa' },
		{ nome: 'pContaContabil', tipo: 'Numero' },
		{ nome: 'pContaFinanceira', tipo: 'Numero' },
		{ nome: 'pProjeto', tipo: 'Numero' },
		{ nome: 'pCentroCusto', tipo: 'Alfa' },
		{ nome: 'pSqlAux', tipo: 'Alfa', byRef: true }
	], 'Monta filtro SQL de rateio financeiro conforme permissões.'),
	BuscaSaldoAntCCusto: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pFilAbr', tipo: 'Alfa' },
		{ nome: 'pCtaRed', tipo: 'Numero' },
		{ nome: 'pCodCcu', tipo: 'Alfa' },
		{ nome: 'pDatAte', tipo: 'Data' },
		{ nome: 'pDatIni', tipo: 'Data' },
		{ nome: 'pSalCcu', tipo: 'Numero', byRef: true }
	], 'Consulta saldo anterior por centro de custo.'),
	BuscaSaldoAnterior: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pCtaRed', tipo: 'Numero' },
		{ nome: 'pMesAte', tipo: 'Data' },
		{ nome: 'pSalAte', tipo: 'Numero', byRef: true }
	], 'Traz saldo inicial de conta contábil reduzida.'),
	BuscaSaldoAnteriorAbrAux: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodFil', tipo: 'Alfa' },
		{ nome: 'pCtaRed', tipo: 'Numero' },
		{ nome: 'pCtaAux', tipo: 'Numero' },
		{ nome: 'pMesAte', tipo: 'Data' },
		{ nome: 'pSalAte', tipo: 'Numero', byRef: true }
	], 'Saldo anterior unindo conta e auxiliar contábil.'),
	BuscaSaldoAnteriorHis: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodMpc', tipo: 'Numero' },
		{ nome: 'pCodFil', tipo: 'Alfa' },
		{ nome: 'pCtaRed', tipo: 'Numero' },
		{ nome: 'pMesAte', tipo: 'Data' },
		{ nome: 'pSalAte', tipo: 'Numero', byRef: true }
	], 'Saldo inicial baseado no modelo de plano.'),
	BuscaSaldoProjeto: stub([
		{ nome: 'VPos', tipo: 'Numero' },
		{ nome: 'CodEmp', tipo: 'Numero' },
		{ nome: 'NumPrj', tipo: 'Numero' },
		{ nome: 'CodFpj', tipo: 'Numero' },
		{ nome: 'RotPpj', tipo: 'Numero' },
		{ nome: 'CtaFin', tipo: 'Numero' },
		{ nome: 'CodCcu', tipo: 'Alfa' },
		{ nome: 'MesAno', tipo: 'Data' },
		{ nome: 'SalEnt', tipo: 'Numero', byRef: true },
		{ nome: 'SalSai', tipo: 'Numero', byRef: true },
		{ nome: 'OrcEntI', tipo: 'Numero', byRef: true },
		{ nome: 'OrcEntF', tipo: 'Numero', byRef: true },
		{ nome: 'OrcSaiI', tipo: 'Numero', byRef: true },
		{ nome: 'OrcSaiF', tipo: 'Numero', byRef: true },
		{ nome: 'AnaSin_CurConta', tipo: 'Numero' }
	], 'Retorna ponteiros de saldos orçados/realizados de projetos.'),
	CarregaSaldoAnteriorProjeto: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Carrega totais anteriores no plano de projetos.'),
	CarregaSaldoContabilAux: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Monta hierarquia de saldos contábeis com auxiliares na RAM.'),
	CarregaSaldoProjeto: stub([
		{ nome: 'CodEmp', tipo: 'Numero' },
		{ nome: 'NumPrj', tipo: 'Numero' },
		{ nome: 'CodFpj', tipo: 'Numero' },
		{ nome: 'RotPpj', tipo: 'Numero' },
		{ nome: 'CtaFin', tipo: 'Numero' },
		{ nome: 'CodCcu', tipo: 'Alfa' },
		{ nome: 'DatIni', tipo: 'Data' },
		{ nome: 'DatFim', tipo: 'Data' },
		{ nome: 'TipoA', tipo: 'Alfa' },
		{ nome: 'TipoB', tipo: 'Alfa' },
		{ nome: 'TipoC', tipo: 'Alfa' },
		{ nome: 'TipoD', tipo: 'Alfa' }
	], 'Inicializa matriz de balanços financeiros de projetos.'),
	LimparEstruturaSaldoCcu: stub([], 'Remove matriz de centros de custo da memória.'),
	LiberaSaldoProjeto: stub([], 'Libera alocações da API de projetos financeiros.'),
	MontaSaldoAntData: stub([
		{ nome: 'ECodEmp', tipo: 'Numero' },
		{ nome: 'Abr', tipo: 'Alfa' },
		{ nome: 'ENumCta', tipo: 'Numero' },
		{ nome: 'PDatIni', tipo: 'Data' },
		{ nome: 'Ind', tipo: 'Numero' },
		{ nome: 'FVlrSal', tipo: 'Numero', byRef: true }
	], 'Consulta saldo resumido de conta em data limite.'),
	MontaSaldoAnteriorCliente: stub([
		{ nome: 'pCodCli', tipo: 'Alfa' },
		{ nome: 'pDatIni', tipo: 'Data' },
		{ nome: 'pSalCli', tipo: 'Numero', byRef: true }
	], 'Calcula posição de inadimplência até data.'),
	MontaSaldoAnteriorFornecedor: stub([
		{ nome: 'pCodFor', tipo: 'Alfa' },
		{ nome: 'pDatIni', tipo: 'Data' },
		{ nome: 'pSalFor', tipo: 'Numero', byRef: true }
	], 'Calcula posição pendente de fornecedor até data.'),
	OrcamentoCtaCtbAtualizarCtaPai: stub([], 'Sobe valores orçados das contas filhas para conta pai.'),
	OrcamentoCtaCtbIniciarMemoria: stub([], 'Instancia lista virtual para orçamento contábil.'),
	OrcamentoCtaCtbLiberarMemoria: stub([], 'Libera objetos virtualizados de orçamento.'),
	OrcamentoCtaCtbPreencherMemoria: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pMesAno', tipo: 'Numero' },
		{ nome: 'pCtaRed', tipo: 'Numero' },
		{ nome: 'pVlrOrc', tipo: 'Numero' }
	], 'Preenche valores na tabela virtual de orçamento.'),
	RetornarSaldoCcu: stub([
		{ nome: 'pCtaRed', tipo: 'Numero' },
		{ nome: 'pCodCcu', tipo: 'Alfa' },
		{ nome: 'pSalAnt', tipo: 'Numero', byRef: true }
	], 'Busca saldo consolidado de Conta vs Centro de Custo.'),
	SaldoAnteriorCliente: stub([
		{ nome: 'pDatBas', tipo: 'Numero' },
		{ nome: 'pCodCli', tipo: 'Alfa' },
		{ nome: 'pCodEmp', tipo: 'Alfa' },
		{ nome: 'pCodFil', tipo: 'Alfa' },
		{ nome: 'pCodPor', tipo: 'Alfa' },
		{ nome: 'pCodCrt', tipo: 'Alfa' },
		{ nome: 'pCodMoe', tipo: 'Alfa' },
		{ nome: 'pCodRep', tipo: 'Alfa' },
		{ nome: 'pCodTpt', tipo: 'Alfa' },
		{ nome: 'pCodTns', tipo: 'Alfa' },
		{ nome: 'pCodCrp', tipo: 'Alfa' },
		{ nome: 'pNumTit', tipo: 'Alfa' },
		{ nome: 'pSalCli', tipo: 'Numero', byRef: true }
	], 'Busca saldos em aberto de clientes com filtros.'),
	SaldoAnteriorFornecedor: stub([
		{ nome: 'pDatBas', tipo: 'Numero' },
		{ nome: 'pCodFor', tipo: 'Alfa' },
		{ nome: 'pCodEmp', tipo: 'Alfa' },
		{ nome: 'pCodFil', tipo: 'Alfa' },
		{ nome: 'pCodPor', tipo: 'Alfa' },
		{ nome: 'pCodCrt', tipo: 'Alfa' },
		{ nome: 'pCodMoe', tipo: 'Alfa' },
		{ nome: 'pCodRep', tipo: 'Alfa' },
		{ nome: 'pCodTpt', tipo: 'Alfa' },
		{ nome: 'pCodTns', tipo: 'Alfa' },
		{ nome: 'pCodCrp', tipo: 'Alfa' },
		{ nome: 'pNumTit', tipo: 'Alfa' },
		{ nome: 'pSalFor', tipo: 'Numero', byRef: true }
	], 'Busca saldos em aberto de fornecedores com filtros.'),
	SaldoCompleto: stub([
		{ nome: 'pCtaRed', tipo: 'Numero' },
		{ nome: 'pDebMes', tipo: 'Numero', byRef: true },
		{ nome: 'pCreMes', tipo: 'Numero', byRef: true },
		{ nome: 'pSalMes', tipo: 'Numero', byRef: true }
	], 'Resumo de débitos/créditos do ano/mês.'),
	SaldoContabilCompleto: stub([
		{ nome: 'xCtaRed', tipo: 'Numero' },
		{ nome: 'xCodCcu', tipo: 'Alfa' },
		{ nome: 'xDatSal', tipo: 'Data' },
		{ nome: 'xDebMes', tipo: 'Numero', byRef: true },
		{ nome: 'xCreMes', tipo: 'Numero', byRef: true },
		{ nome: 'xSalCta', tipo: 'Numero', byRef: true },
		{ nome: 'xSalAntCta', tipo: 'Numero', byRef: true }
	], 'Processa livro razão unindo saldos anteriores e movimentos.'),
	SaldoMes: stub([
		{ nome: 'pCtaRed', tipo: 'Numero' },
		{ nome: 'pDebMes', tipo: 'Numero', byRef: true },
		{ nome: 'pCreMes', tipo: 'Numero', byRef: true },
		{ nome: 'pSalMes', tipo: 'Numero', byRef: true }
	], 'Resumo mensal de conta contábil.'),
	SaldoProjeto: stub([
		{ nome: 'p1', tipo: 'Numero', byRef: true },
		{ nome: 'p2', tipo: 'Numero', byRef: true },
		{ nome: 'p3', tipo: 'Numero', byRef: true },
		{ nome: 'p4', tipo: 'Numero', byRef: true },
		{ nome: 'p5', tipo: 'Numero', byRef: true },
		{ nome: 'p6', tipo: 'Numero', byRef: true },
		{ nome: 'p7', tipo: 'Alfa', byRef: true },
		{ nome: 'p8', tipo: 'Numero', byRef: true },
		{ nome: 'p9', tipo: 'Numero', byRef: true },
		{ nome: 'p10', tipo: 'Numero', byRef: true },
		{ nome: 'p11', tipo: 'Numero', byRef: true },
		{ nome: 'pC12', tipo: 'Numero', byRef: true },
		{ nome: 'pC13', tipo: 'Numero', byRef: true },
		{ nome: 'p14', tipo: 'Numero', byRef: true }
	], 'Retorna estatísticas financeiras orçadas/realizadas do projeto.'),
	TotalContasCentroCusto: stub([
		{ nome: 'ContaFinanceira', tipo: 'Numero' },
		{ nome: 'ContaContabil', tipo: 'Numero' },
		{ nome: 'CentroCusto', tipo: 'Alfa' },
		{ nome: 'Total', tipo: 'Numero', byRef: true }
	], 'Resumo total por centro de custo.'),
	TotalRateado: stub([
		{ nome: 'Projeto', tipo: 'Numero' },
		{ nome: 'Fase', tipo: 'Numero' },
		{ nome: 'ContaFinanceira', tipo: 'Numero' },
		{ nome: 'ContaContabil', tipo: 'Numero' },
		{ nome: 'CentroCusto', tipo: 'Alfa' },
		{ nome: 'Total', tipo: 'Numero', byRef: true }
	], 'Somatória genérica de rateios distribuídos.'),
	VisaoContabil_Linha_Rotulo: stub([
		{ nome: 'NumLin', tipo: 'Numero' },
		{ nome: 'IndRot', tipo: 'Numero', byRef: true }
	], 'Informa se linha é apenas agrupador estético.'),
	VisaoContabil_Nivel_Conta: stub([
		{ nome: 'NumLin', tipo: 'Numero' },
		{ nome: 'NivCta', tipo: 'Numero', byRef: true }
	], 'Retorna nível de indentação no plano hierárquico.'),

	// -------- Logística / Produção / Suprimentos / Vendas --------
	AdicionaConsumoComponente: stub([
		{ nome: 'CodMod', tipo: 'Alfa' },
		{ nome: 'CodEtg', tipo: 'Numero' },
		{ nome: 'SeqMod', tipo: 'Numero' },
		{ nome: 'CodDer', tipo: 'Alfa' },
		{ nome: 'CodCmp', tipo: 'Alfa' },
		{ nome: 'DerCmp', tipo: 'Alfa' },
		{ nome: 'QtdUti', tipo: 'Numero' },
		{ nome: 'PerPrd', tipo: 'Numero' },
		{ nome: 'QtdFrq', tipo: 'Numero' }
	], 'Grava componente em modelo de engenharia.'),
	ApontarOPs: stub([
		{ nome: 'aParam', tipo: 'Alfa' },
		{ nome: 'aRet', tipo: 'Alfa', byRef: true }
	], 'Simula tela de apontamento fabril.'),
	AtualizaEmbalagensNF: stub([
		{ nome: 'FCodEmp', tipo: 'Numero' },
		{ nome: 'FCodFil', tipo: 'Numero' },
		{ nome: 'Serie', tipo: 'Alfa' },
		{ nome: 'FNumNfv', tipo: 'Numero' },
		{ nome: 'FQtdemb', tipo: 'Numero' },
		{ nome: 'NumEmb', tipo: 'Alfa' },
		{ nome: 'FpesLiq', tipo: 'Numero' },
		{ nome: 'FPesBru', tipo: 'Numero' }
	], 'Recalcula pesos em embalagem expedida.'),
	AtualizarPesosPFA: stub([
		{ nome: 'CodEmp', tipo: 'Numero' },
		{ nome: 'CodFil', tipo: 'Numero' },
		{ nome: 'NumAne', tipo: 'Numero' },
		{ nome: 'NumPfa', tipo: 'Numero' }
	], 'Atualiza volumes da pré-fatura.'),
	AtualizarSituacao_PFA_PES: stub([
		{ nome: 'CodEmp', tipo: 'Numero' },
		{ nome: 'CodFil', tipo: 'Numero' },
		{ nome: 'NumAne', tipo: 'Numero' },
		{ nome: 'NumPfa', tipo: 'Numero' },
		{ nome: 'SitPfa', tipo: 'Numero' }
	], 'Altera situação física do picking (pré-fatura).'),
	BaixarComponentes: stub([
		{ nome: 'pParametros', tipo: 'Alfa' },
		{ nome: 'pRetorno', tipo: 'Alfa', byRef: true }
	], 'Executa requisição de estoque deduzindo depósitos.'),
	BuscaFilialTituloCP: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pNumTit', tipo: 'Alfa' },
		{ nome: 'pCodTpt', tipo: 'Alfa' },
		{ nome: 'pCodFor', tipo: 'Numero' },
		{ nome: 'pVlrTit', tipo: 'Numero', byRef: true }
	], 'Amarra filial correta ao baixar CNAB.'),
	BuscaVlrCccProduto: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Pesquisa valor indexado de custo fixo/imposto.'),
	CancelarOP: stub([
		{ nome: 'vCodOri', tipo: 'Alfa' },
		{ nome: 'vNumOrp', tipo: 'Numero' },
		{ nome: 'Retorno', tipo: 'Alfa', byRef: true }
	], 'Cancela OP zerando lotes e requisições.'),
	CancelarProducao: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Estorna produção da OP.'),
	CalculaPrecoProRata: stub([
		{ nome: 'pPreUni', tipo: 'Numero' },
		{ nome: 'pIniVig', tipo: 'Numero' },
		{ nome: 'pFimVig', tipo: 'Numero' },
		{ nome: 'pCptFat', tipo: 'Numero' },
		{ nome: 'pDatAux', tipo: 'Numero' },
		{ nome: 'pCriFtc', tipo: 'Numero' },
		{ nome: 'pProRat', tipo: 'Alfa' }
	], 'Calcula valor pro rata de contrato.'),
	ComposicaoProduto: stub([
		{ nome: 'pCodPro', tipo: 'Alfa' },
		{ nome: 'pCodDer', tipo: 'Alfa' },
		{ nome: 'pQtdInf', tipo: 'Numero' },
		{ nome: 'pUniEst', tipo: 'Alfa' },
		{ nome: 'pDecPro', tipo: 'Alfa' },
		{ nome: 'pDecMon', tipo: 'Alfa' },
		{ nome: 'pDelMon', tipo: 'Alfa' },
		{ nome: 'pLmpLis', tipo: 'Alfa' },
		{ nome: 'pJunDer', tipo: 'Alfa' },
		{ nome: 'pTipDes', tipo: 'Alfa' }
	], 'Explosão multinível de componentes.'),
	ComposicaoProduto_2: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Explosão com limitação de níveis/filial/identificador.'),
	ComposicaoProduto_3: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Explosão indicando componentes exclusivos.'),
	ComposicaoProduto_4: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Explosão permitindo abortar em produtos inativos.'),
	ConsiderarItemContrato: stub([
		{ nome: 'pDatCpt', tipo: 'Numero' },
		{ nome: 'pDatUft', tipo: 'Numero' },
		{ nome: 'pDatIni', tipo: 'Numero' },
		{ nome: 'pDiaPar', tipo: 'Numero' },
		{ nome: 'pDiaBas', tipo: 'Numero' }
	], 'Verifica se competência inclui mensalidade.'),
	CorrigeSaldoporDeposito: stub([
		{ nome: 'pEmpresa', tipo: 'Numero' },
		{ nome: 'pFilial', tipo: 'Numero' },
		{ nome: 'pProduto', tipo: 'Alfa' },
		{ nome: 'pDerivacao', tipo: 'Alfa' },
		{ nome: 'pDeposito', tipo: 'Alfa' },
		{ nome: 'pOrigem', tipo: 'Alfa' },
		{ nome: 'pFamilia', tipo: 'Alfa' },
		{ nome: 'pDataIni', tipo: 'Data' },
		{ nome: 'pDataFin', tipo: 'Data' }
	], 'Recomposição de estoques por local.'),
	CorrigeSaldoporFilial: stub([
		{ nome: 'pEmpresa', tipo: 'Numero' },
		{ nome: 'pFilial', tipo: 'Numero' },
		{ nome: 'pProduto', tipo: 'Alfa' },
		{ nome: 'pDerivacao', tipo: 'Alfa' },
		{ nome: 'pDeposito', tipo: 'Alfa' },
		{ nome: 'pOrigem', tipo: 'Alfa' },
		{ nome: 'pFamilia', tipo: 'Alfa' },
		{ nome: 'pDataIni', tipo: 'Data' },
		{ nome: 'pDataFin', tipo: 'Data' }
	], 'Recomposição geral por filial.'),
	CriaNovoModelo: stub([
		{ nome: 'CodMod', tipo: 'Alfa' },
		{ nome: 'DesMod', tipo: 'Alfa' },
		{ nome: 'CodFam', tipo: 'Alfa' },
		{ nome: 'QtdBas', tipo: 'Numero' },
		{ nome: 'SitMod', tipo: 'Alfa' }
	], 'Define modelo provisório na produção.'),
	CriarEstoque: stub([
		{ nome: 'Produto', tipo: 'Alfa' },
		{ nome: 'Derivacao', tipo: 'Alfa' },
		{ nome: 'Deposito', tipo: 'Alfa' }
	], 'Insere registro principal de estoque E210EST.'),
	DefinirCategoriaPedidoWms: stub([
		{ nome: 'CodEmp', tipo: 'Numero' },
		{ nome: 'CodFil', tipo: 'Numero' },
		{ nome: 'NumPed', tipo: 'Numero' },
		{ nome: 'CatCli', tipo: 'Numero' },
		{ nome: 'MsgErro', tipo: 'Alfa', byRef: true }
	], 'Atribui urgência para integração WMS.'),
	DisponibilizarPF_Faturar: stub([
		{ nome: 'CodEmp', tipo: 'Numero' },
		{ nome: 'CodFil', tipo: 'Numero' },
		{ nome: 'NumAne', tipo: 'Numero' },
		{ nome: 'NumPfa', tipo: 'Numero' },
		{ nome: 'SitPfa', tipo: 'Numero', byRef: true }
	], 'Finaliza análise de embarque e engatilha volume para NF.'),
	ForcarFimEstagioOperacao: stub([
		{ nome: 'pParametros', tipo: 'Alfa' },
		{ nome: 'pRetorno', tipo: 'Alfa', byRef: true }
	], 'Baixa tempo e encerra estágio atual da fabricação.'),
	Fun_CancelaSaldoRequisicoes: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Zera saldo aberto de requisições de OPs canceladas.'),
	GeraNumeracaoSerie: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Gera seriais automáticos na E075SRI.'),
	GeraObsPfa: stub([
		{ nome: 'aCodEmp', tipo: 'Numero' },
		{ nome: 'aCodFil', tipo: 'Numero' },
		{ nome: 'aNumAne', tipo: 'Numero' },
		{ nome: 'aNumPfa', tipo: 'Numero' },
		{ nome: 'aTipInf', tipo: 'Numero' },
		{ nome: 'aObservacao', tipo: 'Alfa' }
	], 'Inclui observações logísticas em massa.'),
	GeraTabFicha2: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Simulação de custos de produção (versão 2).'),
	GeraTabFicha3: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Simulação de custos com margem (versão 3).'),
	GerarOP: stub([
		{ nome: 'pParam', tipo: 'Alfa' },
		{ nome: 'Retorno', tipo: 'Alfa', byRef: true }
	], 'Cria Ordem de Produção via parâmetros.'),
	Gerar_Log_Analise: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Grava trilha de auditoria de separação.'),
	Gerar_Log_NotaSaida: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Grava trilha de auditoria da emissão de NFV.'),
	Gerar_Log_Pedido: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Grava trilha de modificações em pedidos.'),
	GravaMemListCcc: stub([
		{ nome: 'AbrCcc', tipo: 'Alfa' },
		{ nome: 'VlrDig', tipo: 'Numero' },
		{ nome: 'PerAli', tipo: 'Numero' },
		{ nome: 'VlrMon', tipo: 'Numero' },
		{ nome: 'Ret', tipo: 'Numero', byRef: true }
	], 'Alimenta matriz virtual de formação de preço simplificado.'),
	GravaNumFcc: stub([
		{ nome: 'VCodEmp', tipo: 'Numero' },
		{ nome: 'VCodFil', tipo: 'Numero' },
		{ nome: 'VCodSnf', tipo: 'Alfa' },
		{ nome: 'VNumNfv', tipo: 'Numero' },
		{ nome: 'VSeqIPv', tipo: 'Numero' },
		{ nome: 'VNumFcc', tipo: 'Numero' }
	], 'Grava certificados de classificação na NFV.'),
	IncluirServicoOP: stub([
		{ nome: 'Parametros', tipo: 'Alfa' },
		{ nome: 'Retorno', tipo: 'Alfa', byRef: true }
	], 'Inclui roteiros/serviços terceirizados na OP.'),
	LeDadosComponentesMinuta: stub([
		{ nome: 'NPos', tipo: 'Numero' },
		{ nome: 'FLis', tipo: 'Numero', byRef: true },
		{ nome: 'pCodPro', tipo: 'Alfa', byRef: true },
		{ nome: 'pCodDer', tipo: 'Alfa', byRef: true },
		{ nome: 'pCplIpv', tipo: 'Alfa', byRef: true },
		{ nome: 'pQtde', tipo: 'Numero', byRef: true },
		{ nome: 'pPesBru', tipo: 'Numero', byRef: true }
	], 'Retorna componentes da embalagem na minuta.'),
	LeDadosProdutoMinuta: stub([
		{ nome: 'NPos', tipo: 'Numero' },
		{ nome: 'FLis', tipo: 'Numero', byRef: true },
		{ nome: 'CodPro', tipo: 'Alfa', byRef: true },
		{ nome: 'CodDer', tipo: 'Alfa', byRef: true },
		{ nome: 'CplIpv', tipo: 'Alfa', byRef: true },
		{ nome: 'Qtde', tipo: 'Numero', byRef: true },
		{ nome: 'PesBru', tipo: 'Numero', byRef: true },
		{ nome: 'MonEst', tipo: 'Numero', byRef: true }
	], 'Lê totais dos romaneios.'),
	LeLotesSubdivididos: stub([
		{ nome: 'p1', tipo: 'Numero' },
		{ nome: 'p2', tipo: 'Numero' },
		{ nome: 'pEmp', tipo: 'Numero', byRef: true },
		{ nome: 'pPro', tipo: 'Alfa', byRef: true },
		{ nome: 'pDer', tipo: 'Alfa', byRef: true },
		{ nome: 'pDep', tipo: 'Alfa', byRef: true },
		{ nome: 'pDat', tipo: 'Data', byRef: true },
		{ nome: 'pLot', tipo: 'Alfa', byRef: true },
		{ nome: 'pQtd', tipo: 'Numero', byRef: true },
		{ nome: 'pDVlt', tipo: 'Numero', byRef: true },
		{ nome: 'pDFab', tipo: 'Numero', byRef: true },
		{ nome: 'pPFab', tipo: 'Alfa', byRef: true },
		{ nome: 'pLFab', tipo: 'Alfa', byRef: true },
		{ nome: 'pCFab', tipo: 'Numero', byRef: true },
		{ nome: 'pVFab', tipo: 'Numero', byRef: true }
	], 'Recupera grade auxiliar de lotes subdivididos.'),
	LeMemListAEQ: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Retorna índices gravados pela engenharia no Custeio ABC.'),
	LeMemListAnaEmbFil: stub([
		{ nome: 'Pos', tipo: 'Numero' },
		{ nome: 'FimLis', tipo: 'Numero', byRef: true },
		{ nome: 'CodFil', tipo: 'Numero', byRef: true },
		{ nome: 'QtdApr', tipo: 'Numero', byRef: true },
		{ nome: 'QtdPro', tipo: 'Numero', byRef: true }
	], 'Totais aproveitados vs a fabricar em depósitos de embalagem.'),
	LeMemListCcc: stub([
		{ nome: 'AbrCcc', tipo: 'Alfa' },
		{ nome: 'VlrDig', tipo: 'Numero', byRef: true },
		{ nome: 'PerAli', tipo: 'Numero', byRef: true },
		{ nome: 'VlrMon', tipo: 'Numero', byRef: true },
		{ nome: 'Ret', tipo: 'Numero', byRef: true }
	], 'Verifica índices inseridos na simulação comercial de preços.'),
	LeMemListCompPro: stub([
		{ nome: 'Pos', tipo: 'Numero' },
		{ nome: 'Fim', tipo: 'Numero', byRef: true },
		{ nome: 'CodNiv', tipo: 'Alfa', byRef: true },
		{ nome: 'CodEtg', tipo: 'Numero', byRef: true },
		{ nome: 'SeqMod', tipo: 'Numero', byRef: true },
		{ nome: 'TipPro', tipo: 'Numero', byRef: true },
		{ nome: 'CodCmp', tipo: 'Alfa', byRef: true },
		{ nome: 'DesPro', tipo: 'Alfa', byRef: true },
		{ nome: 'DerCmp', tipo: 'Alfa', byRef: true },
		{ nome: 'UniMed', tipo: 'Alfa', byRef: true },
		{ nome: 'QtdTot', tipo: 'Numero', byRef: true },
		{ nome: 'PerPrd', tipo: 'Numero', byRef: true },
		{ nome: 'CodDer', tipo: 'Alfa', byRef: true }
	], 'Leitura em lote da explosão de componentes.'),
	LeMemListCompPro_2: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Leitura da explosão com filial de busca.'),
	LeMemListCompPro_3: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Leitura da explosão incluindo observações de engenharia.'),
	LeMemListProOP: stub([
		{ nome: 'NumPos', tipo: 'Numero' },
		{ nome: 'Fim', tipo: 'Numero', byRef: true },
		{ nome: 'CodNiv', tipo: 'Alfa', byRef: true },
		{ nome: 'CodPro', tipo: 'Alfa', byRef: true },
		{ nome: 'CodDer', tipo: 'Alfa', byRef: true },
		{ nome: 'CodEtg', tipo: 'Numero', byRef: true },
		{ nome: 'SeqCmp', tipo: 'Numero', byRef: true },
		{ nome: 'CodCmp', tipo: 'Alfa', byRef: true },
		{ nome: 'DerCmp', tipo: 'Alfa', byRef: true },
		{ nome: 'RelPrd', tipo: 'Alfa', byRef: true },
		{ nome: 'BxaOrp', tipo: 'Alfa', byRef: true },
		{ nome: 'CodOri', tipo: 'Alfa', byRef: true },
		{ nome: 'NumOrp', tipo: 'Numero', byRef: true }
	], 'Varre material amarrado a OP com picking iniciado.'),
	LerPedidosCanSub: stub([
		{ nome: 'NPos', tipo: 'Numero' },
		{ nome: 'FLis', tipo: 'Numero', byRef: true },
		{ nome: 'Emp', tipo: 'Numero', byRef: true },
		{ nome: 'Fil', tipo: 'Numero', byRef: true },
		{ nome: 'Ped', tipo: 'Numero', byRef: true },
		{ nome: 'Seq', tipo: 'Numero', byRef: true },
		{ nome: 'Pro', tipo: 'Alfa', byRef: true },
		{ nome: 'Der', tipo: 'Alfa', byRef: true },
		{ nome: 'ProS', tipo: 'Alfa', byRef: true },
		{ nome: 'DerS', tipo: 'Alfa', byRef: true },
		{ nome: 'Dep', tipo: 'Alfa', byRef: true },
		{ nome: 'Qtd', tipo: 'Numero', byRef: true },
		{ nome: 'Pre', tipo: 'Numero', byRef: true },
		{ nome: 'Vlr', tipo: 'Numero', byRef: true },
		{ nome: 'Cse', tipo: 'Alfa', byRef: true }
	], 'Consulta log para devolução/substituição de itens defeituosos.'),
	MontaEstruturaProdutoOP: stub([
		{ nome: 'pParam', tipo: 'Alfa' }
	], 'Instancia dados e consumos paralelos de uma OP.'),
	MontaFaturamento: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Processa base de notas e emite lista de itens cobrados.'),
	MontaListEmbEst: stub([
		{ nome: 'pEmp', tipo: 'Numero' },
		{ nome: 'pClc', tipo: 'Alfa' },
		{ nome: 'pMod', tipo: 'Alfa' },
		{ nome: 'Fam', tipo: 'Alfa' },
		{ nome: 'pPro', tipo: 'Alfa' },
		{ nome: 'pDep', tipo: 'Alfa' },
		{ nome: 'pFxa', tipo: 'Alfa' },
		{ nome: 'pPgr', tipo: 'Alfa' },
		{ nome: 'pEmb', tipo: 'Numero' }
	], 'Levanta saldo fracionado amarrado às caixas de expedição.'),
	MontaListaLotesSugeridos: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodPro', tipo: 'Alfa' },
		{ nome: 'pCodDer', tipo: 'Alfa' },
		{ nome: 'pCodDep', tipo: 'Alfa' },
		{ nome: 'pCodLot', tipo: 'Alfa' },
		{ nome: 'pQtdSug', tipo: 'Numero' }
	], 'Sugere lotes por disponibilidade (FIFO/LIFO).'),
	PegaUltimoNum: stub([
		{ nome: 'CodEmp', tipo: 'Numero' },
		{ nome: 'CodFil', tipo: 'Numero' },
		{ nome: 'CamBas', tipo: 'Alfa' },
		{ nome: 'DesCam', tipo: 'Alfa' },
		{ nome: 'NumFcc', tipo: 'Numero', byRef: true },
		{ nome: 'FlagFim', tipo: 'Numero', byRef: true }
	], 'Obtém contador global sequencial customizado.'),
	RemeterRetornarServico: stub([
		{ nome: 'pParametros', tipo: 'Alfa' },
		{ nome: 'pRetorno', tipo: 'Alfa', byRef: true }
	], 'Registra envio/retorno de industrialização no terceiro.'),
	RetornaPagamentoNotaFiscal: stub([
		{ nome: 'Empresa', tipo: 'Numero' },
		{ nome: 'Filial', tipo: 'Numero' },
		{ nome: 'Fornecedor', tipo: 'Numero' },
		{ nome: 'Serie', tipo: 'Alfa' },
		{ nome: 'NotaFiscal', tipo: 'Numero' },
		{ nome: 'Competencia', tipo: 'Data' },
		{ nome: 'DataPagamento', tipo: 'Data', byRef: true },
		{ nome: 'ValorISS', tipo: 'Numero', byRef: true }
	], 'Consulta pagamento de NF e retenção de ISS.'),
	RetornarQuantidadeLoteUtilizada: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodPro', tipo: 'Alfa' },
		{ nome: 'pCodDer', tipo: 'Alfa' },
		{ nome: 'pCodDep', tipo: 'Alfa' },
		{ nome: 'pCodLot', tipo: 'Alfa' },
		{ nome: 'pQtdUti', tipo: 'Numero' }
	], 'Retorna saldo utilizado de lote em pré-faturas simultâneas.'),
	RetornarServicoOP: stub([
		{ nome: 'pParametros', tipo: 'Alfa' },
		{ nome: 'pRetorno', tipo: 'Alfa', byRef: true }
	], 'Verifica dependência de mão de obra que bloqueia OP.'),
	SetaParamBuscaTabPreco: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Montagem de simulação de tabela de preço.'),
	SugerirLoteCriterio: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodPro', tipo: 'Alfa' },
		{ nome: 'pCodDer', tipo: 'Alfa' },
		{ nome: 'pCodDep', tipo: 'Alfa' },
		{ nome: 'pCodLot', tipo: 'Alfa' },
		{ nome: 'pQtdSug', tipo: 'Numero' },
		{ nome: 'pCriFed', tipo: 'Numero' }
	], 'Sugere lotes considerando validade/recebimento.'),
	SugerirLoteUnico: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodPro', tipo: 'Alfa' },
		{ nome: 'pCodDer', tipo: 'Alfa' },
		{ nome: 'pCodDep', tipo: 'Alfa' },
		{ nome: 'pCodLot', tipo: 'Alfa' },
		{ nome: 'pQtdSug', tipo: 'Numero' },
		{ nome: 'pCriFed', tipo: 'Numero' }
	], 'Tenta fechar requisições sem quebrar caixas.'),
	TGerarItensEmbalagemPFA: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Grava dados de volumes/embalagens na pré-fatura.'),

	// -------- Multimoeda / Contas a Receber-Pagar --------
	CalcularValoresCP: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Transcreve cotação paralela/moeda das duplicatas de pagamentos.'),
	CalcularValoresCR: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Calcula juros e descontos em índice oficial/gerencial no CR.'),
	MMCria: stub([], 'Aloca objetos/vetores de correção monetária.'),
	MMCalcularCorrecaoMonetaria: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Executa cálculo de correção monetária (classe MM).'),
	MMLibera: stub([], 'Libera estruturas dinâmicas financeiras abertas pela MMCria.'),
	SimulacaoIMP_Calcular: stub([
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pNumTit', tipo: 'Alfa' },
		{ nome: 'pCodTpt', tipo: 'Alfa' },
		{ nome: 'pCodFor', tipo: 'Numero' },
		{ nome: 'pDatPgt', tipo: 'Numero' },
		{ nome: 'pCodTns', tipo: 'Alfa' },
		{ nome: 'pVlrDsc', tipo: 'Numero' },
		{ nome: 'pVlrIns', tipo: 'Numero', byRef: true },
		{ nome: 'pVlrIrf', tipo: 'Numero', byRef: true },
		{ nome: 'pVlrIss', tipo: 'Numero', byRef: true },
		{ nome: 'pVlrOur', tipo: 'Numero', byRef: true }
	], 'Simula valores INSS/IRRF retidos no CP.'),
	SimulacaoIMP_CalcularParcial: stub([
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pNumTit', tipo: 'Alfa' },
		{ nome: 'pCodTpt', tipo: 'Alfa' },
		{ nome: 'pCodFor', tipo: 'Numero' },
		{ nome: 'pDatPgt', tipo: 'Numero' },
		{ nome: 'pCodTns', tipo: 'Alfa' },
		{ nome: 'pVlrDsc', tipo: 'Numero' },
		{ nome: 'pVlrMov', tipo: 'Numero' },
		{ nome: 'pVlrIns', tipo: 'Numero', byRef: true },
		{ nome: 'pVlrIrf', tipo: 'Numero', byRef: true },
		{ nome: 'pVlrIss', tipo: 'Numero', byRef: true },
		{ nome: 'pVlrOur', tipo: 'Numero', byRef: true }
	], 'Simulação de impostos com baixa parcial.'),
	SimulacaoIMP_CR_Calcular: stub([
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pNumTit', tipo: 'Alfa' },
		{ nome: 'pCodTpt', tipo: 'Alfa' },
		{ nome: 'pDatPgt', tipo: 'Numero' },
		{ nome: 'pCodTns', tipo: 'Alfa' },
		{ nome: 'pVlrDsc', tipo: 'Numero' },
		{ nome: 'pVlrPit', tipo: 'Numero', byRef: true },
		{ nome: 'pVlrCrt', tipo: 'Numero', byRef: true },
		{ nome: 'pVlrCsl', tipo: 'Numero', byRef: true },
		{ nome: 'pVlrIrf', tipo: 'Numero', byRef: true },
		{ nome: 'VlrOur', tipo: 'Numero', byRef: true }
	], 'Simulação CSRF no CR.'),
	SimulacaoIMP_CR_CalcularParcial: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pNumTit', tipo: 'Alfa' },
		{ nome: 'pCodTpt', tipo: 'Alfa' },
		{ nome: 'pDatPgt', tipo: 'Numero' },
		{ nome: 'pCodTns', tipo: 'Alfa' },
		{ nome: 'pVlrDsc', tipo: 'Numero' },
		{ nome: 'pVlrMov', tipo: 'Numero' },
		{ nome: 'pVlrIns', tipo: 'Numero', byRef: true },
		{ nome: 'pVlrIrf', tipo: 'Numero', byRef: true },
		{ nome: 'pVlrIss', tipo: 'Numero', byRef: true },
		{ nome: 'pVlrOur', tipo: 'Numero', byRef: true }
	], 'Simulação de impostos com recebimentos fatiados.'),

	// -------- Fiscais e Patrimoniais --------
	BuscaBaixaDepreciacao: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodBem', tipo: 'Alfa' },
		{ nome: 'pNumMan', tipo: 'Numero' },
		{ nome: 'pDatMov', tipo: 'Data' },
		{ nome: 'pSeqMov', tipo: 'Numero' },
		{ nome: 'pCodTns', tipo: 'Alfa' },
		{ nome: 'pTnsOri', tipo: 'Alfa' },
		{ nome: 'pVlrMov', tipo: 'Numero' },
		{ nome: 'BdpMio', tipo: 'Numero', byRef: true },
		{ nome: 'BdpMco', tipo: 'Numero', byRef: true }
	], 'Calcula impacto patrimonial de depreciação.'),
	BuscaBaixaDepreciacaoTipo: stub([
		{ nome: 'aCodEmp', tipo: 'Numero' },
		{ nome: 'aCodBem', tipo: 'Alfa' },
		{ nome: 'aNumMan', tipo: 'Numero' },
		{ nome: 'aDatMov', tipo: 'Numero' },
		{ nome: 'aSeqMov', tipo: 'Numero' },
		{ nome: 'aCodTns', tipo: 'Alfa' },
		{ nome: 'aTnsOri', tipo: 'Alfa' },
		{ nome: 'aVlrMov', tipo: 'Numero' },
		{ nome: 'aTipo', tipo: 'Numero' },
		{ nome: 'aBaseCalculo', tipo: 'Numero', byRef: true }
	], 'Calcula depreciação com índice paralelo (IFRS/gerencial).'),
	BuscaDepreciacaoAcumulada: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodBem', tipo: 'Alfa' },
		{ nome: 'pDatCal', tipo: 'Numero' },
		{ nome: 'pTnsInt', tipo: 'Alfa' },
		{ nome: 'pDprAcu', tipo: 'Numero', byRef: true },
		{ nome: 'pCotDao', tipo: 'Numero', byRef: true },
		{ nome: 'pCotDag', tipo: 'Numero', byRef: true },
		{ nome: 'pVlrAtu', tipo: 'Numero', byRef: true },
		{ nome: 'pQtdItm', tipo: 'Numero', byRef: true }
	], 'Consulta depreciação acumulada até competência.'),
	CadastrarInformacoesAdicionaisICMS: stub([
		{ nome: 'Empresa', tipo: 'Numero' },
		{ nome: 'Filial', tipo: 'Numero' },
		{ nome: 'Imposto', tipo: 'Alfa' },
		{ nome: 'Competencia', tipo: 'Data' },
		{ nome: 'Sequencia', tipo: 'Numero' },
		{ nome: 'Valor', tipo: 'Numero' }
	], 'Grava resumo ICMS na E661DEC durante apuração.'),
	ExportarLFPD_AtoCotepe7005: stub([
		{ nome: 'aEmpresa', tipo: 'Numero' },
		{ nome: 'aFilial', tipo: 'Numero' },
		{ nome: 'aPeriodoInicial', tipo: 'Alfa' },
		{ nome: 'aPeriodoFinal', tipo: 'Alfa' },
		{ nome: 'aNomeArquivo', tipo: 'Alfa' }
	], 'Gera LFPD magnética (obsoleto).'),
	GerarVidUtilInicial: stub([
		{ nome: 'aCodEmp', tipo: 'Numero' },
		{ nome: 'aCodBem', tipo: 'Alfa' },
		{ nome: 'aData', tipo: 'Data' },
		{ nome: 'aTipo', tipo: 'Alfa' },
		{ nome: 'aUniMed', tipo: 'Alfa' },
		{ nome: 'aVidTot', tipo: 'Numero' },
		{ nome: 'aVidIni', tipo: 'Numero' },
		{ nome: 'aVidMes', tipo: 'Numero' },
		{ nome: 'aVlrJus', tipo: 'Numero' },
		{ nome: 'aVlrEsp', tipo: 'Numero' },
		{ nome: 'aVlrRes', tipo: 'Numero' }
	], 'Processa adoção inicial de bens.'),
	RetornarSerieNotaFiscal: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pCodSnf', tipo: 'Alfa' },
		{ nome: 'pGeraNova', tipo: 'Alfa' },
		{ nome: 'pNovaSerie', tipo: 'Alfa', byRef: true }
	], 'Localiza ou gera série fiscal liberada.'),
	SelecionaDadosDIPI: stub([
		{ nome: 'OQue', tipo: 'Alfa' },
		{ nome: 'CodEmp', tipo: 'Numero' },
		{ nome: 'CodFil', tipo: 'Numero' },
		{ nome: 'DatIni', tipo: 'Numero' },
		{ nome: 'DatFim', tipo: 'Numero' },
		{ nome: 'Quanto', tipo: 'Numero' },
		{ nome: 'AgrupaClf', tipo: 'Numero' }
	], 'Busca relatórios fiscais de IPI.'),

	// -------- Tracking (Senior X / Integradores) --------
	Tracking_Cancelar: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pNumDoc', tipo: 'Alfa' },
		{ nome: 'pStatus', tipo: 'Alfa', byRef: true },
		{ nome: 'pMensagemErro', tipo: 'Alfa', byRef: true }
	], 'Estorna andamentos da SeniorX e registra falha se ocorrer.'),
	Tracking_CancelarFase: stub([
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pNumDoc', tipo: 'Alfa' },
		{ nome: 'pCodFas', tipo: 'Numero' },
		{ nome: 'pMsgNot', tipo: 'Alfa' },
		{ nome: 'pStatus', tipo: 'Alfa', byRef: true },
		{ nome: 'pMensagemErro', tipo: 'Alfa', byRef: true }
	], 'Encerra fase específica rastreável.'),
	Tracking_CancelarTransferido: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pTipDoc', tipo: 'Alfa' },
		{ nome: 'pNumDoc', tipo: 'Alfa' },
		{ nome: 'pSerDoc', tipo: 'Alfa' },
		{ nome: 'pStatus', tipo: 'Alfa', byRef: true },
		{ nome: 'pMensagemErro', tipo: 'Alfa', byRef: true }
	], 'Cancela documento transferido limpando tags.'),
	Tracking_RegistrarDocumento: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pTipDoc', tipo: 'Alfa' },
		{ nome: 'pNumDoc', tipo: 'Alfa' },
		{ nome: 'pSerDoc', tipo: 'Alfa' },
		{ nome: 'pDocExt', tipo: 'Alfa' },
		{ nome: 'pCodPla', tipo: 'Numero' },
		{ nome: 'pStatus', tipo: 'Alfa', byRef: true },
		{ nome: 'pMensagemErro', tipo: 'Alfa', byRef: true }
	], 'Insere espelho no WMS validando chaves/filial/tracking.'),
	Tracking_RegistrarFase: stub([
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pNumDoc', tipo: 'Alfa' },
		{ nome: 'pCodFas', tipo: 'Numero' },
		{ nome: 'pMsgNot', tipo: 'Alfa' },
		{ nome: 'pEncTrk', tipo: 'Alfa' },
		{ nome: 'pStatus', tipo: 'Alfa', byRef: true },
		{ nome: 'pMensagemErro', tipo: 'Alfa', byRef: true }
	], 'Marca conclusão de fase de pedido no WMS.'),
	Tracking_Transferir: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pCodFil', tipo: 'Numero' },
		{ nome: 'pTipDoc', tipo: 'Alfa' },
		{ nome: 'pNumDoc', tipo: 'Alfa' },
		{ nome: 'pSerDoc', tipo: 'Alfa' },
		{ nome: 'pStatus', tipo: 'Alfa', byRef: true },
		{ nome: 'pMensagemErro', tipo: 'Alfa', byRef: true }
	], 'Transfere chaves abertas da filial A para B (WMS/Transportes).'),

	// -------- Utilitárias gerais / datas / textos --------
	AbrirTelaSistema: stub([
		{ nome: 'aTela', tipo: 'Alfa' },
		{ nome: 'aParametros', tipo: 'Alfa' },
		{ nome: 'aResultado', tipo: 'Numero', byRef: true }
	], 'Abre tela do ERP injetando filtros no grid inicial.'),
	AgendarExecucaoWebservice: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pAbrFil', tipo: 'Alfa' },
		{ nome: 'pWebService', tipo: 'Alfa' },
		{ nome: 'pPorta', tipo: 'Alfa' },
		{ nome: 'pJSON', tipo: 'Alfa' }
	], 'Agenda execução de webservice remoto (assíncrono).'),
	AgendarExecucaoWebserviceEx: stub([
		{ nome: 'pCodEmp', tipo: 'Numero' },
		{ nome: 'pAbrFil', tipo: 'Alfa' },
		{ nome: 'pWebService', tipo: 'Alfa' },
		{ nome: 'pPorta', tipo: 'Alfa' },
		{ nome: 'pJSON', tipo: 'Alfa' },
		{ nome: 'pIdePle', tipo: 'Numero', byRef: true }
	], 'Agenda webservice retornando ID de plano.'),
	Arredonda: stub([
		{ nome: 'Valor', tipo: 'Numero', byRef: true },
		{ nome: 'CasasDecimais', tipo: 'Numero' }
	], 'Arredonda valor para casas decimais informadas.'),
	BuscaCamposChaveTabela: stub([
		{ nome: 'pTabela', tipo: 'Alfa' },
		{ nome: 'pChave', tipo: 'Alfa', byRef: true }
	], 'Retorna constraints de chave primária da tabela.'),
	BuscaLinhaTexto: stub([
		{ nome: 'Texto', tipo: 'Alfa' },
		{ nome: 'NroLin', tipo: 'Numero' },
		{ nome: 'LinTex', tipo: 'Alfa', byRef: true }
	], 'Retorna ocorrência correspondente à linha em texto.'),
	CalculaAlfa: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Realiza cálculos em strings numéricas com operadores fixos.'),
	CaminhoMenu: stub([
		{ nome: 'pNomeTela', tipo: 'Alfa' },
		{ nome: 'pCaminho', tipo: 'Alfa', byRef: true }
	], 'Retorna caminho de menu para localizar tela.'),
	DeixaNumeros: stub([
		{ nome: 'pNumAlf', tipo: 'Alfa', byRef: true }
	], 'Remove máscaras/acentos deixando somente números.'),
	EntradaValor: stub([
		{ nome: 'Tipo', tipo: 'Alfa' },
		{ nome: 'Mensagem', tipo: 'Alfa' },
		{ nome: 'TamInt', tipo: 'Numero' },
		{ nome: 'Mascara', tipo: 'Alfa' },
		{ nome: 'ValorDefault', tipo: 'Alfa' },
		{ nome: 'TamDec', tipo: 'Numero' },
		{ nome: 'xRetAlfa', tipo: 'Alfa', byRef: true },
		{ nome: 'xRetNumero', tipo: 'Numero', byRef: true },
		{ nome: 'xTipSai', tipo: 'Numero', byRef: true }
	], 'Exibe popup e retorna valor informado pelo usuário.'),
	ExecutaRelatorio: stub([
		{ nome: 'NomeRelatorio', tipo: 'Alfa' },
		{ nome: 'Saida', tipo: 'Alfa' },
		{ nome: 'Parametros', tipo: 'Alfa' }
	], 'Processa modelo de relatório (RelaWeb).'),
	ExecutarRotinaSapiens: stub([
		{ nome: 'xEmpExec', tipo: 'Numero' },
		{ nome: 'xFilExec', tipo: 'Numero' },
		{ nome: 'xRotSapiens', tipo: 'Numero' },
		{ nome: 'xParametros', tipo: 'Alfa' },
		{ nome: 'pStatus', tipo: 'Alfa', byRef: true },
		{ nome: 'pMensagemErro', tipo: 'Alfa', byRef: true }
	], 'Chama rotina encapsulada no ERP sem webservices.'),
	ExecutarRotinaSistema: stub([
		{ nome: 'aRotina', tipo: 'Numero' },
		{ nome: 'aParametros', tipo: 'Alfa' }
	], 'Executa tarefas internas do sistema (ex: limpeza de trilha).'),
	ExtensoSemana: stub([
		{ nome: 'DatSis', tipo: 'Data' },
		{ nome: 'VSemExt', tipo: 'Alfa', byRef: true }
	], 'Converte data para texto da semana em português.'),
	GerarPendenciaExportacao: stub([
		{ nome: 'aCodigoSistema', tipo: 'Numero' },
		{ nome: 'aTipoInformacao', tipo: 'Numero' },
		{ nome: 'aChave', tipo: 'Alfa' }
	], 'Cria pendência de exportação para integradores.'),
	GerarPendenciaExportacaoRet: stub([
		{ nome: 'aCodigoSistema', tipo: 'Numero' },
		{ nome: 'aTipoInformacao', tipo: 'Numero' },
		{ nome: 'aChave', tipo: 'Alfa' },
		{ nome: 'aMsgRetorno', tipo: 'Alfa', byRef: true }
	], 'Cria pendência retornando mensagem de erro se houver.'),
	LerBalanca: stub([
		{ nome: 'pTipo', tipo: 'Numero' },
		{ nome: 'pPeso', tipo: 'Numero', byRef: true }
	], 'Lê peso de balança via DLL serial.'),
	LerBalancaTipoPeso: stub([
		{ nome: 'pTipo', tipo: 'Numero' },
		{ nome: 'pPeso', tipo: 'Numero', byRef: true }
	], 'Sobrepõe configuração padrão e lê peso da balança.'),
	MontaAbrangencia: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Constrói parâmetros dinâmicos de abrangência para SQL.'),
	NomeCompletoUsuario: stub([
		{ nome: 'pCodUsu', tipo: 'Numero' },
		{ nome: 'pNomUsu', tipo: 'Alfa' }
	], 'De/para entre código e nome de usuário.'),
	ObterValorAlfaPadraoCNAB: stub([
		{ nome: 'PosicaoInicial', tipo: 'Numero' },
		{ nome: 'PosicaoFinal', tipo: 'Numero' },
		{ nome: 'Valor', tipo: 'Alfa' },
		{ nome: 'CaracterPreenchimento', tipo: 'Alfa' },
		{ nome: 'ConcatenarRetorno', tipo: 'Alfa' },
		{ nome: 'RetornoPadraoCNAB', tipo: 'Alfa', byRef: true }
	], 'Formata valor alfa para layout posicional CNAB.'),
	ObterValorDecimalPadraoCNAB: stub([
		{ nome: 'PosicaoInicial', tipo: 'Numero' },
		{ nome: 'PosicaoFinal', tipo: 'Numero' },
		{ nome: 'QtdeDecimais', tipo: 'Numero' },
		{ nome: 'Valor', tipo: 'Numero' },
		{ nome: 'CaracterPreenchimento', tipo: 'Alfa' },
		{ nome: 'ConcatenarRetorno', tipo: 'Alfa' },
		{ nome: 'RetornoPadraoCNAB', tipo: 'Alfa', byRef: true }
	], 'Formata valor decimal para layout CNAB.'),
	ObterValorNumericoPadraoCNAB: stub([
		{ nome: 'PosicaoInicial', tipo: 'Numero' },
		{ nome: 'PosicaoFinal', tipo: 'Numero' },
		{ nome: 'Valor', tipo: 'Numero' },
		{ nome: 'CaracterPreenchimento', tipo: 'Alfa' },
		{ nome: 'ConcatenarRetorno', tipo: 'Alfa' },
		{ nome: 'RetornoPadraoCNAB', tipo: 'Alfa', byRef: true }
	], 'Formata valor numérico para layout CNAB.'),
	OtimizarAbrangencia: stub([
		{ nome: 'pAbrangecia', tipo: 'Alfa' },
		{ nome: 'pAbrangeciaOtimizada', tipo: 'Alfa', byRef: true }
	], 'Simplifica blocos massivos de abrangência.'),
	PegarTipoVar: stub([
		{ nome: 'aVar', tipo: 'Alfa' },
		{ nome: 'aTipo', tipo: 'Numero', byRef: true }
	], 'Retorna tipo de identificador (inteiro, data, alfa, cursor).'),
	PegarValorVarAlf: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Carrega valor alfa via reflexão pelo nome da variável.'),
	PegarValorVarNum: stub([
		{ nome: 'aVar', tipo: 'Alfa' },
		{ nome: 'aNumVal', tipo: 'Numero', byRef: true }
	], 'Carrega valor numérico via reflexão pelo nome da variável.'),
	ProcuraEnter: stub([
		{ nome: 'StrProcura', tipo: 'Alfa' },
		{ nome: 'StrImp', tipo: 'Alfa', byRef: true },
		{ nome: 'StrResto', tipo: 'Alfa', byRef: true }
	], 'Separa texto no primeiro enter encontrado.'),
	QuebraTexto: stub([
		{ nome: 'vTexto', tipo: 'Alfa' },
		{ nome: 'vTamanho', tipo: 'Numero' },
		{ nome: 'vNumLin', tipo: 'Numero', byRef: true }
	], 'Fatia texto em linhas de tamanho fixo.'),
	RetDiaSemana: stub([
		{ nome: 'pData', tipo: 'Numero' },
		{ nome: 'pDia', tipo: 'Numero', byRef: true }
	], 'Retorna 0-6 representando o dia da semana.'),
	RetDiaUtilAntPos: stub([
		{ nome: 'pData', tipo: 'Numero' },
		{ nome: 'pCEP', tipo: 'Numero' },
		{ nome: 'pDataAnt', tipo: 'Numero', byRef: true },
		{ nome: 'pDataPos', tipo: 'Numero', byRef: true }
	], 'Calcula dia útil anterior e posterior considerando CEP/feriados.'),
	RetornarDiasUteisMes: stub([
		{ nome: 'aDatabase', tipo: 'Data' },
		{ nome: 'aTipoRetorno', tipo: 'Numero' },
		{ nome: 'aQtdDiasUteis', tipo: 'Numero', byRef: true }
	], 'Conta dias úteis no mês ou decorridos até data.'),
	RetornarDiasUteisPeriodo: stub([
		{ nome: 'aDataIni', tipo: 'Data' },
		{ nome: 'aDataFim', tipo: 'Data' },
		{ nome: 'aQtdDiasUteis', tipo: 'Numero', byRef: true }
	], 'Conta dias úteis entre duas datas.'),
	RetornarQtdDiasAno: stub([
		{ nome: 'pData', tipo: 'Data' },
		{ nome: 'pTipoCalculo', tipo: 'Numero' },
		{ nome: 'pQtdDiasAno', tipo: 'Numero', byRef: true }
	], 'Retorna quantidade de dias do ano conforme modo comercial ou exato.'),
	VerificaDiaUtil: stub([
		{ nome: 'Data', tipo: 'Numero' },
		{ nome: 'Cep', tipo: 'Numero' },
		{ nome: 'Vct', tipo: 'Numero' },
		{ nome: 'DiaUtil', tipo: 'Numero', byRef: true }
	], 'Calcula se data é útil considerando CEP e deslocamentos.'),
	SapiensSID: stub([
		{ nome: 'Endereco', tipo: 'Alfa' }
	], 'Chamada SID legada (obsoleta).'),
	SapiensSIDEx: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Chamada SID com proxy/headers (legada).'),
	SetaAlfaTelaEntrada: stub([
		{ nome: 'Variavel', tipo: 'Alfa' },
		{ nome: 'Valor', tipo: 'Alfa' }
	], 'Preenche variável alfa da tela de entrada antes do relatório.'),
	SetaNumeroTelaEntrada: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Preenche variável numérica da tela de entrada.'),
	SetarValorVarAlf: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Altera campo string em runtime via nome.'),
	SetarValorVarNum: stub([
		{ nome: 'args', tipo: 'Any' }
	], 'Altera campo numérico em runtime via nome.'),
	SubstAlfaUmaVez: stub([
		{ nome: 'aOld', tipo: 'Alfa' },
		{ nome: 'aNew', tipo: 'Alfa' },
		{ nome: 'aDes', tipo: 'Alfa', byRef: true }
	], 'Substitui primeira ocorrência de substring.'),
	TrocaEmpresaFilial: stub([
		{ nome: 'Emp', tipo: 'Numero' },
		{ nome: 'Fil', tipo: 'Numero' }
	], 'Emula mudança de empresa/filial para webservices.'),
	TruncarValor: stub([
		{ nome: 'ValorVariavel', tipo: 'Numero', byRef: true }
	], 'Trunca parte decimal mantendo inteiro.'),
	UltimoDia: stub([
		{ nome: 'data', tipo: 'Data' }
	], 'Retorna último dia do mês da data informada.'),
	RetiraAcentuacao: stub([
		{ nome: 'pString', tipo: 'Alfa', byRef: true }
	], 'Remove acentos e coloca em maiúsculas.'),
	RetiraCaracteresEspeciais: stub([
		{ nome: 'Retorno', tipo: 'Alfa', byRef: true }
	], 'Remove caracteres especiais mantendo texto simples.'),
	RetornaAscII: stub([
		{ nome: 'xNumero', tipo: 'Numero' },
		{ nome: 'xCarAscII', tipo: 'Alfa', byRef: true }
	], 'Converte número para caractere ASCII.'),
	ValorElementoJson: stub([
		{ nome: 'aJson', tipo: 'Alfa' },
		{ nome: 'aGrupo', tipo: 'Alfa' },
		{ nome: 'aElemento', tipo: 'Alfa' },
		{ nome: 'aValor', tipo: 'Alfa', byRef: true }
	], 'Extrai valor de elemento JSON em memória.'),
	VerificaNumero: stub([
		{ nome: 'VOrigem', tipo: 'Alfa' },
		{ nome: 'VRetorno', tipo: 'Numero', byRef: true }
	], 'Valida se string contém apenas números.'),
	VerificaValor: stub([
		{ nome: 'Grid', tipo: 'Alfa' },
		{ nome: 'Campo', tipo: 'Alfa' },
		{ nome: 'Valor', tipo: 'Alfa' }
	], 'Valida consistência de valor em regras de tela.')
};
