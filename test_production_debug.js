// Test script para debugar problema em produção
const axios = require('axios');

async function testProductionEndpoint() {
    try {
        console.log('🔍 Testando endpoint em produção...');
        
        // Primeiro, obter CSRF token
        console.log('1. Obtendo CSRF token...');
        const csrfResponse = await axios.get('https://chegou-hubb-production.up.railway.app/api/ensure-csrf/', {
            withCredentials: true
        });
        
        const csrfToken = csrfResponse.data.csrfToken;
        console.log('✅ CSRF Token obtido:', csrfToken ? 'OK' : 'ERRO');
        
        // Testar endpoint sem autenticação (deve dar 403)
        console.log('\n2. Testando endpoint sem auth (esperado: 403)...');
        try {
            const response = await axios.post(
                'https://chegou-hubb-production.up.railway.app/api/processamento/buscar-ips-duplicados-simples/', 
                {
                    loja_id: 1,
                    days: 30
                },
                {
                    headers: {
                        'X-CSRFToken': csrfToken,
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                }
            );
            console.log('❌ Inesperado: Request passou sem auth');
        } catch (error) {
            if (error.response) {
                console.log(`✅ Status esperado: ${error.response.status} (${error.response.statusText})`);
                console.log('Resposta:', error.response.data);
                
                // Se for 400, há problema na validação
                if (error.response.status === 400) {
                    console.log('🚨 PROBLEMA: Erro 400 indica problema na validação dos dados');
                    console.log('Headers enviados:', error.config.headers);
                    console.log('Dados enviados:', error.config.data);
                }
            } else {
                console.log('❌ Erro de rede:', error.message);
            }
        }
        
        // Testar structure de dados diferentes
        console.log('\n3. Testando com dados string vs number...');
        try {
            const response2 = await axios.post(
                'https://chegou-hubb-production.up.railway.app/api/processamento/buscar-ips-duplicados-simples/', 
                {
                    loja_id: "1",  // String em vez de number
                    days: "30"     // String em vez de number
                },
                {
                    headers: {
                        'X-CSRFToken': csrfToken,
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                }
            );
        } catch (error) {
            if (error.response) {
                console.log(`Status com strings: ${error.response.status}`);
                if (error.response.status === 400) {
                    console.log('🔍 Erro 400 persiste com strings - problema no backend');
                }
            }
        }
        
    } catch (error) {
        console.log('❌ Erro geral:', error.message);
    }
}

testProductionEndpoint();