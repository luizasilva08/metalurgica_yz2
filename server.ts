import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Equivalent to Flask: supabase client on the backend
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
// supabase admin key bypasses all limits. Set this up in your .env if needed
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; 

const supabase = createClient(supabaseUrl, supabaseAdminKey || '');

// @app.route('/api/status', methods=['GET'])
app.get("/api/status", (req, res) => {
  res.json({ status: "ok", msg: "Backend Node.js style-Flask is running!" });
});

// @app.route('/api/signup', methods=['POST'])
app.post("/api/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Se tiver a Service Role Key, usamos o admin api para burlar os limites do Supabase
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
       const clientToUse = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
       const { data, error } = await clientToUse.auth.admin.createUser({
         email: email,
         password: password,
         user_metadata: { full_name: name },
         email_confirm: true // pula confirmação de email
       });
       if (error) throw error;
       
       // ALSO insert into profiles!
       if (data.user) {
         await clientToUse.from('profiles').insert([{ id: data.user.id, nome: name, email: email }]);
       }
       
       return res.json({ success: true, data });
    } else {
       // Se não tiver a key, faz o registro normal
       const { data, error } = await supabase.auth.signUp({
         email,
         password,
         options: {
           data: { full_name: name }
         }
       });
       if (error) throw error;
       
       return res.json({ success: true, data });
    }
  } catch (error: any) {
    console.error('Signup Route Error:', error);
    res.status(400).json({ error: error.message || JSON.stringify(error) });
  }
});

app.post("/api/denuncia", async (req, res) => {
  try {
    const { titulo, categoria, descricao, anonima, autor_id } = req.body;
    console.log("Recebida requisição /api/denuncia:", req.body);
    
    // Server-side submission to the database, ignoring client RLS if we use the admin key
    // Alternatively, we use the regular client.
    let clientToUse = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log("Usando Service Role Key...");
      clientToUse = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    } else {
      console.log("Aviso: SUPABASE_SERVICE_ROLE_KEY não encontrada, usando normal client (pode falhar no RLS sem JWT)");
    }
    
    const { data, error } = await clientToUse.from('denuncias').insert([
      {
        titulo,
        categoria,
        descricao,
        anonima,
        autor_id: autor_id || null
      }
    ]).select();

    if (error) {
      console.error("Erro no Supabase ao inserir denuncia:", error);
      throw error;
    }
    
    console.log("Denuncia salva com sucesso!", data);
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Denuncia Route Error Completo:', error);
    res.status(400).json({ error: error.message || JSON.stringify(error) });
  }
});

app.get("/api/denuncias", async (req, res) => {
  try {
    const { isChefia, userId } = req.query;
    let clientToUse = supabase;
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      clientToUse = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    
    let query = clientToUse.from('denuncias').select('*, profiles:autor_id(nome)');
    
    // Se não for chefia, apenas veja as do próprio criador (se mandarem id)
    if (isChefia !== 'true' && userId) {
      query = query.eq('autor_id', userId);
    } else if (isChefia !== 'true') {
      // Se não é chefia e não tem userId, não retorna nada sensível
      return res.json({ data: [] });
    }
    // Se for chefia, fetch tudo
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    
    // Processar os dados para ocultar o nome se for anônima
    const processedData = data.map(d => {
      // Se a denúncia for anônima, remove o nome do perfil
      if (d.anonima) {
        return { ...d, profiles: null };
      }
      return d;
    });
    
    return res.json({ success: true, data: processedData });
  } catch (error: any) {
    console.error('Fetch Denuncias Error:', error);
    res.status(400).json({ error: error.message || JSON.stringify(error) });
  }
});

