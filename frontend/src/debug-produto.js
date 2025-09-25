// DEBUG ULTRA DETALHADO - PERSISTÊNCIA DE PRODUTOS
// Execute este arquivo no console do DevTools para investigação completa

console.log("=== INICIANDO INVESTIGAÇÃO ULTRA DETALHADA ===");

// 1. VERIFICAR CONFIGURAÇÃO DE API
console.log("1. CONFIGURAÇÃO DE API:");
console.log("- axios.defaults.baseURL:", window.axios?.defaults?.baseURL);
console.log("- process.env.REACT_APP_API_BASE_URL:", process.env.REACT_APP_API_BASE_URL);
console.log("- window.location.origin:", window.location.origin);

// 2. VERIFICAR COOKIES E CSRF
console.log("\n2. AUTENTICAÇÃO E CSRF:");
const cookies = document.cookie.split(';').map(c => c.trim());
console.log("- Todos os cookies:", cookies);
const csrfCookie = cookies.find(c => c.startsWith('csrftoken='));
console.log("- Cookie CSRF:", csrfCookie);
const sessionCookie = cookies.find(c => c.startsWith('sessionid='));
console.log("- Cookie de sessão:", sessionCookie);

// 3. TESTAR CONECTIVIDADE DIRETA
async function testarConectividade() {
    console.log("\n3. TESTE DE CONECTIVIDADE:");

    const urls = [
        'https://backendchegouhubteste.up.railway.app/api/current-state/',
        'https://chegou-hubb-production.up.railway.app/api/current-state/',
        'https://backendchegouhubteste.up.railway.app/api/estoque/produtos-compartilhados/',
        'https://chegou-hubb-production.up.railway.app/api/estoque/produtos-compartilhados/'
    ];

    for (const url of urls) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });
            console.log(`✅ ${url}: ${response.status} ${response.statusText}`);
        } catch (error) {
            console.log(`❌ ${url}: ERROR - ${error.message}`);
        }
    }
}

// 4. SIMULAR CRIAÇÃO DE PRODUTO
async function simularCriacaoProduto() {
    console.log("\n4. SIMULAÇÃO DE CRIAÇÃO DE PRODUTO:");

    const dadosTeste = {
        nome: "PRODUTO TESTE DEBUG",
        descricao: "Teste de conectividade",
        fornecedor: "N1 Itália",
        estoque_compartilhado: 10,
        estoque_minimo: 5,
        skus_data: [{ sku: "TEST-001", descricao_variacao: "Teste" }],
        lojas_ids: [1] // Assumindo que loja ID 1 existe
    };

    // Obter CSRF token
    const csrfToken = document.cookie
        .split(';')
        .find(cookie => cookie.trim().startsWith('csrftoken='))
        ?.split('=')[1];

    console.log("- Dados do produto:", dadosTeste);
    console.log("- CSRF Token:", csrfToken ? `${csrfToken.substring(0, 10)}...` : 'NÃO ENCONTRADO');

    if (!csrfToken) {
        console.error("⚠️ CSRF TOKEN NÃO ENCONTRADO! Tentando obter...");
        try {
            const csrfResponse = await fetch(window.axios?.defaults?.baseURL + '/current-state/', {
                credentials: 'include'
            });
            console.log("- Resposta CSRF:", csrfResponse.status);

            // Verificar se token foi definido
            const newCsrfToken = document.cookie
                .split(';')
                .find(cookie => cookie.trim().startsWith('csrftoken='))
                ?.split('=')[1];
            console.log("- Novo CSRF Token:", newCsrfToken ? `${newCsrfToken.substring(0, 10)}...` : 'AINDA NÃO ENCONTRADO');
        } catch (error) {
            console.error("❌ Erro ao obter CSRF:", error);
        }
    }

    // Tentar fazer a requisição POST
    const finalCsrfToken = document.cookie
        .split(';')
        .find(cookie => cookie.trim().startsWith('csrftoken='))
        ?.split('=')[1];

    if (!finalCsrfToken) {
        console.error("❌ IMPOSSÍVEL PROSSEGUIR SEM CSRF TOKEN");
        return;
    }

    try {
        console.log("- Fazendo requisição POST...");
        const response = await fetch(window.axios?.defaults?.baseURL + '/estoque/produtos-compartilhados/', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': finalCsrfToken,
                'Accept': 'application/json'
            },
            body: JSON.stringify(dadosTeste)
        });

        console.log("- Status da resposta:", response.status, response.statusText);
        console.log("- Headers da resposta:", [...response.headers.entries()]);

        const responseText = await response.text();
        console.log("- Corpo da resposta:", responseText);

        if (response.ok) {
            console.log("✅ PRODUTO CRIADO COM SUCESSO!");
            try {
                const responseJson = JSON.parse(responseText);
                console.log("- Produto criado:", responseJson);
            } catch (e) {
                console.log("- Resposta não é JSON válido");
            }
        } else {
            console.error(`❌ ERRO NA CRIAÇÃO: ${response.status}`);
        }

    } catch (error) {
        console.error("❌ Erro na requisição:", error);
    }
}

// 5. MONITORAR NETWORK TAB
function configurarMonitoramento() {
    console.log("\n5. CONFIGURANDO MONITORAMENTO DE REDE:");
    console.log("📝 INSTRUÇÕES PARA O USUÁRIO:");
    console.log("1. Abra DevTools (F12)");
    console.log("2. Vá para a aba Network");
    console.log("3. Limpe a lista (Clear)");
    console.log("4. Deixe gravando (Record)");
    console.log("5. Execute a criação do produto no site");
    console.log("6. Observe TODAS as requisições que aparecem");
    console.log("7. Clique em cada requisição e veja:");
    console.log("   - URL completa");
    console.log("   - Status code");
    console.log("   - Request headers (especialmente X-CSRFToken)");
    console.log("   - Response headers");
    console.log("   - Response body");
}

// EXECUTAR TODAS AS VERIFICAÇÕES
async function executarInvestigacao() {
    await testarConectividade();
    await simularCriacaoProduto();
    configurarMonitoramento();

    console.log("\n=== INVESTIGAÇÃO CONCLUÍDA ===");
    console.log("📋 PRÓXIMOS PASSOS:");
    console.log("1. Execute a criação de produto no site");
    console.log("2. Compare os resultados com esta simulação");
    console.log("3. Reporte as diferenças encontradas");
}

// Auto-executar
executarInvestigacao();