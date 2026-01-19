import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';

// Esta API processa documentos enviados ao assistente
// Para OCR real, seria necessário usar uma API como Google Vision, AWS Textract, etc.
// Esta implementação usa uma abordagem simplificada para PDFs e imagens

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const auth = await requireAuth();
    if (auth.error) {
      return auth.error;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const empresaId = formData.get('empresaId') as string;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 });
    }

    const apiKey = process.env.XAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key não configurada' }, { status: 500 });
    }

    const fileName = file.name;
    const fileType = file.type;
    const fileSize = file.size;
    
    // Limite de 5MB
    if (fileSize > 5 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'Arquivo muito grande. Limite de 5MB.' 
      }, { status: 400 });
    }

    let conteudoExtraido = '';
    let tipoProcessamento = 'texto';

    // Para arquivos de texto simples
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      conteudoExtraido = await file.text();
      tipoProcessamento = 'texto';
    }
    // Para CSV
    else if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
      const texto = await file.text();
      // Extrair primeiras linhas para análise
      const linhas = texto.split('\n').slice(0, 50);
      conteudoExtraido = linhas.join('\n');
      tipoProcessamento = 'csv';
    }
    // Para imagens - usar descrição com IA
    else if (fileType.startsWith('image/')) {
      // Converter imagem para base64
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      
      // Usar IA para descrever a imagem (se suportado)
      // Por enquanto, retornamos uma mensagem indicando que é uma imagem
      conteudoExtraido = `[Imagem: ${fileName}]\nTipo: ${fileType}\nTamanho: ${Math.round(fileSize/1024)}KB\n\nPara extrair texto de imagens, seria necessário integrar com um serviço de OCR como Google Vision ou AWS Textract.`;
      tipoProcessamento = 'imagem';
    }
    // Para PDFs - indicar que precisa de OCR externo
    else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      conteudoExtraido = `[PDF: ${fileName}]\nTamanho: ${Math.round(fileSize/1024)}KB\n\nPara extrair texto de PDFs, seria necessário integrar com um serviço de processamento de documentos.`;
      tipoProcessamento = 'pdf';
    }
    else {
      return NextResponse.json({ 
        error: 'Tipo de arquivo não suportado. Use TXT, CSV, imagens ou PDF.' 
      }, { status: 400 });
    }

    // Agora usar a IA para analisar o conteúdo
    const hoje = new Date().toISOString().split('T')[0];

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3-fast',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente financeiro analisando um documento enviado pelo usuário.
Data de hoje: ${hoje}

Analise o conteúdo do documento e forneça:
1. Um resumo do que o documento contém
2. Se houver valores financeiros, liste-os
3. Se parecer um extrato bancário, nota fiscal ou documento financeiro, identifique os lançamentos
4. Sugestões de como esses dados podem ser importados no sistema

Seja conciso e útil. Use emojis para tornar a resposta mais amigável.`
          },
          {
            role: 'user',
            content: `Documento enviado: ${fileName}\nTipo: ${tipoProcessamento}\n\nConteúdo:\n${conteudoExtraido.substring(0, 4000)}`
          }
        ],
        temperature: 0.5,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      return NextResponse.json({ 
        error: 'Erro ao analisar documento com IA' 
      }, { status: 500 });
    }

    const analise = data.choices[0].message?.content || 'Não foi possível analisar o documento.';

    return NextResponse.json({
      sucesso: true,
      arquivo: {
        nome: fileName,
        tipo: fileType,
        tamanho: fileSize,
        tipoProcessamento,
      },
      conteudoExtraido: conteudoExtraido.substring(0, 2000),
      analise,
    });

  } catch (error) {
    console.error('Erro ao processar documento:', error);
    return NextResponse.json({ 
      error: 'Erro ao processar documento' 
    }, { status: 500 });
  }
}