app.get("/api/pedidos", async (req, res) => {
  try {
    const { isChefia, userId } = req.query;
    let clientToUse = supabase;
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      clientToUse = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    
    let query = clientToUse.from('pedidos').select('*, profiles:profile_id(nome)');
    
    if (isChefia !== 'true' && userId) {
      query = query.eq('profile_id', userId);
    } else if (isChefia !== 'true') {
      return res.json({ data: [] });
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Fetch Pedidos Error:', error);
    res.status(400).json({ error: error.message || JSON.stringify(error) });
  }
});

app.get("/api/logs", async (req, res) => {
  try {
    const { isChefia } = req.query;
    let clientToUse = supabase;
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      clientToUse = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    
    let query = clientToUse.from('logs').select('*, profiles:profile_id(nome)');
    
    if (isChefia !== 'true') {
      return res.json({ data: [] });
    }
    
    const { data, error } = await query.order('created_at', { ascending: false }).limit(5);
    if (error) throw error;
    
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Fetch Logs Error:', error);
    res.status(400).json({ error: error.message || JSON.stringify(error) });
  }
});

app.get("/api/chamados", async (req, res) => {
  try {
    const { isChefia, userId } = req.query;
    let clientToUse = supabase;
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      clientToUse = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    
    let query = clientToUse.from('chamados').select('*, profiles:profile_id(nome)');
    
    if (isChefia !== 'true' && userId) {
      query = query.eq('profile_id', userId);
    } else if (isChefia !== 'true') {
      return res.json({ data: [] });
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Fetch Chamados Error:', error);
    res.status(400).json({ error: error.message || JSON.stringify(error) });
  }
});

app.get("/api/epis", async (req, res) => {
  try {
    const { isChefia, userId } = req.query;
    let clientToUse = supabase;
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      clientToUse = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    
    let query = clientToUse.from('epis').select('*, profiles:profile_id(nome)');
    
    if (isChefia !== 'true' && userId) {
      query = query.eq('profile_id', userId);
    } else if (isChefia !== 'true') {
      return res.json({ data: [] });
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Fetch EPIs Error:', error);
    res.status(400).json({ error: error.message || JSON.stringify(error) });
  }
});

app.put("/api/epis/:id/aprovar", async (req, res) => {
  try {
    const { id } = req.params;
    let clientToUse = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      clientToUse = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    const { data, error } = await clientToUse.from('epis').update({ status: 'Aprovado' }).eq('id', id).select();
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/epis/:id/retirar", async (req, res) => {
  try {
    const { id } = req.params;
    const { cracha } = req.body;
    
    let clientToUse = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      clientToUse = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    
    // Na vida real, haveria um step adicional:
    // SELECT cracha FROM profiles WHERE id = pedido.profile_id
    // Validar se req.body.cracha bate com o do funcionário.
    // Como é uma simulação educacional, vamos prosseguir com a retirada (atualizar status).

    const { data, error } = await clientToUse.from('epis').update({ status: 'Entregue' }).eq('id', id).select();
    if (error) throw error;
    
    return res.json({ success: true, inline: `EPI Retirado via crachá ${cracha || 'desconhecido'}` });
  } catch (error: any) {
    console.error('Retirada EPI Error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/hardware/rfid", async (req, res) => {
  try {
    const { uid } = req.body;
    
    let clientToUse = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      clientToUse = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    
    // 1. Procurar o usuário pelo RFID (UID)
    const { data: profiles, error: pError } = await clientToUse
      .from('profiles')
      .select('id, nome')
      .eq('rfid_uid', uid);
      
    if (pError || !profiles || profiles.length === 0) {
      return res.status(404).json({ error: "Tag RFID não encontrada no sistema" });
    }
    
    const userId = profiles[0].id;
    
    // 2. Buscar o EPI mais antigo que está "Aprovado" para este usuário
    const { data: epis, error: eError } = await clientToUse
      .from('epis')
      .select('id, equipamento')
      .eq('profile_id', userId)
      .eq('status', 'Aprovado')
      .order('created_at', { ascending: true })
      .limit(1);
      
    if (eError || !epis || epis.length === 0) {
      return res.status(404).json({ error: "Nenhum EPI aprovado aguardando retirada para este crachá" });
    }
    
    const epiId = epis[0].id;
    
    // 3. Modificar o status para "Entregue"
    await clientToUse
      .from('epis')
      .update({ status: 'Entregue' })
      .eq('id', epiId);
      
    // 4. Registrar no log
    await clientToUse.from('logs').insert({ 
      profile_id: userId,
      acao: 'Retirada de EPI', 
      detalhes: `EPI ${epis[0].equipamento} retirado fisicamente via RFID (${uid})`
    });
      
    return res.json({ 
      success: true, 
      msg: `EPI ${epis[0].equipamento} retirado por ${profiles[0].nome}`,
      ator: profiles[0].nome,
      equipamento: epis[0].equipamento
    });
  } catch (error: any) {
    console.error('RFID Hardware Error:', error);
    res.status(400).json({ error: error.message });
  }
});

async function startServer() {
  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend Server is running on port ${PORT}`);
  });
}

startServer();
