import * as XLSX from 'xlsx';
import { fireToast } from '../contexts/ToastContext';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function registrarLogExportacao(acao: string, descricao: string, modulo: string) {
  try {
    const raw = localStorage.getItem('usuario');
    if (!raw) return;
    const usuario = JSON.parse(raw);
    fetch(`${API_URL}/logs-auditoria`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': String(usuario.id) },
      body: JSON.stringify({ acao, descricao, modulo }),
    }).catch(() => {});
  } catch {
    // não bloquear exportação por falha de log
  }
}

const CABECALHO_INSTITUCIONAL = [
  'Governo do Estado de Alagoas',
  'Secretaria de Estado da Primeira Infância – SECRIA',
  'Programa DeciDIU'
];

const COR_CABECALHO_ARGB = 'FF1A4D2E';
const COR_ZEBRA_VERDE    = 'FFE8F5EE';
const COR_ZEBRA_BRANCO   = 'FFFFFFFF';

const formatarDataParaExportacao = (data: string | null | undefined): string => {
  if (!data) return '-';
  try {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return data || '-';
  }
};

const formatarTelefone = (tel: string | null | undefined): string => {
  if (!tel) return '-';
  const numeros = tel.replace(/\D/g, '');
  if (numeros.length === 11) return `(${numeros.substr(0, 2)}) ${numeros.substr(2, 5)}-${numeros.substr(7)}`;
  if (numeros.length === 10) return `(${numeros.substr(0, 2)}) ${numeros.substr(2, 4)}-${numeros.substr(6)}`;
  return tel;
};

// ─── Helpers XLSX ─────────────────────────────────────────────────────────────

function aplicarEstilosCabecalho(ws: XLSX.WorkSheet, range: XLSX.Range) {
  for (let col = range.s.c; col <= range.e.c; col++) {
    const addr = XLSX.utils.encode_cell({ r: range.s.r, c: col });
    if (!ws[addr]) continue;
    ws[addr].s = {
      fill: { patternType: 'solid', fgColor: { argb: COR_CABECALHO_ARGB } },
      font: { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', sz: 11 },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
      border: {
        top:    { style: 'thin', color: { argb: 'FF0D3320' } },
        bottom: { style: 'thin', color: { argb: 'FF0D3320' } },
        left:   { style: 'thin', color: { argb: 'FF0D3320' } },
        right:  { style: 'thin', color: { argb: 'FF0D3320' } },
      },
    };
  }
}

function aplicarEstilosZebra(ws: XLSX.WorkSheet, totalLinhas: number, totalCols: number, linhaInicio: number) {
  for (let row = linhaInicio; row < linhaInicio + totalLinhas; row++) {
    const cor = (row - linhaInicio) % 2 === 0 ? COR_ZEBRA_VERDE : COR_ZEBRA_BRANCO;
    for (let col = 0; col < totalCols; col++) {
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = {
        fill: { patternType: 'solid', fgColor: { argb: cor } },
        font: { name: 'Calibri', sz: 10 },
        alignment: { vertical: 'center', wrapText: false },
        border: {
          top:    { style: 'hair', color: { argb: 'FFD0E8DA' } },
          bottom: { style: 'hair', color: { argb: 'FFD0E8DA' } },
          left:   { style: 'hair', color: { argb: 'FFD0E8DA' } },
          right:  { style: 'hair', color: { argb: 'FFD0E8DA' } },
        },
      };
    }
  }
}

function autoSizeColunas(ws: XLSX.WorkSheet, dados: (string | number)[][], headers: string[]) {
  ws['!cols'] = headers.map((h, i) => {
    const maxData = dados.reduce((max, row) => Math.max(max, String(row[i] ?? '').length), 0);
    return { wch: Math.min(Math.max(h.length, maxData) + 4, 60) };
  });
}

function criarWorksheetComCabecalho(headers: string[], linhas: (string | number)[][]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...linhas]);
  aplicarEstilosCabecalho(ws, { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });
  aplicarEstilosZebra(ws, linhas.length, headers.length, 1);
  autoSizeColunas(ws, [headers, ...linhas], headers);
  return ws;
}

