// Script de teste automatizado para importação de CSV
// Execute com: npx playwright test test-import.js --headed

const { chromium } = require('playwright');
const path = require('path');

async function testImportCSV() {
  console.log('🚀 Iniciando teste de importação...\n');

  const browser = await chromium.launch({
    headless: true,   // Modo headless para ambiente sem display
    slowMo: 100
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Navegar para o site
    console.log('1. Navegando para https://caixa360.vercel.app/...');
    await page.goto('https://caixa360.vercel.app/');
    await page.waitForTimeout(2000);

    // 2. Verificar se precisa fazer login
    const currentUrl = page.url();
    console.log(`   URL atual: ${currentUrl}`);

    if (currentUrl.includes('login') || currentUrl.includes('auth')) {
      console.log('\n⚠️  Login necessário!');
      console.log('   Por favor, faça login manualmente na janela do browser.');
      console.log('   O script continuará após você fazer login...\n');

      // Esperar até estar no dashboard
      await page.waitForURL('**/dashboard**', { timeout: 120000 });
      console.log('✅ Login detectado!\n');
    }

    // 3. Ir para página de importação
    console.log('2. Procurando link de importação...');

    // Tentar encontrar o link de importação
    const importLink = await page.locator('text=Importar').or(
      page.locator('a[href*="importar"]')
    ).first();

    if (await importLink.isVisible()) {
      await importLink.click();
      await page.waitForTimeout(2000);
      console.log('   ✅ Página de importação aberta\n');
    } else {
      console.log('   ⚠️  Link de importação não encontrado, tentando URL direta...');
      await page.goto('https://caixa360.vercel.app/dashboard/importar');
      await page.waitForTimeout(2000);
    }

    // 4. Upload do arquivo CSV
    console.log('3. Fazendo upload do arquivo CSV...');
    const csvPath = path.join(__dirname, 'teste-salao-beleza.csv');

    const fileInput = await page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(csvPath);
    await page.waitForTimeout(3000);
    console.log('   ✅ Arquivo enviado\n');

    // 5. Verificar preview
    console.log('4. Verificando preview da importação...');
    await page.waitForTimeout(2000);

    // Capturar screenshot do resultado
    await page.screenshot({
      path: 'screenshot-import-preview.png',
      fullPage: true
    });
    console.log('   📸 Screenshot salvo: screenshot-import-preview.png\n');

    // 6. Confirmar importação se houver botão
    const confirmButton = await page.locator('button:has-text("Confirmar")').or(
      page.locator('button:has-text("Importar")')
    ).first();

    if (await confirmButton.isVisible()) {
      console.log('5. Confirmando importação...');
      await confirmButton.click();
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: 'screenshot-import-result.png',
        fullPage: true
      });
      console.log('   📸 Screenshot do resultado: screenshot-import-result.png\n');
    }

    // 7. Verificar dados importados
    console.log('6. Verificando dados importados...');
    await page.goto('https://caixa360.vercel.app/dashboard');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'screenshot-dashboard.png',
      fullPage: true
    });
    console.log('   📸 Screenshot do dashboard: screenshot-dashboard.png\n');

    console.log('✅ Teste concluído! Verifique os screenshots gerados.');
    console.log('\n📁 Arquivos gerados:');
    console.log('   - screenshot-import-preview.png');
    console.log('   - screenshot-import-result.png');
    console.log('   - screenshot-dashboard.png');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    await page.screenshot({ path: 'screenshot-error.png', fullPage: true });
    console.log('   📸 Screenshot do erro: screenshot-error.png');
  } finally {
    console.log('\n🔄 Fechando browser em 10 segundos...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

testImportCSV();
