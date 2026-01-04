from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__)
DATA_FILE = 'finance_data.json'

def init_data():
    if not os.path.exists(DATA_FILE):
        meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                 "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
        
        data = {m: {"entradas": [], "saidas": [], "boletos": [], "guardado": 0} for m in meses}
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f)

init_data()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    with open(DATA_FILE, 'r') as f:
        return jsonify(json.load(f))

@app.route('/api/add', methods=['POST'])
def add_item():
    req = request.json
    with open(DATA_FILE, 'r+') as f:
        data = json.load(f)
        
        novo_item = {
            "descricao": req['descricao'],
            "valor": req['valor'],
            "conta": req.get('conta', 'Dinheiro'), 
            "pago": req.get('pago', False)    
        }
        
        data[req['mes']][req['tipo']].append(novo_item)
        
        f.seek(0)
        json.dump(data, f, indent=4)
        f.truncate()
    return jsonify({"status": "ok"})

@app.route('/api/pagar_boleto', methods=['POST'])
def pagar_boleto():
    req = request.json
    mes = req.get('mes')
    idx = req.get('index')
    
    with open(DATA_FILE, 'r+') as f:
        data = json.load(f)
        if mes in data and idx < len(data[mes]['boletos']):

            status_atual = data[mes]['boletos'][idx].get('pago', False)
            data[mes]['boletos'][idx]['pago'] = not status_atual
            
            f.seek(0)
            json.dump(data, f, indent=4)
            f.truncate()
            return jsonify({"status": "ok"})
    return jsonify({"status": "error"}), 404
@app.route('/api/remove', methods=['POST'])
def remove_item():
    req = request.json
    with open(DATA_FILE, 'r+') as f:
        data = json.load(f)
        data[req['mes']][req['tipo']].pop(req['index'])
        f.seek(0); json.dump(data, f, indent=4); f.truncate()
    return jsonify({"status": "ok"})

@app.route('/api/guardar', methods=['POST'])
def guardar():
    req = request.json
    with open(DATA_FILE, 'r+') as f:
        data = json.load(f)
        data[req['mes']]['guardado'] = float(req['valor'])
        f.seek(0); json.dump(data, f, indent=4); f.truncate()
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(debug=True)