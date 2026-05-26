fetch('http://localhost:3000/api/denuncia', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    titulo: 'Teste API', 
    categoria: 'Conduta', 
    descricao: 'Testando', 
    anonima: true, 
    autor_id: '00000000-0000-0000-0000-000000000000' 
  })
}).then(res => res.json()).then(console.log).catch(console.error);