function baixarXlsx(ws: XLSX.WorkSheet, nomeAba: string, nomeArquivo: string, modulo?: string) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nomeAba);
  XLSX.writeFile(wb, nomeArquivo, { bookType: 'xlsx', type: 'binary', cellStyles: true });
  registrarLogExportacao('exportacao_excel', `Exportação Excel: ${nomeArquivo}`, modulo || 'Sistema');
}

// ─── Exportações ──────────────────────────────────────────────────────────────

export const exportarCSV = (pacientes: any[], nomeArquivo: string = 'pacientes_ambulatorial.xlsx') => {
  if (!pacientes || pacientes.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  const headers = ['Nome', 'CPF', 'Cartão SUS', 'Município', 'Data de Nascimento', 'Telefone'];
  const linhas = pacientes.map(p => [
    p.nome_completo || '-', p.cpf || '-', p.cartao_sus || '-',
    p.municipio || '-', formatarDataParaExportacao(p.data_nascimento), formatarTelefone(p.celular),
  ]);
  baixarXlsx(criarWorksheetComCabecalho(headers, linhas), 'Pacientes', nomeArquivo.replace(/\.csv$/, '.xlsx'), 'Ambulatorial');
};

export const exportarPDF = async (pacientes: any[], nomeArquivo: string = 'pacientes_ambulatorial.pdf') => {
  if (!pacientes || pacientes.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  try {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    CABECALHO_INSTITUCIONAL.forEach((linha, index) => {
      doc.text(linha, (pageWidth - doc.getTextWidth(linha)) / 2, yPosition + (index * 7));
    });
    yPosition += (CABECALHO_INSTITUCIONAL.length * 7) + 10;
    doc.setLineWidth(0.5); doc.line(14, yPosition, pageWidth - 14, yPosition); yPosition += 10;
    autoTable(doc, {
      startY: yPosition,
      head: [['Nome', 'CPF', 'Cartão SUS', 'Município', 'Data Nasc.', 'Telefone']],
      body: pacientes.map(p => [p.nome_completo || '-', p.cpf || '-', p.cartao_sus || '-',
        p.municipio || '-', formatarDataParaExportacao(p.data_nascimento), formatarTelefone(p.celular)]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', cellWidth: 'wrap' },
      headStyles: { fillColor: [26, 77, 46], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [232, 245, 238] },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30 }, 3: { cellWidth: 35 }, 4: { cellWidth: 25 }, 5: { cellWidth: 25 } },
      margin: { left: 14, right: 14 }
    });
    registrarLogExportacao('exportacao_pdf', `Exportação PDF: ${nomeArquivo}`, 'Ambulatorial');
    doc.save(nomeArquivo);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    fireToast('error', 'Erro ao gerar PDF. Por favor, tente novamente.');
  }
};

export const exportarAgendamentosCSV = (agendamentos: any[], nomeArquivo: string = 'agendamentos_municipios.xlsx') => {
  if (!agendamentos || agendamentos.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  const headers = ['Município', 'Data', 'Status', 'Plano de Governança', 'Observações'];
  const linhas = agendamentos.map(a => [
    a.municipio || '-', formatarDataParaExportacao(a.data_agendamento),
    a.status || '-', a.plano_governanca ? 'Sim' : 'Não', a.observacoes || '-',
  ]);
  baixarXlsx(criarWorksheetComCabecalho(headers, linhas), 'Agendamentos', nomeArquivo.replace(/\.csv$/, '.xlsx'), 'Capacitação');
};

export const exportarAgendamentosPDF = async (agendamentos: any[], nomeArquivo: string = 'agendamentos_municipios.pdf') => {
  if (!agendamentos || agendamentos.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  try {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    CABECALHO_INSTITUCIONAL.forEach((linha, index) => {
      doc.text(linha, (pageWidth - doc.getTextWidth(linha)) / 2, yPosition + (index * 7));
    });
    yPosition += (CABECALHO_INSTITUCIONAL.length * 7) + 10;
    doc.setLineWidth(0.5); doc.line(14, yPosition, pageWidth - 14, yPosition); yPosition += 10;
    autoTable(doc, {
      startY: yPosition,
      head: [['Município', 'Data', 'Status', 'Plano Gov.', 'Observações']],
      body: agendamentos.map(a => [a.municipio || '-', formatarDataParaExportacao(a.data_agendamento),
        a.status || '-', a.plano_governanca ? 'Sim' : 'Não', a.observacoes || '-']),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', cellWidth: 'wrap' },
      headStyles: { fillColor: [26, 77, 46], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [232, 245, 238] },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 25 }, 2: { cellWidth: 30 }, 3: { cellWidth: 25 }, 4: { cellWidth: 60 } },
      margin: { left: 14, right: 14 }
    });
    registrarLogExportacao('exportacao_pdf', `Exportação PDF: ${nomeArquivo}`, 'Capacitação');
    doc.save(nomeArquivo);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    fireToast('error', 'Erro ao gerar PDF. Por favor, tente novamente.');
  }
};

export const exportToPDF = async (dados: any[], nomeArquivo: string, titulo?: string) => {
  if (!dados || dados.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  try {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    CABECALHO_INSTITUCIONAL.forEach((linha, index) => {
      doc.text(linha, (pageWidth - doc.getTextWidth(linha)) / 2, yPosition + (index * 7));
    });
    yPosition += (CABECALHO_INSTITUCIONAL.length * 7) + 10;
    if (titulo) {
      doc.setFontSize(14);
      doc.text(titulo, (pageWidth - doc.getTextWidth(titulo)) / 2, yPosition);
      yPosition += 10;
    }
    doc.setLineWidth(0.5); doc.line(14, yPosition, pageWidth - 14, yPosition); yPosition += 10;
    const colunas = Object.keys(dados[0]);
    autoTable(doc, {
      startY: yPosition,
      head: [colunas],
      body: dados.map(item => colunas.map(col => String(item[col] || '-'))),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', cellWidth: 'wrap' },
      headStyles: { fillColor: [26, 77, 46], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [232, 245, 238] },
      margin: { left: 14, right: 14 }
    });
    registrarLogExportacao('exportacao_pdf', `Exportação PDF: ${nomeArquivo}`, 'Sistema');
    doc.save(`${nomeArquivo}.pdf`);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    fireToast('error', 'Erro ao gerar PDF. Por favor, tente novamente.');
  }
};

export const exportToExcel = (dados: any[], nomeArquivo: string) => {
  if (!dados || dados.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  const headers = Object.keys(dados[0]);
  const linhas = dados.map(item => headers.map(col => String(item[col] ?? '-')));
  baixarXlsx(criarWorksheetComCabecalho(headers, linhas), 'Dados', `${nomeArquivo}.xlsx`);
};

export const exportarSolicitacoesCSV = (solicitacoes: any[], nomeArquivo: string = 'lista_espera_solicitacoes.xlsx') => {
  if (!solicitacoes || solicitacoes.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  const headers = ['Município', 'Tipo de Insumo', 'Qtd. Solicitada', 'Qtd. Autorizada', 'Solicitante', 'Data', 'Status', 'Motivo Negação'];
  const linhas = solicitacoes.map(s => [
    s.municipio_nome || '-', s.tipo_insumo || '-', s.quantidade_solicitada || '-',
    s.quantidade_autorizada || '-', s.nome_solicitante || '-',
    formatarDataParaExportacao(s.data_solicitacao), s.status || '-', s.motivo_negacao || '-',
  ]);
  baixarXlsx(criarWorksheetComCabecalho(headers, linhas), 'Solicitações', nomeArquivo.replace(/\.csv$/, '.xlsx'), 'Distribuição');
};

export const exportarSolicitacoesPDF = async (solicitacoes: any[], nomeArquivo: string = 'lista_espera_solicitacoes.pdf') => {
  if (!solicitacoes || solicitacoes.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  try {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF('l');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    CABECALHO_INSTITUCIONAL.forEach((linha, index) => {
      doc.text(linha, (pageWidth - doc.getTextWidth(linha)) / 2, yPosition + (index * 7));
    });
    yPosition += (CABECALHO_INSTITUCIONAL.length * 7) + 5;
    doc.setFontSize(14);
    const titulo = 'Lista de Espera - Solicitações';
    doc.text(titulo, (pageWidth - doc.getTextWidth(titulo)) / 2, yPosition); yPosition += 8;
    doc.setLineWidth(0.5); doc.line(14, yPosition, pageWidth - 14, yPosition); yPosition += 8;
    autoTable(doc, {
      startY: yPosition,
      head: [['Município', 'Tipo Insumo', 'Qtd. Sol.', 'Qtd. Aut.', 'Solicitante', 'Data', 'Status', 'Motivo Negação']],
      body: solicitacoes.map(s => [s.municipio_nome || '-', s.tipo_insumo || '-',
        s.quantidade_solicitada || '-', s.quantidade_autorizada || '-', s.nome_solicitante || '-',
        formatarDataParaExportacao(s.data_solicitacao), s.status || '-', s.motivo_negacao || '-']),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', cellWidth: 'wrap' },
      headStyles: { fillColor: [26, 77, 46], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [232, 245, 238] },
      columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 30 }, 2: { cellWidth: 20 }, 3: { cellWidth: 20 }, 4: { cellWidth: 35 }, 5: { cellWidth: 23 }, 6: { cellWidth: 30 }, 7: { cellWidth: 60 } },
      margin: { left: 14, right: 14 }
    });
    registrarLogExportacao('exportacao_pdf', `Exportação PDF: ${nomeArquivo}`, 'Distribuição');
    doc.save(nomeArquivo);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    fireToast('error', 'Erro ao gerar PDF. Por favor, tente novamente.');
  }
};

export const exportarDistribuicaoMunicipiosCSV = (distribuicao: any[], nomeArquivo: string = 'distribuicao_municipios.xlsx', _periodoLabel: string = '') => {
  if (!distribuicao || distribuicao.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  const headers = ['Município', 'Total Solicitações', 'Autorizadas', 'Não Autorizadas', 'Aguardando'];
  const linhas = distribuicao.map(d => [
    d.municipio || '-', d.totalSolicitacoes || 0, d.totalAutorizadas || 0,
    d.totalNaoAutorizadas || 0, d.totalAguardando || 0,
  ]);
  baixarXlsx(criarWorksheetComCabecalho(headers, linhas), 'Distribuição', nomeArquivo.replace(/\.csv$/, '.xlsx'), 'Distribuição');
};

export const exportarDistribuicaoMunicipiosPDF = async (distribuicao: any[], nomeArquivo: string = 'distribuicao_municipios.pdf', periodoLabel: string = '') => {
  if (!distribuicao || distribuicao.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  try {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    CABECALHO_INSTITUCIONAL.forEach((linha, index) => {
      doc.text(linha, (pageWidth - doc.getTextWidth(linha)) / 2, yPosition + (index * 7));
    });
    yPosition += (CABECALHO_INSTITUCIONAL.length * 7) + 5;
    doc.setFontSize(14);
    const titulo = periodoLabel ? `Distribuição por Município - ${periodoLabel}` : 'Distribuição por Município';
    doc.text(titulo, (pageWidth - doc.getTextWidth(titulo)) / 2, yPosition); yPosition += 8;
    doc.setLineWidth(0.5); doc.line(14, yPosition, pageWidth - 14, yPosition); yPosition += 8;
    autoTable(doc, {
      startY: yPosition,
      head: [['Município', 'Total Solicitações', 'Autorizadas', 'Não Autorizadas', 'Aguardando']],
      body: distribuicao.map(d => [d.municipio || '-', d.totalSolicitacoes || 0,
        d.totalAutorizadas || 0, d.totalNaoAutorizadas || 0, d.totalAguardando || 0]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', cellWidth: 'wrap' },
      headStyles: { fillColor: [26, 77, 46], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [232, 245, 238] },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30 }, 3: { cellWidth: 35 }, 4: { cellWidth: 30 } },
      margin: { left: 14, right: 14 }
    });
    registrarLogExportacao('exportacao_pdf', `Exportação PDF: ${nomeArquivo}`, 'Distribuição');
    doc.save(nomeArquivo);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    fireToast('error', 'Erro ao gerar PDF. Por favor, tente novamente.');
  }
};

export const exportarInstrutorasCSV = (instrutoras: any[], nomeArquivo: string = 'enfermeiros_instrutores.xlsx') => {
  if (!instrutoras || instrutoras.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  const headers = ['Nome', 'CPF', 'COREN', 'Telefone', 'Email', 'Especialidade', 'Unidade de Saúde'];
  const linhas = instrutoras.map(i => [
    i.nome || '-', i.cpf || '-', i.coren || '-', formatarTelefone(i.telefone),
    i.email || '-', i.especialidade || '-', i.unidade_saude || '-',
  ]);
  baixarXlsx(criarWorksheetComCabecalho(headers, linhas), 'Instrutoras', nomeArquivo.replace(/\.csv$/, '.xlsx'), 'Capacitação');
};

export const exportarInstrutorsPDF = async (instrutoras: any[], nomeArquivo: string = 'enfermeiros_instrutores.pdf') => {
  if (!instrutoras || instrutoras.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  try {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF('l');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    CABECALHO_INSTITUCIONAL.forEach((linha, index) => {
      doc.text(linha, (pageWidth - doc.getTextWidth(linha)) / 2, yPosition + (index * 7));
    });
    yPosition += (CABECALHO_INSTITUCIONAL.length * 7) + 5;
    doc.setFontSize(14);
    const titulo = 'Enfermeiros(as) Instrutores(as)';
    doc.text(titulo, (pageWidth - doc.getTextWidth(titulo)) / 2, yPosition); yPosition += 8;
    doc.setLineWidth(0.5); doc.line(14, yPosition, pageWidth - 14, yPosition); yPosition += 8;
    autoTable(doc, {
      startY: yPosition,
      head: [['Nome', 'CPF', 'COREN', 'Telefone', 'Email', 'Especialidade', 'Unidade de Saúde']],
      body: instrutoras.map(i => [i.nome || '-', i.cpf || '-', i.coren || '-',
        formatarTelefone(i.telefone), i.email || '-', i.especialidade || '-', i.unidade_saude || '-']),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', cellWidth: 'wrap' },
      headStyles: { fillColor: [26, 77, 46], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [232, 245, 238] },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 30 }, 2: { cellWidth: 25 }, 3: { cellWidth: 30 }, 4: { cellWidth: 45 }, 5: { cellWidth: 35 }, 6: { cellWidth: 45 } },
      margin: { left: 14, right: 14 }
    });
    registrarLogExportacao('exportacao_pdf', `Exportação PDF: ${nomeArquivo}`, 'Capacitação');
    doc.save(nomeArquivo);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    fireToast('error', 'Erro ao gerar PDF. Por favor, tente novamente.');
  }
};

export const exportarAlunasCSV = (alunas: any[], nomeArquivo: string = 'enfermeiros_alunos.xlsx') => {
  if (!alunas || alunas.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  const headers = ['Nome', 'CPF', 'Telefone', 'Email', 'Município', 'Instrutor(a)', 'Status', 'Progresso'];
  const linhas = alunas.map(a => [
    a.nome || '-', a.cpf || '-', formatarTelefone(a.telefone), a.email || '-',
    a.municipio || '-', a.instrutora_nome || '-', a.status || '-', `${a.progresso || 0}%`,
  ]);
  baixarXlsx(criarWorksheetComCabecalho(headers, linhas), 'Alunas', nomeArquivo.replace(/\.csv$/, '.xlsx'), 'Capacitação');
};

export const exportarAlunasPDF = async (alunas: any[], nomeArquivo: string = 'enfermeiros_alunos.pdf') => {
  if (!alunas || alunas.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  try {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF('l');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    CABECALHO_INSTITUCIONAL.forEach((linha, index) => {
      doc.text(linha, (pageWidth - doc.getTextWidth(linha)) / 2, yPosition + (index * 7));
    });
    yPosition += (CABECALHO_INSTITUCIONAL.length * 7) + 5;
    doc.setFontSize(14);
    const titulo = 'Enfermeiros(as) Alunos(as)';
    doc.text(titulo, (pageWidth - doc.getTextWidth(titulo)) / 2, yPosition); yPosition += 8;
    doc.setLineWidth(0.5); doc.line(14, yPosition, pageWidth - 14, yPosition); yPosition += 8;
    autoTable(doc, {
      startY: yPosition,
      head: [['Nome', 'CPF', 'Telefone', 'Email', 'Município', 'Instrutor(a)', 'Status', 'Progresso']],
      body: alunas.map(a => [a.nome || '-', a.cpf || '-', formatarTelefone(a.telefone),
        a.email || '-', a.municipio || '-', a.instrutora_nome || '-', a.status || '-', `${a.progresso || 0}%`]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', cellWidth: 'wrap' },
      headStyles: { fillColor: [26, 77, 46], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [232, 245, 238] },
      columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30 }, 3: { cellWidth: 40 }, 4: { cellWidth: 35 }, 5: { cellWidth: 35 }, 6: { cellWidth: 25 }, 7: { cellWidth: 20 } },
      margin: { left: 14, right: 14 }
    });
    registrarLogExportacao('exportacao_pdf', `Exportação PDF: ${nomeArquivo}`, 'Capacitação');
    doc.save(nomeArquivo);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    fireToast('error', 'Erro ao gerar PDF. Por favor, tente novamente.');
  }
};

export const exportarPacientesCapacitacaoCSV = (pacientes: any[], nomeArquivo: string = 'pacientes_capacitacao.xlsx') => {
  if (!pacientes || pacientes.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  const headers = ['Nome', 'CPF', 'Cartão SUS', 'Data de Nascimento', 'Município'];
  const linhas = pacientes.map(p => [
    p.nome_completo || '-', p.cpf || '-', p.cartao_sus || '-',
    formatarDataParaExportacao(p.data_nascimento), p.municipio || '-',
  ]);
  baixarXlsx(criarWorksheetComCabecalho(headers, linhas), 'Pacientes', nomeArquivo.replace(/\.csv$/, '.xlsx'), 'Capacitação');
};

export const exportarPacientesCapacitacaoPDF = async (pacientes: any[], nomeArquivo: string = 'pacientes_capacitacao.pdf') => {
  if (!pacientes || pacientes.length === 0) {
    fireToast('warning', 'Não há dados para exportar.');
    return;
  }
  try {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    CABECALHO_INSTITUCIONAL.forEach((linha, index) => {
      doc.text(linha, (pageWidth - doc.getTextWidth(linha)) / 2, yPosition + (index * 7));
    });
    yPosition += (CABECALHO_INSTITUCIONAL.length * 7) + 5;
    doc.setFontSize(14);
    const titulo = 'Pacientes de Capacitação';
    doc.text(titulo, (pageWidth - doc.getTextWidth(titulo)) / 2, yPosition); yPosition += 8;
    doc.setLineWidth(0.5); doc.line(14, yPosition, pageWidth - 14, yPosition); yPosition += 8;
    autoTable(doc, {
      startY: yPosition,
      head: [['Nome', 'CPF', 'Cartão SUS', 'Data de Nascimento', 'Município']],
      body: pacientes.map(p => [p.nome_completo || '-', p.cpf || '-', p.cartao_sus || '-',
        formatarDataParaExportacao(p.data_nascimento), p.municipio || '-']),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', cellWidth: 'wrap' },
      headStyles: { fillColor: [26, 77, 46], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [232, 245, 238] },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30 }, 3: { cellWidth: 35 }, 4: { cellWidth: 30 } },
      margin: { left: 14, right: 14 }
    });
    registrarLogExportacao('exportacao_pdf', `Exportação PDF: ${nomeArquivo}`, 'Capacitação');
    doc.save(nomeArquivo);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    fireToast('error', 'Erro ao gerar PDF. Por favor, tente novamente.');
  }
};
