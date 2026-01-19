// Validações e Sanitização de Inputs

// ==================== VALIDAÇÃO DE CNPJ ====================

export function validarCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  const cnpjLimpo = cnpj.replace(/\D/g, '');

  // Verifica tamanho
  if (cnpjLimpo.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cnpjLimpo)) return false;

  // Validação dos dígitos verificadores
  let tamanho = cnpjLimpo.length - 2;
  let numeros = cnpjLimpo.substring(0, tamanho);
  const digitos = cnpjLimpo.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpjLimpo.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
}

export function formatarCNPJ(cnpj: string): string {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  return cnpjLimpo.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

// ==================== VALIDAÇÃO DE CPF ====================

export function validarCPF(cpf: string): boolean {
  const cpfLimpo = cpf.replace(/\D/g, '');

  if (cpfLimpo.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpfLimpo)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(10))) return false;

  return true;
}

// ==================== VALIDAÇÃO DE EMAIL ====================

export function validarEmail(email: string): boolean {
  // Regex mais robusto baseado em RFC 5322 (simplificado)
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(email) && email.length <= 254;
}

// ==================== VALIDAÇÃO DE TELEFONE ====================

export function validarTelefone(telefone: string): boolean {
  const telefoneLimpo = telefone.replace(/\D/g, '');
  return telefoneLimpo.length >= 10 && telefoneLimpo.length <= 11;
}

export function formatarTelefone(telefone: string): string {
  const telefoneLimpo = telefone.replace(/\D/g, '');
  if (telefoneLimpo.length === 11) {
    return telefoneLimpo.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  return telefoneLimpo.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
}

// ==================== SANITIZAÇÃO ====================

// Mapa de entidades HTML para sanitização
const HTML_ENTITIES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;',
  '/': '&#x2F;',
};

export function sanitizarTexto(texto: string): string {
  return texto
    .trim()
    .replace(/[<>&"'`/]/g, (char) => HTML_ENTITIES[char] || char)
    .slice(0, 1000); // Limita tamanho
}

export function sanitizarDescricao(descricao: string): string {
  return descricao
    .trim()
    .replace(/[<>&"'`/]/g, (char) => HTML_ENTITIES[char] || char)
    .slice(0, 500);
}

export function sanitizarNumero(valor: string | number): number {
  if (typeof valor === 'number') return valor;
  const num = parseFloat(valor.replace(/[^\d.,\-]/g, '').replace(',', '.'));
  return isNaN(num) ? 0 : num;
}

// ==================== VALIDAÇÃO DE VALOR MONETÁRIO ====================

export function validarValorMonetario(valor: string | number): boolean {
  const num = typeof valor === 'number' ? valor : sanitizarNumero(valor);
  return num >= 0 && num <= 999999999.99; // Max ~1 bilhão
}

// ==================== VALIDAÇÃO DE DATA ====================

export function validarData(data: string): boolean {
  if (!data) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(data)) return false;

  const d = new Date(data + 'T00:00:00');
  if (isNaN(d.getTime())) return false;

  // Verificar se a data está em um intervalo razoável (1900-2100)
  const year = d.getFullYear();
  return year >= 1900 && year <= 2100;
}

export function validarDataFutura(data: string): boolean {
  if (!validarData(data)) return false;
  const d = new Date(data + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return d >= hoje;
}

// ==================== VALIDAÇÃO COMPLETA DE FORMULÁRIOS ====================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validarLancamento(dados: {
  descricao: string;
  valor: string | number;
  data: string;
  categoria: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  if (!dados.descricao || dados.descricao.trim().length < 2) {
    errors.push({ field: 'descricao', message: 'Descrição deve ter pelo menos 2 caracteres' });
  }

  if (!validarValorMonetario(dados.valor)) {
    errors.push({ field: 'valor', message: 'Valor inválido' });
  }

  const valorNum = sanitizarNumero(dados.valor);
  if (valorNum <= 0) {
    errors.push({ field: 'valor', message: 'Valor deve ser maior que zero' });
  }

  if (!validarData(dados.data)) {
    errors.push({ field: 'data', message: 'Data inválida' });
  }

  if (!dados.categoria) {
    errors.push({ field: 'categoria', message: 'Selecione uma categoria' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validarConta(dados: {
  descricao: string;
  valor: string | number;
  dataVencimento: string;
  categoria: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  if (!dados.descricao || dados.descricao.trim().length < 2) {
    errors.push({ field: 'descricao', message: 'Descrição deve ter pelo menos 2 caracteres' });
  }

  if (!validarValorMonetario(dados.valor)) {
    errors.push({ field: 'valor', message: 'Valor inválido' });
  }

  const valorNum = sanitizarNumero(dados.valor);
  if (valorNum <= 0) {
    errors.push({ field: 'valor', message: 'Valor deve ser maior que zero' });
  }

  if (!validarData(dados.dataVencimento)) {
    errors.push({ field: 'dataVencimento', message: 'Data de vencimento inválida' });
  }

  if (!dados.categoria) {
    errors.push({ field: 'categoria', message: 'Selecione uma categoria' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
