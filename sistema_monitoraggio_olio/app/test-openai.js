const OpenAI = require('openai').default;

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

async function testOpenAI() {
  try {
    console.log('🔍 Verifico connessione OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: "Rispondi solo con 'OK'" }],
      max_tokens: 10
    });
    
    console.log('✅ OpenAI funziona correttamente!');
    console.log('📝 Risposta:', response.choices[0].message.content);
    console.log('🎯 Model:', response.model);
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore OpenAI:', error.message);
    if (error.status) console.error('📊 Status code:', error.status);
    if (error.code) console.error('🔧 Error code:', error.code);
    process.exit(1);
  }
}

testOpenAI();
