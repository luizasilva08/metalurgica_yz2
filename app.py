# app.py
# ------------------------------------------------------------------------------------------------
# IMPORTANTE: A plataforma AI Studio funciona nativamente com o servidor Node.js (que configuramos 
# agora mesmo no arquivo `server.ts`). Este arquivo app.py está aqui como referência caso você 
# queira hospedar este backend Flask de forma separada no futuro!
# ------------------------------------------------------------------------------------------------

from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
import os

app = Flask(__name__)
CORS(app)

url: str = os.environ.get("VITE_SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("VITE_SUPABASE_ANON_KEY", ""))

supabase: Client = create_client(url, key)

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({"status": "ok", "msg": "API Flask rotas carregadas!"})

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')

    try:
        if os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
            # Usa o método de admin que passa por cima de qualquer rate limit
            res = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "user_metadata": { "full_name": name },
                "email_confirm": True
            })
            return jsonify({"success": True}), 201
        else:
            # Login manual via API (pode ainda ser barrado se for do mesmo IP sem Admin Key)
            res = supabase.auth.sign_up({
                "email": email, 
                "password": password,
                "options": {
                    "data": { "full_name": name }
                }
            })
            return jsonify({"success": True}), 201
            
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/denuncia', methods=['POST'])
def denuncia():
    data = request.get_json()
    titulo = data.get('titulo')
    categoria = data.get('categoria')
    descricao = data.get('descricao')
    anonima = data.get('anonima')
    autor_id = data.get('autor_id')
    
    try:
        supabase.table("denuncias").insert({
            "titulo": titulo,
            "categoria": categoria,
            "descricao": descricao,
            "anonima": anonima,
            "autor_id": autor_id if autor_id else None
        }).execute()
        
        return jsonify({"success": True}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
