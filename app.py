from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import json
import os
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = '277353' 
USER_FILE = 'users.json'

# --- FUNÇÕES AUXILIARES ---

def get_user_file():
    """Retorna o nome do arquivo JSON específico do usuário logado."""
    if 'user_email' in session:
        email_safe = session['user_email'].replace("@", "_").replace(".", "_")
        return f'data_{email_safe}.json'
    return None

def init_user_json(file_path):
    """Cria a estrutura inicial de meses para um novo usuário."""
    meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
             "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
    data = {m: {"entradas": [], "saidas": [], "boletos": [], "guardado": 0} for m in meses}
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)

if not os.path.exists(USER_FILE):
    with open(USER_FILE, 'w') as f:
        json.dump({}, f)

# --- ROTAS DE NAVEGAÇÃO ---

@app.route('/')
def index():
    if 'user_email' in session:
        return render_template('index.html')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user_email', None)
    return redirect(url_for('index'))

# --- ROTAS DE AUTENTICAÇÃO ---

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"status": "error", "message": "Preencha todos os campos"}), 400

    with open(USER_FILE, 'r+') as f:
        users = json.load(f)
        if email in users:
            return jsonify({"status": "error", "message": "Email já cadastrado"}), 400
        
        users[email] = generate_password_hash(password)
        f.seek(0)
        json.dump(users, f)
        f.truncate()
        

    session['user_email'] = email 
    user_file = get_user_file()
    if not os.path.exists(user_file):
        init_user_json(user_file)

    return jsonify({"status": "ok"})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    with open(USER_FILE, 'r') as f:
        users = json.load(f)
        if email in users and check_password_hash(users[email], password):
            session['user_email'] = email
            return jsonify({"status": "ok"})
    
    return jsonify({"status": "error", "message": "E-mail ou senha incorretos"}), 401

# --- ROTAS DA API FINANCEIRA ---

@app.route('/api/data')
def get_data():
    filename = get_user_file()
    if not filename or not os.path.exists(filename):
        return jsonify({"error": "Não autorizado"}), 401
    
    with open(filename, 'r') as f:
        return jsonify(json.load(f))

@app.route('/api/add', methods=['POST'])
def add_item():
    filename = get_user_file()
    if not filename: return jsonify({"status": "error"}), 401
    
    req = request.json
    with open(filename, 'r+') as f:
        data = json.load(f)
        novo_item = {
            "descricao": req['descricao'],
            "valor": req['valor'],
            "conta": req.get('conta', 'Dinheiro'), 
            "pago": req.get('pago', False)    
        }
        data[req['mes']][req['tipo']].append(novo_item)
        f.seek(0); json.dump(data, f, indent=4); f.truncate()
    return jsonify({"status": "ok"})

@app.route('/api/pagar_boleto', methods=['POST'])
def pagar_boleto():
    filename = get_user_file()
    if not filename: return jsonify({"status": "error"}), 401
    
    req = request.json
    mes, idx = req.get('mes'), req.get('index')
    
    with open(filename, 'r+') as f:
        data = json.load(f)
        if mes in data and idx < len(data[mes]['boletos']):
            status_atual = data[mes]['boletos'][idx].get('pago', False)
            data[mes]['boletos'][idx]['pago'] = not status_atual
            f.seek(0); json.dump(data, f, indent=4); f.truncate()
            return jsonify({"status": "ok"})
    return jsonify({"status": "error"}), 404

@app.route('/api/remove', methods=['POST'])
def remove_item():
    filename = get_user_file()
    if not filename: return jsonify({"status": "error"}), 401
    
    req = request.json
    with open(filename, 'r+') as f:
        data = json.load(f)
        data[req['mes']][req['tipo']].pop(req['index'])
        f.seek(0); json.dump(data, f, indent=4); f.truncate()
    return jsonify({"status": "ok"})

@app.route('/api/guardar', methods=['POST'])
def guardar():
    filename = get_user_file()
    if not filename: return jsonify({"status": "error"}), 401
    
    req = request.json
    with open(filename, 'r+') as f:
        data = json.load(f)
        data[req['mes']]['guardado'] = float(req['valor'])
        f.seek(0); json.dump(data, f, indent=4); f.truncate()
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(debug=True)